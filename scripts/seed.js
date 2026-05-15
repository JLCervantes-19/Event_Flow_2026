// scripts/seed.js
// Genera 1000+ documentos por colección para cumplir los requisitos del proyecto
// Ejecutar: node scripts/seed.js

import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Event from '../models/Event.js';
import Reservation from '../models/Reservation.js';
import Review from '../models/Review.js';

const CATEGORIAS = ['Música', 'Tecnología', 'Arte', 'Deportes', 'Educación', 'Negocios', 'Otro'];
const LUGARES = [
  'Bogotá', 'Medellín', 'Cartagena', 'Cali', 'Barranquilla',
  'Bucaramanga', 'Pereira', 'Manizales', 'Santa Marta', 'Ibagué',
  'Cúcuta', 'Pasto', 'Montería', 'Villavicencio', 'Armenia',
];
const NOMBRES = [
  'Alejandro','Camila','Sebastián','Valentina','Daniel','Laura','Andrés','María',
  'Felipe','Sofía','Miguel','Isabella','David','Natalia','Luis','Gabriela',
  'Mateo','Juliana','Santiago','Paula','Diego','Carolina','Esteban','Marcela',
  'Ricardo','Ana','Jorge','Paola','Hernán','Claudia','Álvaro','Patricia',
  'Carlos','Gloria','Sergio','Catalina','Javier','Diana','Mauricio','Adriana',
];
const APELLIDOS = [
  'García','Rodríguez','Martínez','López','Gómez','Pérez','Sánchez','Ramírez',
  'Torres','Flores','Rivera','Morales','Vargas','Cruz','Reyes','Herrera',
  'Jiménez','Ruiz','Álvarez','Medina','Castro','Ortega','Vega','Romero',
  'Silva','Mendoza','Guerrero','Ramos','Ríos','Delgado','Gutiérrez','Salazar',
];
const TITULOS_BASE = [
  'Festival de', 'Gran Concierto de', 'Expo', 'Foro Internacional de',
  'Congreso de', 'Taller de', 'Seminario de', 'Tour de', 'Copa de',
  'Encuentro de', 'Summit de', 'Hackathon de', 'Noche de', 'Bienal de',
  'Maratón de', 'Campeonato de', 'Conferencia de', 'Feria de',
];
const COMENTARIOS = [
  'Excelente evento, muy bien organizado y con gran afluencia de público.',
  'Una experiencia única, definitivamente volvería a asistir.',
  'Los ponentes fueron increíbles, aprendí muchísimo.',
  'Buena organización aunque el lugar podría haber sido mejor.',
  'Superó todas mis expectativas. Altamente recomendado.',
  'El evento fue entretenido aunque duró menos de lo esperado.',
  'Muy buen ambiente y excelente networking con profesionales.',
  'La calidad del sonido fue impresionante, artistas de primer nivel.',
  'Estuvo bien pero faltó más variedad en las actividades.',
  'Increíble experiencia cultural, el mejor evento del año sin duda.',
  'Los talleres prácticos fueron lo mejor del evento.',
  'Buen evento aunque el precio fue un poco elevado para lo ofrecido.',
  'Perfecto para toda la familia, se divirtieron mucho.',
  'La logística estuvo un poco caótica pero el contenido valió la pena.',
  'Espectacular producción, me quedé sin palabras.',
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randNum = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randDate = (daysOffset) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(randNum(8, 22), 0, 0, 0);
  return d;
};

async function seed() {
  await connectDB();

  console.log('🗑️  Limpiando colecciones...');
  await Promise.all([
    User.deleteMany({}),
    Event.deleteMany({}),
    Reservation.deleteMany({}),
    Review.deleteMany({}),
  ]);

  // ─── USUARIOS (1000+) ─────────────────────────────────────────
  console.log('👥 Creando usuarios...');
  const usersData = [
    { nombre: 'Admin Principal', correo: 'admin@eventflow.com', password: 'admin123', rol: 'admin' },
    { nombre: 'Usuario Demo', correo: 'usuario@eventflow.com', password: 'usuario123', rol: 'cliente' },
  ];

  // 15 organizadores
  for (let i = 0; i < 15; i++) {
    const nombre = `${rand(NOMBRES)} ${rand(APELLIDOS)}`;
    usersData.push({
      nombre,
      correo: `org${String(i + 1).padStart(3, '0')}@eventflow.com`,
      password: 'org1234',
      rol: 'organizador',
    });
  }

  // 985 clientes (total ≥ 1000)
  for (let i = 0; i < 985; i++) {
    const nombre = `${rand(NOMBRES)} ${rand(APELLIDOS)}`;
    usersData.push({
      nombre,
      correo: `cliente${String(i + 1).padStart(4, '0')}@demo.com`,
      password: 'cliente1234',
      rol: 'cliente',
    });
  }

  const users = await User.insertMany(usersData);
  const admins = users.filter((u) => u.rol === 'admin');
  const organizadores = users.filter((u) => u.rol === 'organizador' || u.rol === 'admin');
  const clientes = users.filter((u) => u.rol === 'cliente');
  console.log(`   → ${users.length} usuarios creados`);

  // ─── EVENTOS (1000+) ──────────────────────────────────────────
  console.log('🎪 Creando eventos...');
  const eventosData = [];

  // 500 eventos pasados (concluidos) para reviews
  for (let i = 0; i < 500; i++) {
    const cat = CATEGORIAS[i % CATEGORIAS.length];
    const daysAgo = randNum(10, 730);
    eventosData.push({
      titulo: `${rand(TITULOS_BASE)} ${cat} ${i + 1}`,
      descripcion: `Evento de ${cat} celebrado en ${rand(LUGARES)}. Una experiencia única e inolvidable para todos los asistentes.`,
      fecha: randDate(-daysAgo),
      lugar: rand(LUGARES),
      categoria: cat,
      precio: rand([20000, 35000, 50000, 75000, 100000, 150000, 200000, 250000]),
      capacidad: randNum(50, 800),
      organizadorId: rand(organizadores)._id,
      activo: true,
    });
  }

  // 500 eventos futuros (disponibles para reservar)
  for (let i = 0; i < 500; i++) {
    const cat = CATEGORIAS[i % CATEGORIAS.length];
    const daysAhead = randNum(1, 365);
    eventosData.push({
      titulo: `${rand(TITULOS_BASE)} ${cat} ${i + 501}`,
      descripcion: `Próximo evento de ${cat} en ${rand(LUGARES)}. No te pierdas esta experiencia única.`,
      fecha: randDate(daysAhead),
      lugar: rand(LUGARES),
      categoria: cat,
      precio: rand([20000, 35000, 50000, 75000, 100000, 150000, 200000, 250000]),
      capacidad: randNum(50, 800),
      organizadorId: rand(organizadores)._id,
      activo: true,
    });
  }

  const eventos = await Event.insertMany(eventosData);
  const eventosPasados = eventos.filter((e) => e.fecha < new Date());
  const eventosFuturos = eventos.filter((e) => e.fecha >= new Date());
  console.log(`   → ${eventos.length} eventos creados (${eventosPasados.length} pasados, ${eventosFuturos.length} futuros)`);

  // ─── RESERVACIONES (1000+) ────────────────────────────────────
  console.log('🎫 Creando reservaciones...');
  const reservasData = [];
  const ahora = new Date();

  for (let i = 0; i < 1000; i++) {
    const evento = rand(eventos);
    const cliente = rand(clientes);
    const mesAtras = randNum(0, 18);
    const fechaReserva = new Date(
      ahora.getFullYear(),
      ahora.getMonth() - mesAtras,
      randNum(1, 28),
    );
    reservasData.push({
      usuarioId: cliente._id,
      eventoId: evento._id,
      cantidad: randNum(1, 5),
      estado: Math.random() > 0.12 ? 'confirmada' : (Math.random() > 0.5 ? 'cancelada' : 'pendiente'),
      fechaReserva,
      precioUnitario: evento.precio,
      notas: Math.random() > 0.7 ? 'Sin notas adicionales.' : '',
    });
  }

  await Reservation.insertMany(reservasData);
  console.log(`   → ${reservasData.length} reservaciones creadas`);

  // ─── RESEÑAS (1000+) ──────────────────────────────────────────
  console.log('⭐ Creando reseñas...');
  const reviewsData = [];

  for (let i = 0; i < 1000; i++) {
    const evento = rand(eventosPasados);
    const cliente = rand(clientes);
    reviewsData.push({
      eventoId: evento._id,
      usuarioId: cliente._id,
      autorNombre: cliente.nombre,
      calificacion: randNum(1, 5),
      comentario: rand(COMENTARIOS),
    });
  }

  await Review.insertMany(reviewsData);
  console.log(`   → ${reviewsData.length} reseñas creadas`);

  console.log('\n✅ Seed completado exitosamente');
  console.log('─────────────────────────────────────────');
  console.log(`   Users:        ${users.length}`);
  console.log(`   Events:       ${eventos.length}`);
  console.log(`   Reservations: ${reservasData.length}`);
  console.log(`   Reviews:      ${reviewsData.length}`);
  console.log('─────────────────────────────────────────');
  console.log('\n📧 Credenciales de acceso:');
  console.log('   Admin:   admin@eventflow.com  / admin123');
  console.log('   Usuario: usuario@eventflow.com / usuario123');

  process.exit(0);
}

seed().catch((e) => {
  console.error('❌ Error en seed:', e);
  process.exit(1);
});
