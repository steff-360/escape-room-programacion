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

Abierto como archivo, el juego conserva el progreso en ese dispositivo y muestra un equipo local; la asignación automática de grupos y el listado de la administradora requieren el servidor publicado.

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

El archivo `render.yaml` prepara el servidor web para Render. La aplicación y la base de datos quedan alojadas en internet; el equipo local no tiene que permanecer encendido.

1. Sube el proyecto a un repositorio privado de GitHub. No incluyas `.env` ni contraseñas.
2. Crea una base PostgreSQL alojada, por ejemplo, en Neon. Copia su URL de conexión con SSL.
3. En Render, crea un **Blueprint** y conecta el repositorio. Render leerá `render.yaml`; pega la URL de PostgreSQL cuando la solicite. Render genera automáticamente `JWT_SECRET`.
4. Espera a que termine el despliegue. El servidor prepara las tablas y puedes comprobar que está activo en `/healthz`.
5. Para crear el administrador, configura temporalmente `DATABASE_URL` en el `.env` local con la URL de la base alojada y ejecuta `npm run crear-admin`. No compartas ni subas ese archivo; después puedes borrar la URL del `.env`.

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
