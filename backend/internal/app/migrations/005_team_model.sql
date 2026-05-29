CREATE TABLE IF NOT EXISTS organizations (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	name text NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_members (
	organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	role text NOT NULL CHECK (role IN ('owner', 'member')),
	created_at timestamptz NOT NULL DEFAULT now(),
	PRIMARY KEY (organization_id, user_id)
);

ALTER TABLE plans
	ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

WITH existing_users AS (
	SELECT id AS user_id, email
	FROM users
),
created_orgs AS (
	INSERT INTO organizations (name)
	SELECT 'My Team'
	FROM existing_users
	WHERE NOT EXISTS (
		SELECT 1 FROM organization_members WHERE organization_members.user_id = existing_users.user_id
	)
	RETURNING id
),
numbered_orgs AS (
	SELECT id, row_number() OVER (ORDER BY id) AS rn
	FROM created_orgs
),
users_without_orgs AS (
	SELECT user_id, row_number() OVER (ORDER BY user_id) AS rn
	FROM existing_users
	WHERE NOT EXISTS (
		SELECT 1 FROM organization_members WHERE organization_members.user_id = existing_users.user_id
	)
)
INSERT INTO organization_members (organization_id, user_id, role)
SELECT numbered_orgs.id, users_without_orgs.user_id, 'owner'
FROM numbered_orgs
JOIN users_without_orgs ON users_without_orgs.rn = numbered_orgs.rn
ON CONFLICT DO NOTHING;

UPDATE plans
SET organization_id = default_org.organization_id
FROM (
	SELECT DISTINCT ON (user_id) user_id, organization_id
	FROM organization_members
	ORDER BY user_id, created_at
) AS default_org
WHERE plans.organization_id IS NULL
	AND plans.user_id = default_org.user_id;

CREATE INDEX IF NOT EXISTS plans_organization_updated_idx ON plans (organization_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS organization_members_user_idx ON organization_members (user_id);
