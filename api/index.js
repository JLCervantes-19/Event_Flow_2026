import connectDB from '../config/db.js';
import app from '../server.js';

// Initialize connection on cold start (non-blocking)
connectDB().catch(err => {
  console.error('Initial DB connection failed:', err.message);
});

export default app;
