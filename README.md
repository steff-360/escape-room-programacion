# Escape Room de Programación

Aplicación web para que estudiantes se registren, formen equipos, jueguen misiones de lógica y programación, y consulten el avance. Incluye un panel administrativo.

## Tecnologías

- Node.js y Express
- PostgreSQL
- HTML, CSS y JavaScript sin framework
- Contraseñas protegidas con bcrypt
- Sesión mediante JWT en cookie HttpOnly

## Juego rápido sin servidor

Puedes jugar sin instalar Node.js ni PostgreSQL:

1. Abre `public/index.html` en el navegador.
2. Escribe tu nombre en la sección **Partida rápida**.

Sin conexión al servidor, **Partida rápida** conserva el progreso en ese dispositivo y muestra un equipo local; también funciona desde un hosting estático, pero no sincroniza datos. El registro, el inicio de sesión, la asignación automática de equipos y el listado de la administradora requieren abrir la aplicación publicada con su servidor Node.js y su base de datos PostgreSQL. Un hosting estático por sí solo no puede atender esas rutas de cuenta.

## Instalación local con cuentas y administración

Para registrar estudiantes, guardar resultados en PostgreSQL y usar el panel administrativo necesitas Node.js 20 o superior y PostgreSQL.

## Instalación

1. Descomprime el proyecto y abre una terminal dentro de esta carpeta.
2. Instala dependencias:

   ```bash
   npm install
   ```

3. Crea una base de datos vacía en PostgreSQL:

   ```sql
   CREATE DATABASE escape_room;
   ```

4. Copia `.env.example` y crea un archivo llamado `.env`.
5. Completa `DATABASE_URL` con tus credenciales locales de PostgreSQL.
6. Genera un secreto largo y aleatorio para `JWT_SECRET`. No compartas el archivo `.env`.
7. El servidor prepara y actualiza las tablas automáticamente al iniciar. Si ya tenías una base de datos anterior, conserva tus datos y agrega el campo de salida.
8. Crea el primer administrador de forma interactiva:

   ```bash
   npm run crear-admin
   ```

   El script solicitará nombre, usuario y contraseña. No hay credenciales predefinidas.

9. Inicia el servidor:

   ```bash
   npm run dev
   ```

10. Abre `http://localhost:3000`.

   Desde esta dirección puedes registrarte y usar la base de datos. Si abres `public/index.html` directamente, se inicia el modo de partida rápida local.

## Publicar el juego en internet

El archivo `render.yaml` prepara en Render el servidor web, una base de datos PostgreSQL y la conexión entre ambos; el equipo local no tiene que permanecer encendido. La base gratuita de Render vence a los 30 días: después queda inaccesible y, tras 14 días adicionales sin actualizarla a un plan pagado, Render elimina sus datos. Úsala solo para probar, no para guardar información importante de estudiantes.

1. Sube el proyecto a un repositorio de GitHub. No incluyas `.env` ni contraseñas.
2. En Render, crea un **Blueprint** y conecta el repositorio. Render leerá `render.yaml` y solicitará autorización para crear el servidor y la base gratuita; también genera automáticamente `JWT_SECRET`.
3. Espera a que termine el despliegue. El servidor prepara las tablas automáticamente; comprueba que está activo en `/healthz`.
4. Para crear el administrador, abre la Shell del servicio web en Render y ejecuta `npm run crear-admin`. El comando usa la `DATABASE_URL` configurada en el servidor.
5. Abre la URL que Render asigna al servicio para registrarte e iniciar sesión.

El plan gratuito de Render puede suspender el servidor después de un periodo sin visitas. Para guardar datos de estudiantes de forma permanente, revisa los límites, pausas y políticas de conservación del proveedor de base de datos antes de usarlo en clase.

## Flujo de uso

- Los estudiantes se registran con cuenta o entran por **Partida rápida**. Cuando el juego está publicado, ambos métodos agregan sus nombres al listado visible para la administradora.
- Los equipos se asignan automáticamente en grupos de hasta 5 estudiantes; no se necesita inventar ni compartir nombre de equipo.
- Cada estudiante juega las cinco misiones en orden; al completar cada una obtiene un fragmento del código secreto. Tras reunirlos, debe descifrarlos e introducirlos en la consola final. El progreso y la salida completada se guardan en PostgreSQL.
- Cada misión incluye un minijuego de memoria: al encontrar tres parejas se desbloquea una pista.
- El panel de administración permite consultar participantes, equipos y resultados.
- No se cargan usuarios, equipos ni resultados de demostración.

## Estructura

```text
escape-room-programacion/
├── database/
│   └── schema.sql
├── public/
│   ├── css/styles.css
│   ├── js/app.js
│   └── index.html
├── scripts/
│   └── create-admin.js
├── src/
│   ├── config/db.js
│   ├── middleware/auth.js
│   ├── routes/admin.routes.js
│   ├── routes/auth.routes.js
│   ├── routes/game.routes.js
│   ├── services/missions.js
│   ├── services/teams.js
│   └── server.js
├── .env.example
├── .gitignore
└── package.json
```

## Seguridad y notas

- Las contraseñas se almacenan como hash, nunca en texto plano.
- La cookie de autenticación es HttpOnly y SameSite=Lax.
- El panel administrativo requiere una cuenta creada mediante el script.
- En producción configura HTTPS y `NODE_ENV=production`.
- Este proyecto no configura hosting ni crea una base de datos remota.
- El avance y puntuación son individuales; el panel muestra resultados por estudiante y resumen de equipos.

## Personalización

Las misiones están definidas en `src/services/missions.js`. Puedes editar enunciados, opciones, pistas y explicaciones sin modificar las rutas.
