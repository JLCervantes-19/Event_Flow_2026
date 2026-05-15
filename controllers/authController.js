// controllers/authController.js
import User from '../models/User.js';

export const login = async (req, res) => {
  try {
    const { correo, password } = req.body;
    if (!correo || !password) {
      return res.status(400).json({ ok: false, message: 'Correo y contraseña son obligatorios' });
    }

    const user = await User.findOne({ correo: correo.toLowerCase().trim() }).select('+password');
    if (!user || user.password !== password) {
      return res.status(401).json({ ok: false, message: 'Correo o contraseña incorrectos' });
    }

    res.json({
      ok: true,
      data: {
        id: user.id || user._id,
        nombre: user.nombre,
        correo: user.correo,
        rol: user.rol,
      },
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};
