import Review from '../models/Review.js';
import Event from '../models/Event.js';

// GET /api/reviews/stats — Promedio y conteo de reseñas para todos los eventos
export const getReviewStats = async (req, res) => {
  try {
    const stats = await Review.aggregate([
      { $group: { _id: '$eventoId', promedio: { $avg: '$calificacion' }, total: { $count: {} } } },
      { $project: { _id: 0, eventoId: '$_id', promedio: { $round: ['$promedio', 1] }, total: 1 } },
    ]);
    res.json({ ok: true, data: stats });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

// GET /api/reviews/:eventoId — Reseñas de un evento con promedio
export const getReviewsByEvent = async (req, res) => {
  try {
    const { eventoId } = req.params;
    const reviews = await Review.find({ eventoId }).sort({ createdAt: -1 });

    const promedio =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.calificacion, 0) / reviews.length
        : 0;

    res.json({ ok: true, data: reviews, promedio: Math.round(promedio * 10) / 10, total: reviews.length });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

// POST /api/reviews — Crear reseña
export const createReview = async (req, res) => {
  try {
    const { eventoId, autorNombre, calificacion, comentario } = req.body;

    const evento = await Event.findById(eventoId);
    if (!evento) return res.status(404).json({ ok: false, message: 'Evento no encontrado' });
    if (evento.fecha >= new Date()) {
      return res.status(400).json({ ok: false, message: 'Solo puedes reseñar eventos que ya han concluido' });
    }

    const review = new Review({ eventoId, autorNombre, calificacion, comentario });
    await review.save();
    res.status(201).json({ ok: true, data: review });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ ok: false, message: 'Error de validación', errors });
    }
    res.status(500).json({ ok: false, message: error.message });
  }
};

// DELETE /api/reviews/:id — Eliminar reseña
export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ ok: false, message: 'Reseña no encontrada' });
    res.json({ ok: true, message: 'Reseña eliminada' });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};
