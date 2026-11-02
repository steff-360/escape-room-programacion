const express = require('express');
const db = require('../config/db');
const { missions, publicMission } = require('../services/missions');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/me', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.full_name, u.username, u.role, t.name AS team_name
       FROM users u LEFT JOIN teams t ON t.id = u.team_id WHERE u.id = $1`,
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Usuario no encontrado.' });
    res.json({ user: result.rows[0] });
  } catch (error) { next(error); }
});

router.get('/missions', async (req, res, next) => {
  try {
    const [progress, user] = await Promise.all([
      db.query('SELECT mission_number FROM mission_progress WHERE user_id = $1', [req.user.id]),
      db.query(
        `SELECT u.escaped_at, t.name AS team_name,
         (SELECT COUNT(*)::int FROM users members
          WHERE members.team_id = u.team_id AND members.role = 'student') AS team_members
         FROM users u LEFT JOIN teams t ON t.id = u.team_id
         WHERE u.id = $1`,
        [req.user.id]
      )
    ]);
    if (!user.rows[0]) return res.status(404).json({ message: 'Usuario no encontrado.' });
    const completed = progress.rows.map(row => row.mission_number);
    const codeParts = missions
      .filter(mission => completed.includes(mission.number))
      .map(mission => ({ missionNumber: mission.number, fragment: mission.codePart }));
    res.json({
      missions: missions.map(publicMission),
      completed,
      codeParts,
      escaped: user.rows[0].escaped_at !== null,
      teamName: user.rows[0].team_name,
      teamMembers: user.rows[0].team_members,
      score: completed.length
    });
  } catch (error) { next(error); }
});

router.post('/missions/:number/answer', async (req, res, next) => {
  try {
    const number = Number(req.params.number);
    const mission = missions.find(item => item.number === number);
    if (!mission) return res.status(404).json({ message: 'Misión no encontrada.' });

    const { option } = req.body;
    if (!Number.isInteger(option) || option < 0 || option >= mission.options.length) {
      return res.status(400).json({ message: 'Selecciona una respuesta válida.' });
    }

    const progress = await db.query(
      'SELECT mission_number FROM mission_progress WHERE user_id = $1',
      [req.user.id]
    );
    const completed = progress.rows.map(row => row.mission_number);
    if (missions.some(item => item.number < number && !completed.includes(item.number))) {
      return res.status(409).json({ message: 'Completa las puertas anteriores antes de continuar.' });
    }

    if (option !== mission.answer) {
      return res.json({ correct: false, message: 'Respuesta incorrecta. Conversen y vuelvan a intentarlo.' });
    }

    await db.query(
      `INSERT INTO mission_progress (user_id, mission_number)
       VALUES ($1, $2) ON CONFLICT (user_id, mission_number) DO NOTHING`,
      [req.user.id, number]
    );

    res.json({
      correct: true,
      message: '¡Respuesta correcta! Misión completada.',
      explanation: mission.explanation,
      completed: number,
      codePart: { missionNumber: number, fragment: mission.codePart }
    });
  } catch (error) { next(error); }
});

router.post('/escape', async (req, res, next) => {
  try {
    const code = typeof req.body.code === 'string' ? req.body.code.replace(/[\s-]/g, '').toUpperCase() : '';
    const secretCode = missions.map(mission => mission.codePart).join('');
    if (code !== secretCode) {
      return res.status(400).json({ message: 'Ese código no abre la puerta. Revisa el orden de los fragmentos.' });
    }

    const result = await db.query(
      `UPDATE users SET escaped_at = COALESCE(escaped_at, NOW())
       WHERE id = $1
       AND (SELECT COUNT(DISTINCT mission_number) FROM mission_progress WHERE user_id = $1) = $2
       RETURNING escaped_at`,
      [req.user.id, missions.length]
    );
    if (!result.rows[0]) {
      return res.status(403).json({ message: 'Completa las cinco misiones antes de probar el código.' });
    }

    res.json({ escaped: true, message: '¡Acceso restaurado!' });
  } catch (error) { next(error); }
});

module.exports = router;
