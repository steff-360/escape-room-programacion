require('dotenv').config();

const readline = require('readline');
const bcrypt = require('bcryptjs');
const db = require('../src/config/db');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('Configura DATABASE_URL en .env');
  const fullName = (await ask('Nombre del administrador: ')).trim();
  const username = (await ask('Nombre de usuario: ')).trim();
  const password = await ask('Contraseña (mínimo 8 caracteres): ');

  if (!fullName || !username || password.length < 8) {
    throw new Error('Datos incompletos o contraseña demasiado corta.');
  }
  if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(username)) {
    throw new Error('El usuario debe tener 3-40 caracteres válidos.');
  }

  const hash = await bcrypt.hash(password, 12);
  await db.query(
    `INSERT INTO users (full_name, username, password_hash, role)
     VALUES ($1, $2, $3, 'admin')`,
    [fullName, username, hash]
  );
  console.log('Administrador creado correctamente.');
}

main()
  .catch(error => {
    console.error('No fue posible crear el administrador:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    rl.close();
    await db.pool.end();
  });
