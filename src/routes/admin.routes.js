const express = require('express');
const db = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireAdmin);

router.get('/summary', async (req, res, next) => {
  try {
    const [students, teams, completions] = await Promise.all([
      db.query("SELECT COUNT(*)::int AS total FROM users WHERE role = 'student'"),
      db.query('SELECT COUNT(*)::int AS total FROM teams'),
      db.query('SELECT COUNT(*)::int AS total FROM mission_progress')
    ]);
    res.json({
      students: students.rows[0].total,
      teams: teams.rows[0].total,
      completedMissions: completions.rows[0].total
    });
  } catch (error) { next(error); }
});

router.get('/students', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.full_name,
       CASE WHEN u.username LIKE 'quick-%' THEN 'Partida rápida' ELSE u.username END AS username,
       t.name AS team_name,
       COUNT(mp.id)::int AS completed_missions,
       u.created_at
       FROM users u
       LEFT JOIN teams t ON t.id = u.team_id
       LEFT JOIN mission_progress mp ON mp.user_id = u.id
       WHERE u.role = 'student'
       GROUP BY u.id, t.name
       ORDER BY u.created_at DESC`
    );
    res.json({ students: result.rows });
  } catch (error) { next(error); }
});

router.get('/teams', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT t.id, t.name, COUNT(DISTINCT u.id)::int AS members,
       COUNT(mp.id)::int AS completed_missions
       FROM teams t
       LEFT JOIN users u ON u.team_id = t.id AND u.role = 'student'
       LEFT JOIN mission_progress mp ON mp.user_id = u.id
       GROUP BY t.id
       ORDER BY t.name ASC`
    );
    res.json({ teams: result.rows });
  } catch (error) { next(error); }
});

module.exports = router;
