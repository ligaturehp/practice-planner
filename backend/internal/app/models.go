package app

import (
	"encoding/json"
	"time"
)

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"created_at"`
}

type Session struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	TokenHash string    `json:"-"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

type Plan struct {
	ID        string          `json:"id"`
	UserID    string          `json:"-"`
	Name      string          `json:"name"`
	Sport     string          `json:"sport"`
	Template  string          `json:"template"`
	PlanJSON  json.RawMessage `json:"plan_json"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}

type PlanInput struct {
	Name     string          `json:"name"`
	Sport    string          `json:"sport"`
	Template string          `json:"template"`
	PlanJSON json.RawMessage `json:"plan_json"`
}
