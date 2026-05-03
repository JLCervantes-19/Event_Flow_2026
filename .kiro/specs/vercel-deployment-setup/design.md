# Design Document: Vercel Deployment Setup

## Overview

This design document specifies the technical implementation for preparing EventFlow (a Node.js + Express + MongoDB event management platform) for both optimized local development and serverless deployment on Vercel. The solution addresses the dual-environment challenge: maintaining a traditional Express server for local development while adapting the same codebase to run as Vercel serverless functions in production.

### Goals

1. **Dual Environment Support**: Enable seamless operation in both local (traditional server) and Vercel (serverless) environments without code duplication
2. **Developer Experience**: Provide clear documentation and tooling for local setup, testing, and deployment
3. **Serverless Optimization**: Adapt MongoDB connections and Express routing for serverless constraints (cold starts, timeouts, stateless execution)
4. **Production Readiness**: Implement proper CORS, environment variable management, error handling, and monitoring

### Non-Goals

- Authentication/authorization implementation (out of scope)
- Database migration from existing MongoDB to Atlas (assumed already using Atlas or local)
- CI/CD pipeline automation (manual deployment via Vercel CLI is sufficient)
- Performance optimization beyond serverless-specific concerns

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Local Development"
        DEV[Developer Machine]
        LOCAL_SERVER[Express Server<br/>Port 3000]
        LOCAL_DB[(MongoDB<br/>Local/Atlas)]
        DEV --> LOCAL_SERVER
        LOCAL_SERVER --> LOCAL_DB
    end
    
    subgraph "Vercel Production"
        CLIENT[Client Browser]
        VERCEL_CDN[Vercel CDN<br/>Static Assets]
        VERCEL_EDGE[Vercel Edge Network]
        
        subgraph "Serverless Functions"
            API_FUNC[/api/* Functions<br/>Express Handler]
        end
        
        ATLAS[(MongoDB Atlas<br/>Cloud)]
        
        CLIENT --> VERCEL_EDGE
        VERCEL_EDGE --> VERCEL_CDN
        VERCEL_EDGE --> API_FUNC
        API_FUNC --> ATLAS
    end
    
    style LOCAL_SERVER fill:#a8dadc
    style API_FUNC fill:#457b9d
    style VERCEL_CDN fill:#f1faee
    style ATLAS fill:#e63946
```

### Environment Comparison

| Aspect | Local Development | Vercel Production |
|--------|------------------|-------------------|
| **Server Model** | Long-running Express process | Serverless functions (on-demand) |
| **Database** | Local MongoDB or Atlas | MongoDB Atlas (required) |
| **Static Assets** | Served by Express | Served by Vercel CDN |
| **Environment Variables** | .env file | Vercel dashboard/CLI |
| **Hot Reload** | nodemon | N/A (deploy to test) |
| **Connection Pooling** | Persistent connections | Reuse across invocations |
| **Timeout** | Unlimited | 10s (Hobby), 60s (Pro) |

### Deployment Architecture

The solution uses a **hybrid approach**:

1. **Single Codebase**: Same Express app runs in both environments
2. **Conditional Export**: Export Express app for Vercel, or start server for local
3. **Environment Detection**: Use `NODE_ENV` and Vercel-specific env vars to detect runtime
4. **Configuration Files**: `vercel.json` defines serverless routing and build settings

## Components and Interfaces

### 1. Server Entry Point (`server.js`)

**Current State**: Immediately starts Express server on import

**Required Changes**: 
- Export Express app instance for Vercel
- Conditionally start server only in local environment
- Detect Vercel environment using `process.env.VERCEL`

**Interface**:
```javascript
// Export for Vercel serverless
export default app;

// Start server only in local environment
if (!process.env.VERCEL) {
  const start = async () => {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 EventFlow API running on http://localhost:${PORT}`);
    });
  };
  start();
}
```

### 2. Vercel Serverless Entry Point (`api/index.js`)

**Purpose**: Vercel-specific entry point that imports and wraps the Express app

**Location**: `api/index.js` (new file)

**Interface**:
```javascript
import app from '../server.js';

export default app;
```

**Rationale**: Vercel expects serverless functions in the `api/` directory. This file acts as a thin wrapper that imports the main Express app.

### 3. Database Connection Module (`config/db.js`)

**Current State**: Establishes connection on function call, suitable for long-running processes

**Required Changes**:
- Implement connection caching for serverless (reuse across invocations)
- Add connection state checking before reconnecting
- Optimize timeouts for serverless cold starts

**Interface**:
```javascript
let cachedConnection = null;

const connectDB = async () => {
  // Reuse existing connection if available
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log('♻️  Reusing existing MongoDB connection');
    return cachedConnection;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10, // Connection pooling for serverless
    });

    cachedConnection = conn;
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    throw error;
  }
};

export default connectDB;
```

### 4. Vercel Configuration (`vercel.json`)

**Purpose**: Define routing, build settings, and serverless function configuration

**Location**: `vercel.json` (new file at project root)

**Structure**:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/public/$1"
    },
    {
      "src": "/.*",
      "dest": "/public/index.html"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

**Route Explanation**:
1. `/api/(.*)` → Routes all API requests to serverless function
2. `/(.*)`  → Serves static files from public directory
3. `/.*` → SPA fallback for client-side routing

### 5. CORS Configuration

**Current State**: Hardcoded origins in `server.js`

**Required Changes**:
- Dynamic origin configuration based on environment
- Support for Vercel preview and production URLs
- Environment variable for custom domains

**Interface**:
```javascript
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
      process.env.CORS_ORIGIN, // Custom domain from env var
    ].filter(Boolean)
  : ['http://localhost:3000', 'http://127.0.0.1:5500'];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
```

### 6. Environment Variables

**Local Development** (`.env`):
```bash
PORT=3000
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/eventflow?retryWrites=true&w=majority
NODE_ENV=development
```

**Vercel Production** (via dashboard/CLI):
```bash
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/eventflow?retryWrites=true&w=majority
NODE_ENV=production
CORS_ORIGIN=https://eventflow.com  # Optional custom domain
```

**Vercel Auto-Injected Variables**:
- `VERCEL`: Set to "1" in Vercel environment
- `VERCEL_URL`: Deployment URL (e.g., `project-abc123.vercel.app`)
- `VERCEL_ENV`: "production", "preview", or "development"

### 7. Static Assets Serving

**Local**: Express serves from `public/` directory using `express.static()`

**Vercel**: 
- Static files served directly by Vercel CDN (no serverless function invocation)
- Configured via `vercel.json` routes
- SPA fallback ensures client-side routing works

**No Code Changes Required**: Existing `express.static()` middleware works in both environments

### 8. Error Handling Middleware

**Current State**: Basic global error handler exists

**Enhancement**: Add environment-aware error responses

**Interface**:
```javascript
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err.stack);
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    ok: false,
    message: err.message || 'Internal server error',
    ...(isDevelopment && { stack: err.stack }), // Only in development
  });
});
```

### 9. Health Check Endpoint

**Current State**: Basic health check at `/api/health`

**Enhancement**: Include database connection status

**Interface**:
```javascript
app.get('/api/health', async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.json({
    ok: true,
    status: 'running',
    environment: process.env.NODE_ENV,
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});
```

### 10. Git Configuration (`.gitignore`)

**Required Additions**:
```
# Environment variables
.env
.env.local
.env.production

# Vercel
.vercel

# Dependencies
node_modules/

# Logs
*.log
npm-debug.log*

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
```

## Data Models

No changes to existing Mongoose models (`User`, `Event`, `Reservation`) are required. The models are already compatible with serverless execution.

**Existing Models**:
- `User`: User accounts (organizers and clients)
- `Event`: Event listings with category, date, price
- `Reservation`: Booking records linking users to events

**Serverless Considerations**:
- Models are stateless (no in-memory caching)
- Mongoose handles connection pooling automatically
- Indexes should be created in MongoDB Atlas for performance

## Testing Strategy

### Unit Tests

**Scope**: Individual functions and middleware

**Examples**:
1. **CORS Configuration**: Verify allowed origins based on `NODE_ENV`
   - Test: Development environment allows localhost origins
   - Test: Production environment allows only configured domains
   - Test: Unauthorized origins receive 403 response

2. **Database Connection Caching**: Verify connection reuse in serverless context
   - Test: First call establishes new connection
   - Test: Subsequent calls reuse cached connection
   - Test: Disconnected state triggers reconnection

3. **Error Handler**: Verify environment-aware error responses
   - Test: Development mode includes stack traces
   - Test: Production mode excludes stack traces
   - Test: HTTP status codes are preserved

4. **Health Check**: Verify endpoint returns correct status
   - Test: Returns 200 with database connected
   - Test: Includes environment information
   - Test: Includes timestamp in ISO format

### Integration Tests

**Scope**: API endpoints with database interactions

**Examples**:
1. **Events API**: Test CRUD operations
   - Test: GET /api/events returns paginated results
   - Test: POST /api/events creates event with valid data
   - Test: PUT /api/events/:id updates existing event
   - Test: DELETE /api/events/:id performs soft delete

2. **Reservations API**: Test booking flow
   - Test: POST /api/reservations creates reservation with price capture
   - Test: GET /api/reservations includes populated user and event data
   - Test: Canceling reservation updates status

3. **Dashboard API**: Test aggregation pipelines
   - Test: /api/dashboard/kpis returns correct metrics
   - Test: /api/dashboard/top-eventos returns top 5 events
   - Test: /api/dashboard/ingresos-por-categoria groups by category

### Deployment Tests

**Scope**: Verify functionality in Vercel environment

**Manual Test Checklist**:
1. Deploy to Vercel preview environment
2. Verify health check endpoint responds
3. Test API endpoints (GET, POST, PUT, DELETE)
4. Verify static assets load from CDN
5. Test SPA routing (refresh on /dashboard)
6. Check Vercel function logs for errors
7. Verify database connection in production
8. Test CORS from production domain

**Automated Smoke Tests** (optional future enhancement):
- Use Vercel CLI to deploy and run automated tests against preview URL
- Verify critical endpoints return expected status codes

### Load Testing Considerations

**Serverless Constraints**:
- Cold start latency: First request after idle period takes 1-3 seconds
- Concurrent execution: Vercel scales automatically but each invocation needs DB connection
- Connection pool exhaustion: Monitor MongoDB Atlas connection count

**Recommendations**:
- Use MongoDB Atlas M10+ tier for production (higher connection limits)
- Implement request queuing if connection pool is exhausted
- Monitor Vercel function execution time and optimize slow queries

## Error Handling

### Error Categories

1. **Database Connection Errors**
   - **Cause**: Invalid MONGO_URI, network issues, Atlas IP whitelist
   - **Handling**: Log error, return 503 Service Unavailable
   - **User Message**: "Database temporarily unavailable. Please try again."

2. **Validation Errors**
   - **Cause**: Invalid request body, missing required fields
   - **Handling**: Return 400 Bad Request with field-specific errors
   - **User Message**: "Invalid input: [field] is required"

3. **Not Found Errors**
   - **Cause**: Resource doesn't exist (event, reservation, user)
   - **Handling**: Return 404 Not Found
   - **User Message**: "Resource not found"

4. **Serverless Timeout Errors**
   - **Cause**: Database query exceeds Vercel timeout (10s/60s)
   - **Handling**: Implement query timeout, return 504 Gateway Timeout
   - **User Message**: "Request timed out. Please try again."

5. **CORS Errors**
   - **Cause**: Request from unauthorized origin
   - **Handling**: Browser blocks request, server logs warning
   - **User Message**: Browser shows CORS error in console

### Error Response Format

**Standard Error Response**:
```json
{
  "ok": false,
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {} // Optional, only in development
}
```

**Example**:
```json
{
  "ok": false,
  "message": "Event not found",
  "code": "RESOURCE_NOT_FOUND"
}
```

### Logging Strategy

**Local Development**:
- Console logs with emoji prefixes for visibility
- Full stack traces for debugging
- Request/response logging via middleware

**Vercel Production**:
- Structured JSON logs for parsing
- Error logs visible in Vercel dashboard
- No sensitive data (passwords, tokens) in logs

**Log Levels**:
- `INFO`: Startup, database connection, successful requests
- `WARN`: Deprecated features, slow queries, retry attempts
- `ERROR`: Exceptions, failed requests, database errors

## Documentation Updates

### README.md Structure

The README will be reorganized into the following sections:

1. **Project Overview**
   - Description of EventFlow
   - Key features
   - Technology stack

2. **Prerequisites**
   - Node.js ≥18
   - MongoDB Atlas account (or local MongoDB)
   - Vercel account (for deployment)

3. **Local Development Setup**
   - Clone repository
   - Install dependencies (`npm install`)
   - Configure environment variables (`.env`)
   - Seed database (`npm run seed`)
   - Start development server (`npm run dev`)

4. **Environment Variables**
   - Table of all variables with descriptions
   - Example values for local and production
   - How to obtain MongoDB Atlas connection string

5. **API Documentation**
   - Endpoint reference (existing content)
   - Request/response examples
   - Error codes

6. **Vercel Deployment**
   - Install Vercel CLI
   - Authenticate (`vercel login`)
   - Configure environment variables in Vercel
   - Deploy to preview (`vercel`)
   - Deploy to production (`vercel --prod`)
   - Verify deployment

7. **Production Readiness Checklist**
   - [ ] MongoDB Atlas connection string configured
   - [ ] NODE_ENV set to "production"
   - [ ] CORS origins configured for production domain
   - [ ] All environment variables set in Vercel
   - [ ] Health check endpoint tested
   - [ ] API endpoints tested in production
   - [ ] Static assets loading correctly
   - [ ] Database connection verified
   - [ ] Vercel function logs checked for errors

8. **Troubleshooting**
   - Common issues and solutions
   - Database connection problems
   - CORS errors
   - Vercel deployment failures
   - Serverless timeout issues

9. **Architecture**
   - Folder structure explanation (existing content)
   - Aggregation pipelines documentation (existing content)

### New Documentation Files

**`docs/DEPLOYMENT.md`** (optional, detailed deployment guide):
- Step-by-step Vercel deployment with screenshots
- Environment variable configuration
- Custom domain setup
- Monitoring and logs

**`docs/DEVELOPMENT.md`** (optional, developer guide):
- Local development workflow
- Database seeding
- Testing strategies
- Code organization

## Implementation Plan

### Phase 1: Serverless Compatibility (Core Changes)

1. **Modify `server.js`**:
   - Export Express app for Vercel
   - Add conditional server startup (only if not in Vercel)
   - Detect Vercel environment using `process.env.VERCEL`

2. **Create `api/index.js`**:
   - Import and export Express app
   - Vercel serverless entry point

3. **Update `config/db.js`**:
   - Implement connection caching
   - Add connection state checking
   - Optimize timeouts for serverless

4. **Create `vercel.json`**:
   - Define builds and routes
   - Configure serverless function settings
   - Set environment variables

### Phase 2: Configuration and Environment

5. **Update `.env.example`**:
   - Add all required variables with descriptions
   - Include MongoDB Atlas connection string format
   - Document CORS_ORIGIN for custom domains

6. **Create/Update `.gitignore`**:
   - Add .env files
   - Add .vercel directory
   - Add OS and IDE files

7. **Update CORS Configuration**:
   - Dynamic origin based on environment
   - Support for Vercel URLs
   - Environment variable for custom domains

### Phase 3: Error Handling and Monitoring

8. **Enhance Error Handler**:
   - Environment-aware error responses
   - Structured error format
   - Logging improvements

9. **Enhance Health Check**:
   - Add database status
   - Add environment information
   - Add timestamp

### Phase 4: Documentation

10. **Update README.md**:
    - Add prerequisites section
    - Add local setup instructions
    - Add Vercel deployment instructions
    - Add production checklist
    - Add troubleshooting section

11. **Update Package.json**:
    - Verify scripts (start, dev, seed)
    - Verify engines field (Node ≥18)
    - Add description and repository fields

### Phase 5: Testing and Validation

12. **Local Testing**:
    - Test all API endpoints locally
    - Verify database connection
    - Test static assets serving
    - Test SPA routing

13. **Vercel Preview Deployment**:
    - Deploy to preview environment
    - Configure environment variables
    - Test all endpoints in preview
    - Verify logs in Vercel dashboard

14. **Production Deployment**:
    - Deploy to production
    - Run production checklist
    - Monitor for errors
    - Performance testing

## Deployment Workflow

### Local Development Workflow

```mermaid
graph LR
    A[Clone Repo] --> B[npm install]
    B --> C[Copy .env.example to .env]
    C --> D[Configure MONGO_URI]
    D --> E[npm run seed]
    E --> F[npm run dev]
    F --> G[Develop & Test]
    G --> H{Ready to Deploy?}
    H -->|No| G
    H -->|Yes| I[Commit & Push]
```

### Vercel Deployment Workflow

```mermaid
graph LR
    A[Install Vercel CLI] --> B[vercel login]
    B --> C[Configure Env Vars]
    C --> D[vercel]
    D --> E[Test Preview]
    E --> F{Tests Pass?}
    F -->|No| G[Fix Issues]
    G --> D
    F -->|Yes| H[vercel --prod]
    H --> I[Verify Production]
    I --> J[Monitor Logs]
```

### Environment Variable Configuration

**Via Vercel Dashboard**:
1. Navigate to project settings
2. Go to "Environment Variables" tab
3. Add each variable (MONGO_URI, NODE_ENV, CORS_ORIGIN)
4. Select environments (Production, Preview, Development)
5. Save changes

**Via Vercel CLI**:
```bash
vercel env add MONGO_URI production
vercel env add NODE_ENV production
vercel env add CORS_ORIGIN production
```

## Security Considerations

### Environment Variables

- **Never commit `.env` files**: Ensure `.gitignore` excludes all `.env*` files except `.env.example`
- **Rotate credentials**: Change MongoDB passwords periodically
- **Least privilege**: Use MongoDB user with minimal required permissions

### CORS Configuration

- **No wildcards in production**: Never use `origin: '*'` in production
- **Explicit origins**: List all allowed domains explicitly
- **Credentials**: Only enable `credentials: true` if needed for cookies/auth

### MongoDB Atlas Security

- **IP Whitelist**: Add Vercel IP ranges or use "Allow from anywhere" (0.0.0.0/0) with strong password
- **Connection String**: Use SRV connection string with TLS enabled
- **Database User**: Create dedicated user for application with read/write permissions only

### Error Messages

- **No sensitive data**: Never expose database connection strings, internal paths, or stack traces in production
- **Generic messages**: Use generic error messages for users, detailed logs for developers

## Performance Optimization

### Database Connection Pooling

**Configuration**:
```javascript
mongoose.connect(MONGO_URI, {
  maxPoolSize: 10,        // Max connections in pool
  minPoolSize: 2,         // Min connections to maintain
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

**Rationale**:
- Serverless functions reuse connections across invocations
- Pool size balances connection overhead vs. availability
- Timeouts prevent hanging requests

### Query Optimization

**Indexes**: Ensure MongoDB Atlas has indexes on frequently queried fields
- `Event`: `categoria`, `fecha`, `activo`
- `Reservation`: `usuarioId`, `eventoId`, `estado`
- `User`: `correo`, `rol`

**Pagination**: All list endpoints use pagination to limit response size

**Projection**: Use `.select()` to return only needed fields

### Static Asset Optimization

**Vercel CDN**: Static files automatically cached and served from edge locations

**Recommendations**:
- Minify CSS/JS in production (future enhancement)
- Use image optimization (Vercel Image Optimization)
- Set cache headers for static assets

### Cold Start Mitigation

**Strategies**:
- Keep functions warm with periodic health checks (optional)
- Optimize import statements (avoid large dependencies)
- Use connection caching to reduce database connection time

**Expected Cold Start Time**: 1-3 seconds for first request after idle period

## Monitoring and Observability

### Vercel Dashboard

**Available Metrics**:
- Function invocations count
- Function execution time
- Error rate
- Bandwidth usage

**Logs**:
- Real-time function logs
- Error stack traces
- Console output from application

### MongoDB Atlas Monitoring

**Available Metrics**:
- Connection count
- Query performance
- Database size
- Index usage

**Alerts**:
- Configure alerts for high connection count
- Configure alerts for slow queries

### Health Check Monitoring

**Endpoint**: `GET /api/health`

**Response**:
```json
{
  "ok": true,
  "status": "running",
  "environment": "production",
  "database": "connected",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Monitoring Strategy**:
- Use external uptime monitoring service (UptimeRobot, Pingdom)
- Check health endpoint every 5 minutes
- Alert on consecutive failures

## Rollback Strategy

### Vercel Rollback

**Via Dashboard**:
1. Navigate to "Deployments" tab
2. Find previous working deployment
3. Click "Promote to Production"

**Via CLI**:
```bash
vercel rollback
```

**Automatic Rollback**: Vercel keeps all previous deployments, allowing instant rollback

### Database Rollback

**Strategy**: MongoDB Atlas supports point-in-time recovery (paid tiers)

**Manual Backup**:
```bash
mongodump --uri="MONGO_URI" --out=backup-$(date +%Y%m%d)
```

**Restore**:
```bash
mongorestore --uri="MONGO_URI" backup-20250115/
```

## Future Enhancements

### Phase 2 Features (Out of Scope for Initial Deployment)

1. **Authentication**: JWT-based authentication for API endpoints
2. **Rate Limiting**: Prevent abuse of serverless functions
3. **Caching**: Redis caching for frequently accessed data
4. **CI/CD**: GitHub Actions for automated testing and deployment
5. **Monitoring**: Integration with Sentry or Datadog for error tracking
6. **Analytics**: Track API usage and user behavior
7. **Email Notifications**: Send confirmation emails for reservations
8. **Payment Integration**: Stripe/PayPal for event payments

### Scalability Considerations

**Current Limits** (Vercel Hobby Plan):
- 100 GB bandwidth/month
- 100 hours serverless function execution/month
- 10-second function timeout

**Scaling Path**:
- Upgrade to Vercel Pro for higher limits (60s timeout, 1000 GB bandwidth)
- Upgrade MongoDB Atlas tier for higher connection limits
- Implement caching to reduce database queries
- Optimize aggregation pipelines for performance

## Conclusion

This design provides a comprehensive solution for deploying EventFlow to Vercel while maintaining excellent local development experience. The key architectural decisions are:

1. **Single Codebase**: Same Express app runs in both environments with conditional logic
2. **Connection Caching**: Optimize MongoDB connections for serverless execution
3. **Environment-Aware Configuration**: Dynamic CORS, error handling, and logging based on environment
4. **Comprehensive Documentation**: Clear instructions for setup, deployment, and troubleshooting

The implementation follows a phased approach, starting with core serverless compatibility, then configuration, error handling, documentation, and finally testing. This ensures a smooth transition from local development to production deployment on Vercel.
