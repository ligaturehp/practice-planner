package app

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"sort"
	"strings"
	"sync"
	"time"
)

type MemoryStore struct {
	mu       sync.RWMutex
	users    map[string]User
	emailIDs map[string]string
	sessions map[string]Session
	resets   map[string]PasswordResetToken
	plans    map[string]Plan
	pingErr  error
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		users:    map[string]User{},
		emailIDs: map[string]string{},
		sessions: map[string]Session{},
		resets:   map[string]PasswordResetToken{},
		plans:    map[string]Plan{},
	}
}

func (s *MemoryStore) Ping(context.Context) error {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.pingErr
}

func (s *MemoryStore) Close() {}

func (s *MemoryStore) CreateUser(_ context.Context, email string, passwordHash string) (User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	email = normalizeEmail(email)
	if _, ok := s.emailIDs[email]; ok {
		return User{}, ErrConflict
	}
	user := User{
		ID:           newID(),
		Email:        email,
		PasswordHash: passwordHash,
		CreatedAt:    time.Now().UTC(),
	}
	s.users[user.ID] = user
	s.emailIDs[email] = user.ID
	return user, nil
}

func (s *MemoryStore) GetUserByEmail(_ context.Context, email string) (User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	id, ok := s.emailIDs[normalizeEmail(email)]
	if !ok {
		return User{}, ErrNotFound
	}
	return s.users[id], nil
}

func (s *MemoryStore) GetUserByID(_ context.Context, id string) (User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	user, ok := s.users[id]
	if !ok {
		return User{}, ErrNotFound
	}
	return user, nil
}

func (s *MemoryStore) UpdateUserPassword(_ context.Context, id string, passwordHash string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	user, ok := s.users[id]
	if !ok {
		return ErrNotFound
	}
	user.PasswordHash = passwordHash
	s.users[id] = user
	return nil
}

func (s *MemoryStore) CreateSession(_ context.Context, userID string, tokenHash string, expiresAt time.Time) (Session, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	session := Session{
		ID:        newID(),
		UserID:    userID,
		TokenHash: tokenHash,
		ExpiresAt: expiresAt,
		CreatedAt: time.Now().UTC(),
	}
	s.sessions[tokenHash] = session
	return session, nil
}

func (s *MemoryStore) GetSessionByTokenHash(_ context.Context, tokenHash string) (Session, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	session, ok := s.sessions[tokenHash]
	if !ok {
		return Session{}, ErrNotFound
	}
	return session, nil
}

func (s *MemoryStore) DeleteSession(_ context.Context, tokenHash string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.sessions, tokenHash)
	return nil
}

func (s *MemoryStore) DeleteExpiredSessions(_ context.Context, now time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for tokenHash, session := range s.sessions {
		if !session.ExpiresAt.After(now) {
			delete(s.sessions, tokenHash)
		}
	}
	return nil
}

func (s *MemoryStore) CreatePasswordResetToken(_ context.Context, userID string, tokenHash string, expiresAt time.Time) (PasswordResetToken, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	reset := PasswordResetToken{
		ID:        newID(),
		UserID:    userID,
		TokenHash: tokenHash,
		ExpiresAt: expiresAt,
		CreatedAt: time.Now().UTC(),
	}
	s.resets[tokenHash] = reset
	return reset, nil
}

func (s *MemoryStore) GetPasswordResetToken(_ context.Context, tokenHash string) (PasswordResetToken, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	reset, ok := s.resets[tokenHash]
	if !ok {
		return PasswordResetToken{}, ErrNotFound
	}
	return reset, nil
}

func (s *MemoryStore) DeletePasswordResetToken(_ context.Context, tokenHash string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.resets, tokenHash)
	return nil
}

func (s *MemoryStore) ListPlans(_ context.Context, userID string) ([]Plan, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	plans := []Plan{}
	for _, plan := range s.plans {
		if plan.UserID == userID {
			plans = append(plans, plan)
		}
	}
	sort.Slice(plans, func(i, j int) bool {
		return plans[i].UpdatedAt.After(plans[j].UpdatedAt)
	})
	return plans, nil
}

func (s *MemoryStore) CreatePlan(_ context.Context, userID string, input PlanInput) (Plan, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	plan := Plan{
		ID:        newID(),
		UserID:    userID,
		Name:      input.Name,
		Sport:     input.Sport,
		Template:  input.Template,
		PlanJSON:  append([]byte(nil), input.PlanJSON...),
		CreatedAt: now,
		UpdatedAt: now,
	}
	s.plans[plan.ID] = plan
	return plan, nil
}

func (s *MemoryStore) GetPlan(_ context.Context, userID string, id string) (Plan, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	plan, ok := s.plans[id]
	if !ok || plan.UserID != userID {
		return Plan{}, ErrNotFound
	}
	return plan, nil
}

func (s *MemoryStore) UpdatePlan(_ context.Context, userID string, id string, input PlanInput) (Plan, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	plan, ok := s.plans[id]
	if !ok || plan.UserID != userID {
		return Plan{}, ErrNotFound
	}
	plan.Name = input.Name
	plan.Sport = input.Sport
	plan.Template = input.Template
	plan.PlanJSON = append([]byte(nil), input.PlanJSON...)
	plan.UpdatedAt = time.Now().UTC()
	s.plans[id] = plan
	return plan, nil
}

func (s *MemoryStore) DeletePlan(_ context.Context, userID string, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	plan, ok := s.plans[id]
	if !ok || plan.UserID != userID {
		return ErrNotFound
	}
	delete(s.plans, id)
	return nil
}

func newID() string {
	var raw [16]byte
	if _, err := rand.Read(raw[:]); err != nil {
		return strings.ReplaceAll(time.Now().UTC().Format(time.RFC3339Nano), ":", "")
	}
	return hex.EncodeToString(raw[:])
}
