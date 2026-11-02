const TEAM_CAPACITY = 5;
const TEAM_ASSIGNMENT_LOCK = 184627;

async function assignStudentTeam(client) {
  await client.query('SELECT pg_advisory_xact_lock($1)', [TEAM_ASSIGNMENT_LOCK]);

  const availableTeam = await client.query(
    `SELECT t.id
     FROM teams t
     LEFT JOIN users u ON u.team_id = t.id AND u.role = 'student'
     WHERE t.auto_team_number IS NOT NULL
     GROUP BY t.id, t.auto_team_number
     HAVING COUNT(u.id) < $1
     ORDER BY t.auto_team_number
     LIMIT 1`,
    [TEAM_CAPACITY]
  );
  if (availableTeam.rows[0]) return availableTeam.rows[0].id;

  while (true) {
    const numberResult = await client.query("SELECT nextval('teams_auto_number_seq') AS number");
    const number = Number(numberResult.rows[0].number);
    const name = `Equipo ${String(number).padStart(2, '0')}`;
    const existingTeam = await client.query('SELECT id FROM teams WHERE name = $1', [name]);
    if (existingTeam.rows[0]) continue;

    const team = await client.query(
      'INSERT INTO teams (name, auto_team_number) VALUES ($1, $2) RETURNING id',
      [name, number]
    );
    return team.rows[0].id;
  }
}

module.exports = { assignStudentTeam };
