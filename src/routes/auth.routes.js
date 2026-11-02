const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');
const { assignStudentTeam } = require('../services/teams');

const router = express.Router();

function setSession(res, user) {
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000
  });
}

router.post('/register', async (req, res, next) => {
  const { fullName, username, password } = req.body;
  if (![fullName, username, password].every(v => typeof v === 'string' && v.trim())) {
    return res.status(400).json({ message: 'Completa tu nombre, usuario y contraseña.' });
  }
  if (fullName.trim().length > 120 || username.trim().length > 40) {
    return res.status(400).json({ message: 'Uno de los campos supera la longitud permitida.' });
  }
  if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(username.trim())) {
    return res.status(400).json({ message: 'El usuario debe tener 3-40 caracteres: letras, números, punto, guion o guion bajo.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres.' });
  }

  let client;
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    client = await db.pool.connect();
    await client.query('BEGIN');

    const teamId = await assignStudentTeam(client);
    const userResult = await client.query(
      `INSERT INTO users (full_name, username, password_hash, team_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, username, role, team_id`,
      [fullName.trim(), username.trim(), passwordHash, teamId]
    );

    await client.query('COMMIT');
    const user = userResult.rows[0];
    setSession(res, user);
    res.status(201).json({
      message: 'Registro completado.',
      user: { id: user.id, fullName: user.full_name, username: user.username, role: user.role }
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('No se pudo revertir el registro:', rollbackError.message);
      }
    }
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Ese nombre de usuario ya está registrado.' });
    }
    next(error);
  } finally {
    if (client) client.release();
  }
});

router.post('/quick-start', async (req, res, next) => {
  const { fullName } = req.body;
  if (typeof fullName !== 'string' || !fullName.trim()) {
    return res.status(400).json({ message: 'Escribe tu nombre para empezar.' });
  }
  if (fullName.trim().length > 120) {
    return res.status(400).json({ message: 'El nombre supera la longitud permitida.' });
  }

  let client;
  try {
    const username = `quick-${crypto.randomBytes(16).toString('hex')}`;
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
    client = await db.pool.connect();
    await client.query('BEGIN');
    const teamId = await assignStudentTeam(client);
    const userResult = await client.query(
      `INSERT INTO users (full_name, username, password_hash, team_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, username, role`,
      [fullName.trim(), username, passwordHash, teamId]
    );
    await client.query('COMMIT');

    const user = userResult.rows[0];
    setSession(res, user);
    res.status(201).json({
      message: 'Participante registrado. Ya puedes empezar el juego.',
      user: { id: user.id, fullName: user.full_name, role: user.role }
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('No se pudo revertir el registro rápido:', rollbackError.message);
      }
    }
    next(error);
  } finally {
    if (client) client.release();
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Ingresa usuario y contraseña.' });
    }
    const result = await db.query(
      `SELECT id, full_name, username, password_hash, role
       FROM users WHERE username = $1`,
      [username.trim()]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
    }
    setSession(res, user);
    res.json({
      message: 'Sesión iniciada.',
      user: { id: user.id, fullName: user.full_name, username: user.username, role: user.role }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  res.json({ message: 'Sesión cerrada.' });
});

module.exports = router;
