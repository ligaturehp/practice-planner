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
	var user User
	err := s.pool.QueryRow(ctx, `
		INSERT INTO users (email, password_hash)
		VALUES ($1, $2)
		RETURNING id::text, email, password_hash, created_at
	`, normalizeEmail(email), passwordHash).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt)
	if isUniqueViolation(err) {
		return User{}, ErrConflict
	}
	return user, err
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
		SELECT id::text, user_id::text, name, sport, template, plan_json, created_at, updated_at
		FROM plans
		WHERE user_id = $1
		ORDER BY updated_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	plans := []Plan{}
	for rows.Next() {
		var plan Plan
		if err := rows.Scan(&plan.ID, &plan.UserID, &plan.Name, &plan.Sport, &plan.Template, &plan.PlanJSON, &plan.CreatedAt, &plan.UpdatedAt); err != nil {
			return nil, err
		}
		plans = append(plans, plan)
	}
	return plans, rows.Err()
}

func (s *PostgresStore) CreatePlan(ctx context.Context, userID string, input PlanInput) (Plan, error) {
	var plan Plan
	err := s.pool.QueryRow(ctx, `
		INSERT INTO plans (user_id, name, sport, template, plan_json)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id::text, user_id::text, name, sport, template, plan_json, created_at, updated_at
	`, userID, input.Name, input.Sport, input.Template, input.PlanJSON).Scan(&plan.ID, &plan.UserID, &plan.Name, &plan.Sport, &plan.Template, &plan.PlanJSON, &plan.CreatedAt, &plan.UpdatedAt)
	return plan, err
}

func (s *PostgresStore) GetPlan(ctx context.Context, userID string, id string) (Plan, error) {
	var plan Plan
	err := s.pool.QueryRow(ctx, `
		SELECT id::text, user_id::text, name, sport, template, plan_json, created_at, updated_at
		FROM plans
		WHERE id = $1 AND user_id = $2
	`, id, userID).Scan(&plan.ID, &plan.UserID, &plan.Name, &plan.Sport, &plan.Template, &plan.PlanJSON, &plan.CreatedAt, &plan.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Plan{}, ErrNotFound
	}
	return plan, err
}

func (s *PostgresStore) UpdatePlan(ctx context.Context, userID string, id string, input PlanInput) (Plan, error) {
	var plan Plan
	err := s.pool.QueryRow(ctx, `
		UPDATE plans
		SET name = $3,
			sport = $4,
			template = $5,
			plan_json = $6,
			updated_at = now()
		WHERE id = $1 AND user_id = $2
		RETURNING id::text, user_id::text, name, sport, template, plan_json, created_at, updated_at
	`, id, userID, input.Name, input.Sport, input.Template, input.PlanJSON).Scan(&plan.ID, &plan.UserID, &plan.Name, &plan.Sport, &plan.Template, &plan.PlanJSON, &plan.CreatedAt, &plan.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Plan{}, ErrNotFound
	}
	return plan, err
}

func (s *PostgresStore) DeletePlan(ctx context.Context, userID string, id string) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM plans WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
