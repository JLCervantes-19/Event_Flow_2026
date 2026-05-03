// scripts/seed.js
// ──────────────────────────────────────────────────────────────
//  Pobla MongoDB con datos de prueba para el dashboard
//  Ejecutar: node scripts/seed.js
// ──────────────────────────────────────────────────────────────

import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Event from '../models/Event.js';
import Reservation from '../models/Reservation.js';

const CATEGORIAS = ['Música', 'Tecnología', 'Arte', 'Deportes', 'Educación', 'Negocios'];
const LUGARES = ['Bogotá', 'Medellín', 'Cartagena', 'Cali', 'Barranquilla'];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randNum = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function seed() {
  await connectDB();
  await Promise.all([
    User.deleteMany({}),
    Event.deleteMany({}),
    Reservation.deleteMany({}),
  ]);
  console.log('🗑️  Colecciones limpias');

  // Crear usuarios
  const users = await User.insertMany([
    { nombre: 'Ana Martínez', correo: 'ana@demo.com', rol: 'admin' },
    { nombre: 'Carlos Vélez', correo: 'carlos@demo.com', rol: 'organizador' },
    { nombre: 'María Torres', correo: 'maria@demo.com', rol: 'organizador' },
    { nombre: 'Luis Pérez', correo: 'luis@demo.com', rol: 'organizador' },
    ...Array.from({ length: 20 }, (_, i) => ({
      nombre: `Cliente ${i + 1}`,
      correo: `cliente${i + 1}@demo.com`,
      rol: 'cliente',
    })),
  ]);
  console.log(`👥 ${users.length} usuarios creados`);

  const organizadores = users.filter((u) => u.rol !== 'cliente');
  const clientes = users.filter((u) => u.rol === 'cliente');

  // Crear eventos
  const eventos = await Event.insertMany(
    Array.from({ length: 18 }, (_, i) => ({
      titulo: `Evento ${CATEGORIAS[i % 6]} ${i + 1}`,
      descripcion: `Descripción del evento ${i + 1}. Una experiencia inolvidable.`,
      fecha: new Date(Date.now() + randNum(1, 90) * 24 * 60 * 60 * 1000),
      lugar: rand(LUGARES),
      categoria: CATEGORIAS[i % 6],
      precio: rand([25000, 50000, 75000, 100000, 150000, 200000]),
      capacidad: randNum(50, 500),
      organizadorId: rand(organizadores)._id,
    }))
  );
  console.log(`🎪 ${eventos.length} eventos creados`);

  // Crear reservas con fechas distribuidas en el año actual
  const reservas = [];
  const ahora = new Date();
  for (let i = 0; i < 200; i++) {
    const evento = rand(eventos);
    const cliente = rand(clientes);
    const mesAtras = randNum(0, 11);
    const fechaReserva = new Date(ahora.getFullYear(), ahora.getMonth() - mesAtras, randNum(1, 28));
    reservas.push({
      usuarioId: cliente._id,
      eventoId: evento._id,
      cantidad: randNum(1, 4),
      estado: Math.random() > 0.1 ? 'confirmada' : 'cancelada',
      fechaReserva,
      precioUnitario: evento.precio,
    });
  }
  await Reservation.insertMany(reservas);
  console.log(`🎫 ${reservas.length} reservas creadas`);
  console.log('✅  Seed completado');
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
