// server.js
// ──────────────────────────────────────────────────────────────
//  Punto de entrada del servidor Express
//  Carga la configuración, middleware, rutas y conecta a MongoDB
// ──────────────────────────────────────────────────────────────

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

import connectDB from './config/db.js';
import eventsRouter from './routes/events.js';
import reservationsRouter from './routes/reservations.js';
import dashboardRouter from './routes/dashboard.js';
import usersRouter from './routes/users.js';

// Import models to register them with Mongoose
import './models/User.js';
import './models/Event.js';
import './models/Reservation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────
// Dynamic CORS configuration based on environment
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

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, 'public')));

// ── Rutas API ─────────────────────────────────────────────────
app.use('/api/events', eventsRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/users', usersRouter);

// Health check with database status
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

// Fallback SPA → index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Manejo global de errores ──────────────────────────────────
app.use((err, req, res, next) => {
  // Log error stack trace to console
  console.error('🔥 Error no controlado:', err.stack);
  
  // Check if we're in development environment
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Return structured JSON error response
  res.status(err.status || 500).json({
    ok: false,
    message: err.message || 'Error interno del servidor',
    // Include stack trace only in development
    ...(isDevelopment && { stack: err.stack }),
  });
});

// ── Arranque ──────────────────────────────────────────────────
// Export app for Vercel serverless
export default app;

// Start server only in local environment (not in Vercel)
if (!process.env.VERCEL) {
  const start = async () => {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀  EventFlow API corriendo en http://localhost:${PORT}`);
      console.log(`📊  Dashboard en     http://localhost:${PORT}/dashboard`);
      console.log(`🌿  Entorno: ${process.env.NODE_ENV}`);
    });
  };

  start();
}
