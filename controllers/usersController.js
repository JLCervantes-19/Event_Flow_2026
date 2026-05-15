// controllers/usersController.js
// ──────────────────────────────────────────────────────────────
//  CRUD de Usuarios (organizadores, clientes, admins)
// ──────────────────────────────────────────────────────────────

import User from '../models/User.js';

// GET /api/users — Listar todos los usuarios
export const getUsers = async (req, res) => {
  try {
    const { rol, q, page = 1, limit = 100 } = req.query;
    const filter = {};

    if (rol) filter.rol = rol;
    if (q) filter.nombre = { $regex: q, $options: 'i' };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ nombre: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);

    res.json({
      ok: true,
      data: users,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

// GET /api/users/:id — Obtener usuario por ID
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    res.json({ ok: true, data: user });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

// POST /api/users — Crear usuario
export const createUser = async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json({ ok: true, data: user });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ ok: false, message: 'Error de validación', errors });
    }
    if (error.code === 11000) {
      return res.status(400).json({ ok: false, message: 'El correo ya está registrado' });
    }
    res.status(500).json({ ok: false, message: error.message });
  }
};

// PUT /api/users/:id — Actualizar usuario
export const updateUser = async (req, res) => {
  try {
    const updates = { ...req.body };
    if (!updates.password) delete updates.password;
    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!user) return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    res.json({ ok: true, data: user });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ ok: false, message: 'Error de validación', errors });
    }
    if (error.code === 11000) {
      return res.status(400).json({ ok: false, message: 'El correo ya está registrado' });
    }
    res.status(500).json({ ok: false, message: error.message });
  }
};

// DELETE /api/users/:id — Eliminar usuario
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    res.json({ ok: true, message: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};
