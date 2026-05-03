// api/index.js
// ──────────────────────────────────────────────────────────────
//  Vercel serverless entry point
//  Imports and exports the Express app for serverless runtime
// ──────────────────────────────────────────────────────────────

import connectDB from '../config/db.js';
import app from '../server.js';

// Connect to database before handling requests
await connectDB();

export default app;
