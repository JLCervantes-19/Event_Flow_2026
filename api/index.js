import connectDB from '../config/db.js';
import app from '../server.js';

// Global connection promise to reuse across invocations
let connectionPromise = null;

// Middleware to ensure database connection
app.use(async (req, res, next) => {
  try {
    // Reuse existing connection promise or create new one
    if (!connectionPromise) {
      connectionPromise = connectDB();
    }
    await connectionPromise;
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
