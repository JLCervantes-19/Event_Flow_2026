// models/User.js
// ──────────────────────────────────────────────────────────────
//  Esquema de Mongoose para la colección "users"
// ──────────────────────────────────────────────────────────────

import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
      maxlength: [80, 'El nombre no puede superar 80 caracteres'],
    },

    correo: {
      type: String,
      required: [true, 'El correo es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,6})+$/,
        'Formato de correo inválido',
      ],
    },

    rol: {
      type: String,
      enum: {
        values: ['admin', 'organizador', 'cliente'],
        message: 'Rol inválido. Use: admin | organizador | cliente',
      },
      default: 'cliente',
    },

    // Campo de avatar opcional para UI
    avatar: {
      type: String,
      default: null,
    },
  },
  {
    // Agrega automáticamente createdAt y updatedAt
    timestamps: true,
    // Elimina __v de las respuestas JSON
    versionKey: false,
    // Transforma el _id a id en las respuestas JSON
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
      },
    },
  }
);

// Índice para búsquedas por rol
userSchema.index({ rol: 1 });

// Virtual: iniciales para avatar por defecto
userSchema.virtual('iniciales').get(function () {
  return this.nombre
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
});

const User = mongoose.model('User', userSchema);

export default User;
