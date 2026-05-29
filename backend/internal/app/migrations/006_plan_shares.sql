CREATE TABLE IF NOT EXISTS plan_shares (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_plan_shares_plan_id ON plan_shares(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_shares_active_token ON plan_shares(token_hash) WHERE revoked_at IS NULL;
