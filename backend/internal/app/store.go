package app

import (
	"context"
	"errors"
	"time"
)

var (
	ErrNotFound = errors.New("not found")
	ErrConflict = errors.New("conflict")
)

type Store interface {
	Ping(context.Context) error
	Close()

	CreateUser(ctx context.Context, email string, passwordHash string) (User, error)
	GetUserByEmail(ctx context.Context, email string) (User, error)
	GetUserByID(ctx context.Context, id string) (User, error)

	CreateSession(ctx context.Context, userID string, tokenHash string, expiresAt time.Time) (Session, error)
	GetSessionByTokenHash(ctx context.Context, tokenHash string) (Session, error)
	DeleteSession(ctx context.Context, tokenHash string) error
	DeleteExpiredSessions(ctx context.Context, now time.Time) error

	ListPlans(ctx context.Context, userID string) ([]Plan, error)
	CreatePlan(ctx context.Context, userID string, input PlanInput) (Plan, error)
	GetPlan(ctx context.Context, userID string, id string) (Plan, error)
	UpdatePlan(ctx context.Context, userID string, id string, input PlanInput) (Plan, error)
	DeletePlan(ctx context.Context, userID string, id string) error
}
