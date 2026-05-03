// controllers/eventsController.js
// ──────────────────────────────────────────────────────────────
//  CRUD de Eventos con populate() para traer el organizador
// ──────────────────────────────────────────────────────────────

import Event from '../models/Event.js';
import Reservation from '../models/Reservation.js';

// GET /api/events — Listar todos los eventos activos
export const getEvents = async (req, res) => {
  try {
    const { categoria, q, page = 1, limit = 12 } = req.query;
    const filter = { activo: true };

    if (categoria) filter.categoria = categoria;
    if (q) filter.titulo = { $regex: q, $options: 'i' };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [events, total] = await Promise.all([
      Event.find(filter)
        .populate('organizadorId', 'nombre correo rol')
        .sort({ fecha: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Event.countDocuments(filter),
    ]);

    res.json({
      ok: true,
      data: events,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

// GET /api/events/:id — Obtener evento por ID
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('organizadorId', 'nombre correo rol');
    if (!event) return res.status(404).json({ ok: false, message: 'Evento no encontrado' });
    res.json({ ok: true, data: event });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

// POST /api/events — Crear evento
export const createEvent = async (req, res) => {
  try {
    const event = new Event(req.body);
    await event.save();
    await event.populate('organizadorId', 'nombre correo rol');
    res.status(201).json({ ok: true, data: event });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ ok: false, message: 'Error de validación', errors });
    }
    res.status(500).json({ ok: false, message: error.message });
  }
};

// PUT /api/events/:id — Actualizar evento
export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('organizadorId', 'nombre correo rol');
    if (!event) return res.status(404).json({ ok: false, message: 'Evento no encontrado' });
    res.json({ ok: true, data: event });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ ok: false, message: 'Error de validación', errors });
    }
    res.status(500).json({ ok: false, message: error.message });
  }
};

// DELETE /api/events/:id — Borrado lógico (activo = false)
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, { activo: false }, { new: true });
    if (!event) return res.status(404).json({ ok: false, message: 'Evento no encontrado' });
    res.json({ ok: true, message: 'Evento desactivado correctamente' });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};
