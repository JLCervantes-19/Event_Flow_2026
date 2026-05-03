import connectDB from '../config/db.js';
import app from '../server.js';

// Ensure database is connected before handling any requests
let isConnecting = false;
let isConnected = false;

const ensureConnection = async () => {
  if (isConnected) return;
  if (isConnecting) {
    // Wait for ongoing connection
    await new Promise(resolve => setTimeout(resolve, 100));
    return ensureConnection();
  }
  
  isConnecting = true;
  try {
    await connectDB();
    isConnected = true;
  } catch (error) {
    console.error('Failed to connect to database:', error);
  } finally {
    isConnecting = false;
  }
};

// Middleware to ensure connection before each request
app.use(async (req, res, next) => {
  await ensureConnection();
  next();
});

export default app;
