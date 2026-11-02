const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const token = req.cookies?.auth_token;

  if (!token) {
    return res.status(401).json({ message: 'Debes iniciar sesión.' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.clearCookie('auth_token');
    return res.status(401).json({ message: 'La sesión no es válida. Inicia sesión nuevamente.' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'No tienes permiso para acceder.' });
  }
  next();
}

module.exports = { authenticate, requireAdmin };
