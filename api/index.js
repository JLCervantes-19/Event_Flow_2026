import connectDB from '../config/db.js';
import app from '../server.js';

// Connect to database immediately (top-level await)
await connectDB();

export default app;
