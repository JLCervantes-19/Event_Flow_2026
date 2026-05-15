import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    eventoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'El evento es obligatorio'],
    },
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    autorNombre: {
      type: String,
      required: [true, 'El nombre del autor es obligatorio'],
      trim: true,
      minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
      maxlength: [80, 'El nombre no puede superar 80 caracteres'],
    },
    calificacion: {
      type: Number,
      required: [true, 'La calificación es obligatoria'],
      min: [1, 'La calificación mínima es 1'],
      max: [5, 'La calificación máxima es 5'],
    },
    comentario: {
      type: String,
      required: [true, 'El comentario es obligatorio'],
      trim: true,
      minlength: [10, 'El comentario debe tener al menos 10 caracteres'],
      maxlength: [500, 'El comentario no puede superar 500 caracteres'],
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

reviewSchema.index({ eventoId: 1, createdAt: -1 });

const Review = mongoose.model('Review', reviewSchema);

export default Review;
