// models/Reservation.js
// ──────────────────────────────────────────────────────────────
//  Esquema de Mongoose para la colección "reservations"
//  Relaciona User ↔ Event con ObjectId references
// ──────────────────────────────────────────────────────────────

import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema(
  {
    // ── Relaciones (ObjectId refs para populate()) ──────────
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El usuario es obligatorio'],
    },

    eventoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'El evento es obligatorio'],
    },

    // ── Campos propios ──────────────────────────────────────
    cantidad: {
      type: Number,
      required: [true, 'La cantidad de entradas es obligatoria'],
      min: [1, 'Debe reservar al menos 1 entrada'],
      max: [10, 'No puede reservar más de 10 entradas por transacción'],
    },

    estado: {
      type: String,
      enum: {
        values: ['confirmada', 'cancelada', 'pendiente'],
        message: 'Estado inválido. Use: confirmada | cancelada | pendiente',
      },
      default: 'confirmada',
    },

    fechaReserva: {
      type: Date,
      default: () => new Date(), // default: ahora
    },

    // Precio unitario al momento de la reserva (snapshot)
    precioUnitario: {
      type: Number,
      default: 0,
    },

    // Notas opcionales del cliente
    notas: {
      type: String,
      trim: true,
      maxlength: [300, 'Las notas no pueden superar 300 caracteres'],
      default: '',
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
      },
    },
  }
);

// Índices para las queries del Aggregation Pipeline
reservationSchema.index({ eventoId: 1 });
reservationSchema.index({ usuarioId: 1 });
reservationSchema.index({ estado: 1 });
reservationSchema.index({ fechaReserva: 1 });
// Índice compuesto para evitar duplicados confirmados
reservationSchema.index(
  { usuarioId: 1, eventoId: 1, estado: 1 },
  { partialFilterExpression: { estado: 'confirmada' } }
);

// Virtual: total de la reserva
reservationSchema.virtual('totalReserva').get(function () {
  return this.precioUnitario * this.cantidad;
});

const Reservation = mongoose.model('Reservation', reservationSchema);

export default Reservation;
