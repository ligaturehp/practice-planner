package main

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

const appSupportFolder = "Practice Planner"

type SavedPlan struct {
	ID        string         `json:"id"`
	Name      string         `json:"name"`
	UpdatedAt string         `json:"updatedAt"`
	State     map[string]any `json:"state"`
}

type PlanService struct {
	db     *sql.DB
	dbPath string
}

func NewPlanService() (*PlanService, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return nil, fmt.Errorf("locate user config directory: %w", err)
	}

	dbDir := filepath.Join(configDir, appSupportFolder)
	if err := os.MkdirAll(dbDir, 0o755); err != nil {
		return nil, fmt.Errorf("create app support directory: %w", err)
	}

	return NewPlanServiceAt(filepath.Join(dbDir, "practice-planner.sqlite"))
}

func NewPlanServiceAt(dbPath string) (*PlanService, error) {
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("open sqlite database: %w", err)
	}
	db.SetMaxOpenConns(1)

	service := &PlanService{db: db, dbPath: dbPath}
	if err := service.migrate(context.Background()); err != nil {
		_ = db.Close()
		return nil, err
	}

	return service, nil
}

func (s *PlanService) close() error {
	if s == nil || s.db == nil {
		return nil
	}
	return s.db.Close()
}

func (s *PlanService) databasePath() string {
	return s.dbPath
}

func (s *PlanService) ListPlans() ([]SavedPlan, error) {
	rows, err := s.db.Query(`
		SELECT id, name, state_json, updated_at
		FROM plans
		ORDER BY updated_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("list plans: %w", err)
	}
	defer rows.Close()

	plans := []SavedPlan{}
	for rows.Next() {
		var plan SavedPlan
		var stateJSON string
		if err := rows.Scan(&plan.ID, &plan.Name, &stateJSON, &plan.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan plan: %w", err)
		}
		if err := json.Unmarshal([]byte(stateJSON), &plan.State); err != nil {
			return nil, fmt.Errorf("decode plan state: %w", err)
		}
		plans = append(plans, plan)
	}

	return plans, rows.Err()
}

func (s *PlanService) SavePlan(name string, state map[string]any) (SavedPlan, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		name = "Untitled weekly plan"
	}
	if state == nil {
		return SavedPlan{}, errors.New("plan state is required")
	}

	stateJSON, err := json.Marshal(state)
	if err != nil {
		return SavedPlan{}, fmt.Errorf("encode plan state: %w", err)
	}

	now := time.Now().UTC().Format(time.RFC3339)
	plan := SavedPlan{
		ID:        newPlanID(),
		Name:      name,
		UpdatedAt: now,
		State:     state,
	}

	_, err = s.db.Exec(`
		INSERT INTO plans (id, name, state_json, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)
	`, plan.ID, plan.Name, string(stateJSON), now, now)
	if err != nil {
		return SavedPlan{}, fmt.Errorf("save plan: %w", err)
	}

	return plan, nil
}

func (s *PlanService) DeletePlan(id string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return errors.New("plan id is required")
	}

	_, err := s.db.Exec(`DELETE FROM plans WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("delete plan: %w", err)
	}
	return nil
}

func (s *PlanService) migrate(ctx context.Context) error {
	statements := []string{
		`PRAGMA journal_mode = WAL`,
		`PRAGMA foreign_keys = ON`,
		`CREATE TABLE IF NOT EXISTS plans (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			state_json TEXT NOT NULL,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL
		)`,
		`CREATE INDEX IF NOT EXISTS plans_updated_idx ON plans (updated_at DESC)`,
	}

	for _, statement := range statements {
		if _, err := s.db.ExecContext(ctx, statement); err != nil {
			return fmt.Errorf("run sqlite migration: %w", err)
		}
	}
	return nil
}

func newPlanID() string {
	var bytes [16]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return fmt.Sprintf("plan-%d", time.Now().UnixNano())
	}
	return "plan-" + hex.EncodeToString(bytes[:])
}
