package app

import (
	"context"
	"embed"
	"errors"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type planQuerier interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}

//go:embed migrations/*.sql
var migrationFiles embed.FS

type PostgresStore struct {
	pool *pgxpool.Pool
}

func NewPostgresStore(ctx context.Context, databaseURL string) (*PostgresStore, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, err
	}
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return &PostgresStore{pool: pool}, nil
}

func (s *PostgresStore) ApplyMigrations(ctx context.Context) error {
	if _, err := s.pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version text PRIMARY KEY,
			applied_at timestamptz NOT NULL DEFAULT now()
		)
	`); err != nil {
		return err
	}
	entries, err := migrationFiles.ReadDir("migrations")
	if err != nil {
		return err
	}
	names := make([]string, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}
		names = append(names, entry.Name())
	}
	sort.Strings(names)

	for _, name := range names {
		version := strings.TrimSuffix(name, ".sql")
		var exists bool
		if err := s.pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = $1)`, version).Scan(&exists); err != nil {
			return err
		}
		if exists {
			continue
		}
		sqlBytes, err := migrationFiles.ReadFile("migrations/" + name)
		if err != nil {
			return err
		}
		tx, err := s.pool.Begin(ctx)
		if err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, string(sqlBytes)); err != nil {
			_ = tx.Rollback(ctx)
			return err
		}
		if _, err = tx.Exec(ctx, `INSERT INTO schema_migrations (version) VALUES ($1)`, version); err != nil {
			_ = tx.Rollback(ctx)
			return err
		}
		if err = tx.Commit(ctx); err != nil {
			return err
		}
	}
	return nil
}

func (s *PostgresStore) Ping(ctx context.Context) error {
	return s.pool.Ping(ctx)
}

func (s *PostgresStore) Close() {
	s.pool.Close()
}

func (s *PostgresStore) CreateUser(ctx context.Context, email string, passwordHash string) (User, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return User{}, err
	}
	defer tx.Rollback(ctx)
	var user User
	err = tx.QueryRow(ctx, `
		INSERT INTO users (email, password_hash)
		VALUES ($1, $2)
		RETURNING id::text, email, password_hash, created_at
	`, normalizeEmail(email), passwordHash).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt)
	if isUniqueViolation(err) {
		return User{}, ErrConflict
	}
	if err != nil {
		return User{}, err
	}
	if _, err := createOrganization(ctx, tx, user.ID, "My Team"); err != nil {
		return User{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return User{}, err
	}
	return user, nil
}

func (s *PostgresStore) GetUserByEmail(ctx context.Context, email string) (User, error) {
	var user User
	err := s.pool.QueryRow(ctx, `
		SELECT id::text, email, password_hash, created_at
		FROM users
		WHERE lower(email) = lower($1)
	`, email).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrNotFound
	}
	return user, err
}

func (s *PostgresStore) GetUserByID(ctx context.Context, id string) (User, error) {
	var user User
	err := s.pool.QueryRow(ctx, `
		SELECT id::text, email, password_hash, created_at
		FROM users
		WHERE id = $1
	`, id).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrNotFound
	}
	return user, err
}

func (s *PostgresStore) UpdateUserPassword(ctx context.Context, id string, passwordHash string) error {
	tag, err := s.pool.Exec(ctx, `UPDATE users SET password_hash = $2 WHERE id = $1`, id, passwordHash)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PostgresStore) ListOrganizations(ctx context.Context, userID string) ([]Organization, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT organizations.id::text, organizations.name, organization_members.role, organizations.created_at
		FROM organizations
		JOIN organization_members ON organization_members.organization_id = organizations.id
		WHERE organization_members.user_id = $1
		ORDER BY organizations.created_at
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	organizations := []Organization{}
	for rows.Next() {
		var organization Organization
		if err := rows.Scan(&organization.ID, &organization.Name, &organization.Role, &organization.CreatedAt); err != nil {
			return nil, err
		}
		organizations = append(organizations, organization)
	}
	return organizations, rows.Err()
}

func (s *PostgresStore) CreateOrganization(ctx context.Context, userID string, name string) (Organization, error) {
	return createOrganization(ctx, s.pool, userID, name)
}

func (s *PostgresStore) AddOrganizationMember(ctx context.Context, actorUserID string, organizationID string, email string, role string) error {
	var actorRole string
	err := s.pool.QueryRow(ctx, `
		SELECT role
		FROM organization_members
		WHERE organization_id = $1 AND user_id = $2
	`, organizationID, actorUserID).Scan(&actorRole)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if actorRole != "owner" {
		return ErrNotFound
	}
	user, err := s.GetUserByEmail(ctx, email)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx, `
		INSERT INTO organization_members (organization_id, user_id, role)
		VALUES ($1, $2, $3)
		ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role
	`, organizationID, user.ID, role)
	return err
}

func (s *PostgresStore) DefaultOrganizationID(ctx context.Context, userID string) (string, error) {
	var organizationID string
	err := s.pool.QueryRow(ctx, `
		SELECT organization_id::text
		FROM organization_members
		WHERE user_id = $1
		ORDER BY created_at
		LIMIT 1
	`, userID).Scan(&organizationID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	return organizationID, err
}

func (s *PostgresStore) CreateSession(ctx context.Context, userID string, tokenHash string, expiresAt time.Time) (Session, error) {
	var session Session
	err := s.pool.QueryRow(ctx, `
		INSERT INTO sessions (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
		RETURNING id::text, user_id::text, token_hash, expires_at, created_at
	`, userID, tokenHash, expiresAt).Scan(&session.ID, &session.UserID, &session.TokenHash, &session.ExpiresAt, &session.CreatedAt)
	return session, err
}

func (s *PostgresStore) GetSessionByTokenHash(ctx context.Context, tokenHash string) (Session, error) {
	var session Session
	err := s.pool.QueryRow(ctx, `
		SELECT id::text, user_id::text, token_hash, expires_at, created_at
		FROM sessions
		WHERE token_hash = $1
	`, tokenHash).Scan(&session.ID, &session.UserID, &session.TokenHash, &session.ExpiresAt, &session.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Session{}, ErrNotFound
	}
	return session, err
}

func (s *PostgresStore) DeleteSession(ctx context.Context, tokenHash string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM sessions WHERE token_hash = $1`, tokenHash)
	return err
}

func (s *PostgresStore) DeleteExpiredSessions(ctx context.Context, now time.Time) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM sessions WHERE expires_at <= $1`, now)
	return err
}

func (s *PostgresStore) CreatePasswordResetToken(ctx context.Context, userID string, tokenHash string, expiresAt time.Time) (PasswordResetToken, error) {
	var reset PasswordResetToken
	err := s.pool.QueryRow(ctx, `
		INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
		RETURNING id::text, user_id::text, token_hash, expires_at, created_at
	`, userID, tokenHash, expiresAt).Scan(&reset.ID, &reset.UserID, &reset.TokenHash, &reset.ExpiresAt, &reset.CreatedAt)
	return reset, err
}

func (s *PostgresStore) GetPasswordResetToken(ctx context.Context, tokenHash string) (PasswordResetToken, error) {
	var reset PasswordResetToken
	err := s.pool.QueryRow(ctx, `
		SELECT id::text, user_id::text, token_hash, expires_at, created_at
		FROM password_reset_tokens
		WHERE token_hash = $1
	`, tokenHash).Scan(&reset.ID, &reset.UserID, &reset.TokenHash, &reset.ExpiresAt, &reset.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return PasswordResetToken{}, ErrNotFound
	}
	return reset, err
}

func (s *PostgresStore) DeletePasswordResetToken(ctx context.Context, tokenHash string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM password_reset_tokens WHERE token_hash = $1`, tokenHash)
	return err
}

func (s *PostgresStore) ListPlans(ctx context.Context, userID string) ([]Plan, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT plans.id::text, plans.user_id::text, plans.organization_id::text, plans.name, plans.sport, plans.template, plans.plan_json, plans.lock_version, plans.created_at, plans.updated_at
		FROM plans
		JOIN organization_members ON organization_members.organization_id = plans.organization_id
		WHERE organization_members.user_id = $1
		ORDER BY plans.updated_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	plans := []Plan{}
	for rows.Next() {
		var plan Plan
		if err := rows.Scan(&plan.ID, &plan.UserID, &plan.OrganizationID, &plan.Name, &plan.Sport, &plan.Template, &plan.PlanJSON, &plan.LockVersion, &plan.CreatedAt, &plan.UpdatedAt); err != nil {
			return nil, err
		}
		plans = append(plans, plan)
	}
	return plans, rows.Err()
}

func (s *PostgresStore) CreatePlan(ctx context.Context, userID string, input PlanInput) (Plan, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Plan{}, err
	}
	defer tx.Rollback(ctx)
	orgID := input.OrganizationID
	if orgID == "" {
		orgID, err = defaultOrganizationID(ctx, tx, userID)
		if err != nil {
			return Plan{}, err
		}
	}
	if ok, err := isOrganizationMember(ctx, tx, userID, orgID); err != nil {
		return Plan{}, err
	} else if !ok {
		return Plan{}, ErrNotFound
	}
	var plan Plan
	err = tx.QueryRow(ctx, `
		INSERT INTO plans (user_id, organization_id, name, sport, template, plan_json)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id::text, user_id::text, organization_id::text, name, sport, template, plan_json, lock_version, created_at, updated_at
	`, userID, orgID, input.Name, input.Sport, input.Template, input.PlanJSON).Scan(&plan.ID, &plan.UserID, &plan.OrganizationID, &plan.Name, &plan.Sport, &plan.Template, &plan.PlanJSON, &plan.LockVersion, &plan.CreatedAt, &plan.UpdatedAt)
	if err != nil {
		return Plan{}, err
	}
	if err := insertPlanVersion(ctx, tx, plan); err != nil {
		return Plan{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Plan{}, err
	}
	return plan, nil
}

func (s *PostgresStore) GetPlan(ctx context.Context, userID string, id string) (Plan, error) {
	var plan Plan
	err := s.pool.QueryRow(ctx, `
		SELECT plans.id::text, plans.user_id::text, plans.organization_id::text, plans.name, plans.sport, plans.template, plans.plan_json, plans.lock_version, plans.created_at, plans.updated_at
		FROM plans
		JOIN organization_members ON organization_members.organization_id = plans.organization_id
		WHERE plans.id = $1 AND organization_members.user_id = $2
	`, id, userID).Scan(&plan.ID, &plan.UserID, &plan.OrganizationID, &plan.Name, &plan.Sport, &plan.Template, &plan.PlanJSON, &plan.LockVersion, &plan.CreatedAt, &plan.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Plan{}, ErrNotFound
	}
	return plan, err
}

func (s *PostgresStore) UpdatePlan(ctx context.Context, userID string, id string, input PlanInput) (Plan, error) {
	if input.LockVersion == nil {
		return Plan{}, ErrConflict
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Plan{}, err
	}
	defer tx.Rollback(ctx)
	var plan Plan
	err = tx.QueryRow(ctx, `
		UPDATE plans
		SET name = $3,
			sport = $4,
			template = $5,
			plan_json = $6,
			lock_version = lock_version + 1,
			updated_at = now()
			WHERE id = $1
				AND lock_version = $7
				AND EXISTS (
					SELECT 1 FROM organization_members
					WHERE organization_members.organization_id = plans.organization_id
						AND organization_members.user_id = $2
				)
			RETURNING id::text, user_id::text, organization_id::text, name, sport, template, plan_json, lock_version, created_at, updated_at
		`, id, userID, input.Name, input.Sport, input.Template, input.PlanJSON, *input.LockVersion).Scan(&plan.ID, &plan.UserID, &plan.OrganizationID, &plan.Name, &plan.Sport, &plan.Template, &plan.PlanJSON, &plan.LockVersion, &plan.CreatedAt, &plan.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		if _, getErr := s.GetPlan(ctx, userID, id); errors.Is(getErr, ErrNotFound) {
			return Plan{}, ErrNotFound
		} else if getErr != nil {
			return Plan{}, getErr
		}
		return Plan{}, ErrConflict
	}
	if err != nil {
		return Plan{}, err
	}
	if err := insertPlanVersion(ctx, tx, plan); err != nil {
		return Plan{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Plan{}, err
	}
	return plan, nil
}

func (s *PostgresStore) DeletePlan(ctx context.Context, userID string, id string) error {
	tag, err := s.pool.Exec(ctx, `
		DELETE FROM plans
		WHERE id = $1
			AND EXISTS (
				SELECT 1 FROM organization_members
				WHERE organization_members.organization_id = plans.organization_id
					AND organization_members.user_id = $2
			)
	`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PostgresStore) ListPlanVersions(ctx context.Context, userID string, planID string) ([]PlanVersion, error) {
	if _, err := s.GetPlan(ctx, userID, planID); err != nil {
		return nil, err
	}
	rows, err := s.pool.Query(ctx, `
		SELECT id::text, plan_id::text, name, sport, template, plan_json, lock_version, created_at
		FROM plan_versions
		WHERE plan_id = $1
		ORDER BY created_at DESC
	`, planID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	versions := []PlanVersion{}
	for rows.Next() {
		var version PlanVersion
		if err := rows.Scan(&version.ID, &version.PlanID, &version.Name, &version.Sport, &version.Template, &version.PlanJSON, &version.LockVersion, &version.CreatedAt); err != nil {
			return nil, err
		}
		versions = append(versions, version)
	}
	return versions, rows.Err()
}

func (s *PostgresStore) RestorePlanVersion(ctx context.Context, userID string, planID string, versionID string) (Plan, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Plan{}, err
	}
	defer tx.Rollback(ctx)
	var plan Plan
	err = tx.QueryRow(ctx, `
		UPDATE plans
		SET name = version_snapshot.name,
			sport = version_snapshot.sport,
			template = version_snapshot.template,
			plan_json = version_snapshot.plan_json,
			lock_version = plans.lock_version + 1,
			updated_at = now()
		FROM (
			SELECT name, sport, template, plan_json
			FROM plan_versions
				WHERE id = $3 AND plan_id = $1
			) AS version_snapshot
			WHERE plans.id = $1
				AND EXISTS (
					SELECT 1 FROM organization_members
					WHERE organization_members.organization_id = plans.organization_id
						AND organization_members.user_id = $2
				)
			RETURNING plans.id::text, plans.user_id::text, plans.organization_id::text, plans.name, plans.sport, plans.template, plans.plan_json, plans.lock_version, plans.created_at, plans.updated_at
	`, planID, userID, versionID).Scan(&plan.ID, &plan.UserID, &plan.OrganizationID, &plan.Name, &plan.Sport, &plan.Template, &plan.PlanJSON, &plan.LockVersion, &plan.CreatedAt, &plan.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Plan{}, ErrNotFound
	}
	if err != nil {
		return Plan{}, err
	}
	if err := insertPlanVersion(ctx, tx, plan); err != nil {
		return Plan{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Plan{}, err
	}
	return plan, nil
}

func (s *PostgresStore) DuplicatePlan(ctx context.Context, userID string, planID string, name string) (Plan, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Plan{}, err
	}
	defer tx.Rollback(ctx)
	source, err := getPlan(ctx, tx, userID, planID)
	if err != nil {
		return Plan{}, err
	}
	var plan Plan
	err = tx.QueryRow(ctx, `
		INSERT INTO plans (user_id, organization_id, name, sport, template, plan_json)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id::text, user_id::text, organization_id::text, name, sport, template, plan_json, lock_version, created_at, updated_at
	`, userID, source.OrganizationID, name, source.Sport, source.Template, source.PlanJSON).Scan(&plan.ID, &plan.UserID, &plan.OrganizationID, &plan.Name, &plan.Sport, &plan.Template, &plan.PlanJSON, &plan.LockVersion, &plan.CreatedAt, &plan.UpdatedAt)
	if err != nil {
		return Plan{}, err
	}
	if err := insertPlanVersion(ctx, tx, plan); err != nil {
		return Plan{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Plan{}, err
	}
	return plan, nil
}

func (s *PostgresStore) CreatePlanShare(ctx context.Context, userID string, planID string, tokenHash string) (PlanShare, error) {
	var share PlanShare
	err := s.pool.QueryRow(ctx, `
		INSERT INTO plan_shares (plan_id, created_by_user_id, token_hash)
		SELECT plans.id, $2, $3
		FROM plans
		JOIN organization_members ON organization_members.organization_id = plans.organization_id
		WHERE plans.id = $1 AND organization_members.user_id = $2
		RETURNING id::text, plan_id::text, token_hash, created_at
	`, planID, userID, tokenHash).Scan(&share.ID, &share.PlanID, &share.TokenHash, &share.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return PlanShare{}, ErrNotFound
	}
	return share, err
}

func (s *PostgresStore) GetSharedPlan(ctx context.Context, tokenHash string) (Plan, error) {
	var plan Plan
	err := s.pool.QueryRow(ctx, `
		SELECT plans.id::text, plans.user_id::text, plans.organization_id::text, plans.name, plans.sport, plans.template, plans.plan_json, plans.lock_version, plans.created_at, plans.updated_at
		FROM plan_shares
		JOIN plans ON plans.id = plan_shares.plan_id
		WHERE plan_shares.token_hash = $1 AND plan_shares.revoked_at IS NULL
	`, tokenHash).Scan(&plan.ID, &plan.UserID, &plan.OrganizationID, &plan.Name, &plan.Sport, &plan.Template, &plan.PlanJSON, &plan.LockVersion, &plan.CreatedAt, &plan.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Plan{}, ErrNotFound
	}
	return plan, err
}

func getPlan(ctx context.Context, q planQuerier, userID string, id string) (Plan, error) {
	var plan Plan
	err := q.QueryRow(ctx, `
		SELECT plans.id::text, plans.user_id::text, plans.organization_id::text, plans.name, plans.sport, plans.template, plans.plan_json, plans.lock_version, plans.created_at, plans.updated_at
		FROM plans
		JOIN organization_members ON organization_members.organization_id = plans.organization_id
		WHERE plans.id = $1 AND organization_members.user_id = $2
	`, id, userID).Scan(&plan.ID, &plan.UserID, &plan.OrganizationID, &plan.Name, &plan.Sport, &plan.Template, &plan.PlanJSON, &plan.LockVersion, &plan.CreatedAt, &plan.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Plan{}, ErrNotFound
	}
	return plan, err
}

func insertPlanVersion(ctx context.Context, q planQuerier, plan Plan) error {
	var id string
	return q.QueryRow(ctx, `
		INSERT INTO plan_versions (plan_id, user_id, name, sport, template, plan_json, lock_version)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`, plan.ID, plan.UserID, plan.Name, plan.Sport, plan.Template, plan.PlanJSON, plan.LockVersion).Scan(&id)
}

func createOrganization(ctx context.Context, q planQuerier, userID string, name string) (Organization, error) {
	var organization Organization
	err := q.QueryRow(ctx, `
		WITH created AS (
			INSERT INTO organizations (name)
			VALUES ($2)
			RETURNING id, name, created_at
		),
		member AS (
			INSERT INTO organization_members (organization_id, user_id, role)
			SELECT id, $1, 'owner'
			FROM created
		)
		SELECT id::text, name, 'owner' AS role, created_at
		FROM created
	`, userID, name).Scan(&organization.ID, &organization.Name, &organization.Role, &organization.CreatedAt)
	return organization, err
}

func defaultOrganizationID(ctx context.Context, q planQuerier, userID string) (string, error) {
	var organizationID string
	err := q.QueryRow(ctx, `
		SELECT organization_id::text
		FROM organization_members
		WHERE user_id = $1
		ORDER BY created_at
		LIMIT 1
	`, userID).Scan(&organizationID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	return organizationID, err
}

func isOrganizationMember(ctx context.Context, q planQuerier, userID string, organizationID string) (bool, error) {
	var exists bool
	err := q.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM organization_members
			WHERE organization_id = $1 AND user_id = $2
		)
	`, organizationID, userID).Scan(&exists)
	return exists, err
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
