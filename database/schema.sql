CREATE TABLE IF NOT EXISTS teams (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(60) NOT NULL UNIQUE,
    auto_team_number BIGINT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE teams ADD COLUMN IF NOT EXISTS auto_team_number BIGINT;
CREATE SEQUENCE IF NOT EXISTS teams_auto_number_seq;
SELECT setval(
    'teams_auto_number_seq',
    GREATEST(COALESCE(MAX(auto_team_number), 0), 1),
    COALESCE(MAX(auto_team_number), 0) > 0
)
FROM teams;

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    username VARCHAR(40) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(10) NOT NULL DEFAULT 'student'
        CHECK (role IN ('student', 'admin')),
    team_id BIGINT REFERENCES teams(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS escaped_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS mission_progress (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mission_number SMALLINT NOT NULL CHECK (mission_number BETWEEN 1 AND 5),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, mission_number)
);

CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON mission_progress(user_id);
