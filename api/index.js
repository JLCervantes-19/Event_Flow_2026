import connectDB from '../config/db.js';
import app from '../server.js';

// Ensure database connection before handling requests
connectDB().catch(err => console.error('DB connection failed:', err));

export default app;
