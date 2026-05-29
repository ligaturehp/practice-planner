CREATE TABLE IF NOT EXISTS user_preferences (
	user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
	week_order text NOT NULL DEFAULT 'mondayFirst' CHECK (week_order IN ('mondayFirst', 'sundayFirst', 'gameDayLast')),
	updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO user_preferences (user_id, week_order)
SELECT users.id, 'mondayFirst'
FROM users
ON CONFLICT (user_id) DO NOTHING;
