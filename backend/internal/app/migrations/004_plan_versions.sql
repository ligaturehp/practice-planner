CREATE TABLE IF NOT EXISTS plan_versions (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
	user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	name text NOT NULL,
	sport text NOT NULL,
	template text NOT NULL,
	plan_json jsonb NOT NULL,
	lock_version integer NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plan_versions_plan_created_idx ON plan_versions (plan_id, created_at DESC);
CREATE INDEX IF NOT EXISTS plan_versions_user_created_idx ON plan_versions (user_id, created_at DESC);
