require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');

const required = ['DATABASE_URL', 'JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Falta configurar ${key} en el archivo .env`);
    process.exit(1);
  }
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET debe tener al menos 32 caracteres.');
  process.exit(1);
}

const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const db = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const gameRoutes = require('./routes/game.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
app.use(helmet());
app.use(express.json({ limit: '20kb' }));
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Demasiados intentos. Espera unos minutos.' }
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/admin', adminRoutes);
app.get('/healthz', (req, res) => res.status(200).json({ status: 'ok' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: 'Ocurrió un error en el servidor.' });
});

const port = Number(process.env.PORT) || 3000;

async function ensureAdminUser() {
  try {
    const adminCheck = await db.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if (adminCheck.rows.length === 0) {
      const adminUser = (process.env.ADMIN_USER || 'admin').trim();
      const adminPass = process.env.ADMIN_PASSWORD || 'AdminEscape2026!';
      const hash = await bcrypt.hash(adminPass, 12);
      await db.query(
        `INSERT INTO users (full_name, username, password_hash, role)
         VALUES ($1, $2, $3, 'admin')
         ON CONFLICT (username) DO NOTHING`,
        ['Profesor Administrador', adminUser, hash]
      );
      console.log(`[Admin] Cuenta administrativa inicial lista. Usuario: ${adminUser}`);
    }
  } catch (error) {
    console.error('Error al inicializar la cuenta administrativa:', error);
  }
}

async function start() {
  try {
    const schema = await fs.readFile(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8');
    await db.query(schema);
    await ensureAdminUser();
    app.listen(port, () => {
      console.log(`Escape Room disponible en el puerto ${port}`);
    });
  } catch (error) {
    console.error('No fue posible iniciar el servidor o preparar la base de datos:', error);
    await db.pool.end();
    process.exitCode = 1;
  }
}

start();
