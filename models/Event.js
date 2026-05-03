// models/Event.js
// ──────────────────────────────────────────────────────────────
//  Esquema de Mongoose para la colección "events"
// ──────────────────────────────────────────────────────────────

import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    titulo: {
      type: String,
      required: [true, 'El título del evento es obligatorio'],
      trim: true,
      minlength: [4, 'El título debe tener al menos 4 caracteres'],
      maxlength: [120, 'El título no puede superar 120 caracteres'],
    },

    descripcion: {
      type: String,
      trim: true,
      maxlength: [1000, 'La descripción no puede superar 1000 caracteres'],
      default: '',
    },

    fecha: {
      type: Date,
      required: [true, 'La fecha del evento es obligatoria'],
    },

    lugar: {
      type: String,
      required: [true, 'El lugar del evento es obligatorio'],
      trim: true,
    },

    categoria: {
      type: String,
      required: [true, 'La categoría es obligatoria'],
      enum: {
        values: ['Música', 'Tecnología', 'Arte', 'Deportes', 'Educación', 'Negocios', 'Otro'],
        message: 'Categoría inválida',
      },
    },

    precio: {
      type: Number,
      required: [true, 'El precio es obligatorio'],
      min: [0, 'El precio no puede ser negativo'],
    },

    capacidad: {
      type: Number,
      default: 100,
      min: [1, 'La capacidad mínima es 1'],
    },

    imagen: {
      type: String,
      default: null,
    },

    // Referencia al organizador (User con rol 'organizador' o 'admin')
    organizadorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El organizador es obligatorio'],
    },

    activo: {
      type: Boolean,
      default: true,
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

// Índices para las queries más frecuentes
eventSchema.index({ fecha: 1 });
eventSchema.index({ categoria: 1 });
eventSchema.index({ organizadorId: 1 });
eventSchema.index({ activo: 1 });

// Virtual: indica si el evento ya pasó
eventSchema.virtual('finalizado').get(function () {
  return this.fecha < new Date();
});

const Event = mongoose.model('Event', eventSchema);

export default Event;
