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
	orgs     map[string]Organization
	members  map[string]map[string]Membership
	sessions map[string]Session
	resets   map[string]PasswordResetToken
	plans    map[string]Plan
	versions map[string][]PlanVersion
	shares   map[string]PlanShare
	pingErr  error
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		users:    map[string]User{},
		emailIDs: map[string]string{},
		orgs:     map[string]Organization{},
		members:  map[string]map[string]Membership{},
		sessions: map[string]Session{},
		resets:   map[string]PasswordResetToken{},
		plans:    map[string]Plan{},
		versions: map[string][]PlanVersion{},
		shares:   map[string]PlanShare{},
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
	org := Organization{
		ID:        newID(),
		Name:      "My Team",
		Role:      "owner",
		CreatedAt: time.Now().UTC(),
	}
	s.orgs[org.ID] = org
	s.members[org.ID] = map[string]Membership{
		user.ID: {
			OrganizationID: org.ID,
			UserID:         user.ID,
			Role:           "owner",
			CreatedAt:      org.CreatedAt,
		},
	}
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

func (s *MemoryStore) ListOrganizations(_ context.Context, userID string) ([]Organization, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	orgs := []Organization{}
	for orgID, orgMembers := range s.members {
		membership, ok := orgMembers[userID]
		if !ok {
			continue
		}
		org := s.orgs[orgID]
		org.Role = membership.Role
		orgs = append(orgs, org)
	}
	sort.Slice(orgs, func(i, j int) bool {
		return orgs[i].CreatedAt.Before(orgs[j].CreatedAt)
	})
	return orgs, nil
}

func (s *MemoryStore) CreateOrganization(_ context.Context, userID string, name string) (Organization, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	org := Organization{ID: newID(), Name: name, Role: "owner", CreatedAt: time.Now().UTC()}
	s.orgs[org.ID] = org
	s.members[org.ID] = map[string]Membership{
		userID: {OrganizationID: org.ID, UserID: userID, Role: "owner", CreatedAt: org.CreatedAt},
	}
	return org, nil
}

func (s *MemoryStore) AddOrganizationMember(_ context.Context, actorUserID string, organizationID string, email string, role string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	orgMembers, ok := s.members[organizationID]
	if !ok {
		return ErrNotFound
	}
	actor, ok := orgMembers[actorUserID]
	if !ok || actor.Role != "owner" {
		return ErrNotFound
	}
	userID, ok := s.emailIDs[normalizeEmail(email)]
	if !ok {
		return ErrNotFound
	}
	orgMembers[userID] = Membership{OrganizationID: organizationID, UserID: userID, Role: role, CreatedAt: time.Now().UTC()}
	return nil
}

func (s *MemoryStore) DefaultOrganizationID(_ context.Context, userID string) (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.defaultOrganizationIDLocked(userID)
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
	orgIDs := s.organizationIDsForUserLocked(userID)
	for _, plan := range s.plans {
		if plan.UserID == userID {
			plans = append(plans, plan)
			continue
		}
		if _, ok := orgIDs[plan.OrganizationID]; ok {
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
	orgID := input.OrganizationID
	if orgID == "" {
		var err error
		orgID, err = s.defaultOrganizationIDLocked(userID)
		if err != nil {
			return Plan{}, err
		}
	}
	if !s.isMemberLocked(userID, orgID) {
		return Plan{}, ErrNotFound
	}
	now := time.Now().UTC()
	plan := Plan{
		ID:             newID(),
		UserID:         userID,
		OrganizationID: orgID,
		Name:           input.Name,
		Sport:          input.Sport,
		Template:       input.Template,
		PlanJSON:       append([]byte(nil), input.PlanJSON...),
		LockVersion:    1,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	s.plans[plan.ID] = plan
	s.appendPlanVersion(plan)
	return plan, nil
}

func (s *MemoryStore) GetPlan(_ context.Context, userID string, id string) (Plan, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	plan, ok := s.plans[id]
	if !ok || (plan.UserID != userID && !s.isMemberLocked(userID, plan.OrganizationID)) {
		return Plan{}, ErrNotFound
	}
	return plan, nil
}

func (s *MemoryStore) UpdatePlan(_ context.Context, userID string, id string, input PlanInput) (Plan, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	plan, ok := s.plans[id]
	if !ok || (plan.UserID != userID && !s.isMemberLocked(userID, plan.OrganizationID)) {
		return Plan{}, ErrNotFound
	}
	if input.LockVersion == nil || *input.LockVersion != plan.LockVersion {
		return Plan{}, ErrConflict
	}
	plan.Name = input.Name
	plan.Sport = input.Sport
	plan.Template = input.Template
	plan.PlanJSON = append([]byte(nil), input.PlanJSON...)
	plan.LockVersion++
	plan.UpdatedAt = time.Now().UTC()
	s.plans[id] = plan
	s.appendPlanVersion(plan)
	return plan, nil
}

func (s *MemoryStore) DeletePlan(_ context.Context, userID string, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	plan, ok := s.plans[id]
	if !ok || (plan.UserID != userID && !s.isMemberLocked(userID, plan.OrganizationID)) {
		return ErrNotFound
	}
	delete(s.plans, id)
	delete(s.versions, id)
	return nil
}

func (s *MemoryStore) ListPlanVersions(_ context.Context, userID string, planID string) ([]PlanVersion, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	plan, ok := s.plans[planID]
	if !ok || (plan.UserID != userID && !s.isMemberLocked(userID, plan.OrganizationID)) {
		return nil, ErrNotFound
	}
	versions := append([]PlanVersion(nil), s.versions[planID]...)
	sort.Slice(versions, func(i, j int) bool {
		return versions[i].CreatedAt.After(versions[j].CreatedAt)
	})
	return versions, nil
}

func (s *MemoryStore) RestorePlanVersion(_ context.Context, userID string, planID string, versionID string) (Plan, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	plan, ok := s.plans[planID]
	if !ok || (plan.UserID != userID && !s.isMemberLocked(userID, plan.OrganizationID)) {
		return Plan{}, ErrNotFound
	}
	var version PlanVersion
	found := false
	for _, candidate := range s.versions[planID] {
		if candidate.ID == versionID {
			version = candidate
			found = true
			break
		}
	}
	if !found {
		return Plan{}, ErrNotFound
	}
	plan.Name = version.Name
	plan.Sport = version.Sport
	plan.Template = version.Template
	plan.PlanJSON = append([]byte(nil), version.PlanJSON...)
	plan.LockVersion++
	plan.UpdatedAt = time.Now().UTC()
	s.plans[planID] = plan
	s.appendPlanVersion(plan)
	return plan, nil
}

func (s *MemoryStore) DuplicatePlan(_ context.Context, userID string, planID string, name string) (Plan, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	source, ok := s.plans[planID]
	if !ok || (source.UserID != userID && !s.isMemberLocked(userID, source.OrganizationID)) {
		return Plan{}, ErrNotFound
	}
	now := time.Now().UTC()
	plan := Plan{
		ID:             newID(),
		UserID:         userID,
		OrganizationID: source.OrganizationID,
		Name:           name,
		Sport:          source.Sport,
		Template:       source.Template,
		PlanJSON:       append([]byte(nil), source.PlanJSON...),
		LockVersion:    1,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	s.plans[plan.ID] = plan
	s.appendPlanVersion(plan)
	return plan, nil
}

func (s *MemoryStore) CreatePlanShare(_ context.Context, userID string, planID string, tokenHash string) (PlanShare, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	plan, ok := s.plans[planID]
	if !ok || (plan.UserID != userID && !s.isMemberLocked(userID, plan.OrganizationID)) {
		return PlanShare{}, ErrNotFound
	}
	share := PlanShare{
		ID:        newID(),
		PlanID:    planID,
		TokenHash: tokenHash,
		CreatedAt: time.Now().UTC(),
	}
	s.shares[share.TokenHash] = share
	return share, nil
}

func (s *MemoryStore) GetSharedPlan(_ context.Context, tokenHash string) (Plan, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	share, ok := s.shares[tokenHash]
	if !ok {
		return Plan{}, ErrNotFound
	}
	plan, ok := s.plans[share.PlanID]
	if !ok {
		return Plan{}, ErrNotFound
	}
	return plan, nil
}

func (s *MemoryStore) appendPlanVersion(plan Plan) {
	version := PlanVersion{
		ID:          newID(),
		PlanID:      plan.ID,
		Name:        plan.Name,
		Sport:       plan.Sport,
		Template:    plan.Template,
		PlanJSON:    append([]byte(nil), plan.PlanJSON...),
		LockVersion: plan.LockVersion,
		CreatedAt:   time.Now().UTC(),
	}
	s.versions[plan.ID] = append(s.versions[plan.ID], version)
}

func (s *MemoryStore) organizationIDsForUserLocked(userID string) map[string]struct{} {
	orgIDs := map[string]struct{}{}
	for orgID, members := range s.members {
		if _, ok := members[userID]; ok {
			orgIDs[orgID] = struct{}{}
		}
	}
	return orgIDs
}

func (s *MemoryStore) defaultOrganizationIDLocked(userID string) (string, error) {
	for orgID, members := range s.members {
		if _, ok := members[userID]; ok {
			return orgID, nil
		}
	}
	return "", ErrNotFound
}

func (s *MemoryStore) isMemberLocked(userID string, organizationID string) bool {
	if organizationID == "" {
		return false
	}
	_, ok := s.members[organizationID][userID]
	return ok
}

func newID() string {
	var raw [16]byte
	if _, err := rand.Read(raw[:]); err != nil {
		return strings.ReplaceAll(time.Now().UTC().Format(time.RFC3339Nano), ":", "")
	}
	return hex.EncodeToString(raw[:])
}
