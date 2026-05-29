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

type Organization struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Role      string    `json:"role,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type Membership struct {
	OrganizationID string    `json:"organization_id"`
	UserID         string    `json:"user_id"`
	Role           string    `json:"role"`
	CreatedAt      time.Time `json:"created_at"`
}

type Session struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	TokenHash string    `json:"-"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

type PasswordResetToken struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	TokenHash string    `json:"-"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

type UserPreferences struct {
	UserID    string    `json:"-"`
	WeekOrder string    `json:"week_order"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Plan struct {
	ID             string          `json:"id"`
	UserID         string          `json:"-"`
	OrganizationID string          `json:"organization_id"`
	Name           string          `json:"name"`
	Sport          string          `json:"sport"`
	Template       string          `json:"template"`
	PlanJSON       json.RawMessage `json:"plan_json"`
	LockVersion    int             `json:"lock_version"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
}

type PlanInput struct {
	Name           string          `json:"name"`
	OrganizationID string          `json:"organization_id,omitempty"`
	Sport          string          `json:"sport"`
	Template       string          `json:"template"`
	PlanJSON       json.RawMessage `json:"plan_json"`
	LockVersion    *int            `json:"lock_version,omitempty"`
}

type PlanVersion struct {
	ID          string          `json:"id"`
	PlanID      string          `json:"plan_id"`
	Name        string          `json:"name"`
	Sport       string          `json:"sport"`
	Template    string          `json:"template"`
	PlanJSON    json.RawMessage `json:"plan_json"`
	LockVersion int             `json:"lock_version"`
	CreatedAt   time.Time       `json:"created_at"`
}

type PlanShare struct {
	ID        string    `json:"id"`
	PlanID    string    `json:"plan_id"`
	Token     string    `json:"token,omitempty"`
	TokenHash string    `json:"-"`
	CreatedAt time.Time `json:"created_at"`
}
