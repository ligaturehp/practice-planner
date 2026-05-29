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
	UpdateUserPassword(ctx context.Context, id string, passwordHash string) error
	ListOrganizations(ctx context.Context, userID string) ([]Organization, error)
	CreateOrganization(ctx context.Context, userID string, name string) (Organization, error)
	AddOrganizationMember(ctx context.Context, actorUserID string, organizationID string, email string, role string) error
	DefaultOrganizationID(ctx context.Context, userID string) (string, error)

	CreateSession(ctx context.Context, userID string, tokenHash string, expiresAt time.Time) (Session, error)
	GetSessionByTokenHash(ctx context.Context, tokenHash string) (Session, error)
	DeleteSession(ctx context.Context, tokenHash string) error
	DeleteExpiredSessions(ctx context.Context, now time.Time) error

	CreatePasswordResetToken(ctx context.Context, userID string, tokenHash string, expiresAt time.Time) (PasswordResetToken, error)
	GetPasswordResetToken(ctx context.Context, tokenHash string) (PasswordResetToken, error)
	DeletePasswordResetToken(ctx context.Context, tokenHash string) error

	ListPlans(ctx context.Context, userID string) ([]Plan, error)
	CreatePlan(ctx context.Context, userID string, input PlanInput) (Plan, error)
	GetPlan(ctx context.Context, userID string, id string) (Plan, error)
	UpdatePlan(ctx context.Context, userID string, id string, input PlanInput) (Plan, error)
	DeletePlan(ctx context.Context, userID string, id string) error
	ListPlanVersions(ctx context.Context, userID string, planID string) ([]PlanVersion, error)
	RestorePlanVersion(ctx context.Context, userID string, planID string, versionID string) (Plan, error)
	DuplicatePlan(ctx context.Context, userID string, planID string, name string) (Plan, error)
	CreatePlanShare(ctx context.Context, userID string, planID string, tokenHash string) (PlanShare, error)
	GetSharedPlan(ctx context.Context, tokenHash string) (Plan, error)
}
