// controllers/reservationsController.js
// ──────────────────────────────────────────────────────────────
//  CRUD de Reservas con populate() anidado (Usuario + Evento)
// ──────────────────────────────────────────────────────────────

import Reservation from '../models/Reservation.js';
import Event from '../models/Event.js';

// GET /api/reservations — Listar todas las reservas
export const getReservations = async (req, res) => {
  try {
    const { estado, usuarioId, eventoId, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (estado) filter.estado = estado;
    if (usuarioId) filter.usuarioId = usuarioId;
    if (eventoId) filter.eventoId = eventoId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [reservations, total] = await Promise.all([
      Reservation.find(filter)
        .populate('usuarioId', 'nombre correo rol')
        .populate({
          path: 'eventoId',
          select: 'titulo fecha lugar categoria precio',
          populate: { path: 'organizadorId', select: 'nombre correo' },
        })
        .sort({ fechaReserva: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Reservation.countDocuments(filter),
    ]);

    res.json({
      ok: true,
      data: reservations,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

// GET /api/reservations/:id — Obtener reserva por ID
export const getReservationById = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('usuarioId', 'nombre correo rol')
      .populate({
        path: 'eventoId',
        select: 'titulo fecha lugar categoria precio capacidad',
        populate: { path: 'organizadorId', select: 'nombre correo' },
      });

    if (!reservation) return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });
    res.json({ ok: true, data: reservation });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

// POST /api/reservations — Crear reserva
export const createReservation = async (req, res) => {
  try {
    const { eventoId, cantidad } = req.body;

    // Capturar el precio del evento en el momento de la reserva (snapshot)
    const evento = await Event.findById(eventoId);
    if (!evento) return res.status(404).json({ ok: false, message: 'Evento no encontrado' });
    if (!evento.activo) return res.status(400).json({ ok: false, message: 'El evento no está disponible' });

    const reservation = new Reservation({
      ...req.body,
      precioUnitario: evento.precio,
    });

    await reservation.save();
    await reservation.populate('usuarioId', 'nombre correo');
    await reservation.populate('eventoId', 'titulo fecha lugar');

    res.status(201).json({ ok: true, data: reservation });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ ok: false, message: 'Error de validación', errors });
    }
    res.status(500).json({ ok: false, message: error.message });
  }
};

// PUT /api/reservations/:id — Actualizar (principalmente cambio de estado)
export const updateReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('usuarioId', 'nombre correo')
      .populate('eventoId', 'titulo fecha lugar');

    if (!reservation) return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });
    res.json({ ok: true, data: reservation });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

// DELETE /api/reservations/:id — Cancelar reserva (estado = cancelada)
export const cancelReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { estado: 'cancelada' },
      { new: true }
    );
    if (!reservation) return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });
    res.json({ ok: true, message: 'Reserva cancelada', data: reservation });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};
