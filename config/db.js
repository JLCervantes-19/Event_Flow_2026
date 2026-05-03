// config/db.js
// ──────────────────────────────────────────────────────────────
//  Conexión a MongoDB mediante Mongoose
//  Preparado para MongoDB Atlas (cloud) y local indistintamente
//  Optimizado para serverless con connection caching
// ──────────────────────────────────────────────────────────────

import mongoose from 'mongoose';

// Connection caching for serverless environments
let cachedConnection = null;

const connectDB = async () => {
  // Reuse existing connection if available
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log('♻️  Reusing existing MongoDB connection');
    return cachedConnection;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Opciones recomendadas para Atlas y evitar deprecation warnings
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
      // Connection pooling for serverless
      maxPoolSize: 5,
      minPoolSize: 1,
    });

    cachedConnection = conn;
    console.log(`✅  MongoDB conectado: ${conn.connection.host}`);

    // Eventos de conexión para monitoreo
    mongoose.connection.on('error', (err) => {
      console.error('❌  Error de MongoDB:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️   MongoDB desconectado. Intentando reconectar...');
    });

    return conn;
  } catch (error) {
    console.error(`❌  Error al conectar a MongoDB: ${error.message}`);
    // Don't exit process in serverless environment
    if (!process.env.VERCEL) {
      process.exit(1); // Salida con código de error solo en local
    }
    throw error;
  }
};

export default connectDB;
