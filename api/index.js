// api/index.js
// ──────────────────────────────────────────────────────────────
//  Vercel serverless entry point
//  Imports and exports the Express app for serverless runtime
// ──────────────────────────────────────────────────────────────

import connectDB from '../config/db.js';
import app from '../server.js';

// Middleware to ensure DB connection before each request
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(503).json({ 
      ok: false, 
      message: 'Database connection failed',
      error: error.message 
    });
  }
});

export default app;
