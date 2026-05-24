package app

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

type contextKey string

const userContextKey contextKey = "user"

type Server struct {
	cfg          Config
	store        Store
	allowOrigins map[string]struct{}
	now          func() time.Time
	limits       map[string]rateLimitEntry
	limitsMu     sync.Mutex
}

type rateLimitEntry struct {
	Count      int
	WindowEnds time.Time
}

func NewServer(cfg Config, store Store) *Server {
	allowOrigins := make(map[string]struct{}, len(cfg.AllowedOrigins))
	for _, origin := range cfg.AllowedOrigins {
		allowOrigins[origin] = struct{}{}
	}
	if cfg.Env == "" {
		cfg.Env = "development"
	}
	if cfg.Port == "" {
		cfg.Port = "8080"
	}
	return &Server{
		cfg:          cfg,
		store:        store,
		allowOrigins: allowOrigins,
		now:          time.Now,
		limits:       map[string]rateLimitEntry{},
	}
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", s.handleHealth)
	mux.HandleFunc("POST /api/auth/register", s.handleRegister)
	mux.HandleFunc("POST /api/auth/login", s.handleLogin)
	mux.HandleFunc("POST /api/auth/logout", s.requireUser(s.requireCSRF(s.handleLogout)))
	mux.HandleFunc("GET /api/auth/me", s.requireUser(s.handleMe))
	mux.HandleFunc("GET /api/auth/csrf", s.requireUser(s.handleCSRF))
	mux.HandleFunc("POST /api/auth/password-reset/request", s.handlePasswordResetRequest)
	mux.HandleFunc("POST /api/auth/password-reset/complete", s.handlePasswordResetComplete)
	mux.HandleFunc("GET /api/plans", s.requireUser(s.handleListPlans))
	mux.HandleFunc("POST /api/plans", s.requireUser(s.requireCSRF(s.handleCreatePlan)))
	mux.HandleFunc("GET /api/plans/{id}", s.requireUser(s.handleGetPlan))
	mux.HandleFunc("PUT /api/plans/{id}", s.requireUser(s.requireCSRF(s.handleUpdatePlan)))
	mux.HandleFunc("DELETE /api/plans/{id}", s.requireUser(s.requireCSRF(s.handleDeletePlan)))

	return s.cors(mux)
}

func (s *Server) requireCSRF(next func(http.ResponseWriter, *http.Request)) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		expected, ok := s.csrfTokenFromRequest(r)
		if !ok || subtle.ConstantTimeCompare([]byte(r.Header.Get("X-CSRF-Token")), []byte(expected)) != 1 {
			writeError(w, http.StatusForbidden, "valid CSRF token required")
			return
		}
		next(w, r)
	}
}

func (s *Server) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			if _, ok := s.allowOrigins[origin]; ok {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-CSRF-Token")
				w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
				w.Header().Set("Vary", "Origin")
			}
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) requireUser(next func(http.ResponseWriter, *http.Request)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := s.userFromRequest(r)
		if !ok {
			writeError(w, http.StatusUnauthorized, "authentication required")
			return
		}
		ctx := context.WithValue(r.Context(), userContextKey, user)
		next(w, r.WithContext(ctx))
	}
}

func (s *Server) userFromRequest(r *http.Request) (User, bool) {
	session, ok := s.sessionFromRequest(r)
	if !ok {
		return User{}, false
	}
	user, err := s.store.GetUserByID(r.Context(), session.UserID)
	if err != nil {
		return User{}, false
	}
	return user, true
}

func (s *Server) sessionFromRequest(r *http.Request) (Session, bool) {
	cookie, err := r.Cookie(sessionCookieName)
	if err != nil || cookie.Value == "" {
		return Session{}, false
	}
	tokenHash, err := hashSessionToken(s.cfg.SessionSecret, cookie.Value)
	if err != nil {
		return Session{}, false
	}
	session, err := s.store.GetSessionByTokenHash(r.Context(), tokenHash)
	if err != nil {
		return Session{}, false
	}
	if !session.ExpiresAt.After(s.now()) {
		_ = s.store.DeleteSession(r.Context(), tokenHash)
		return Session{}, false
	}
	return session, true
}

func (s *Server) csrfTokenFromRequest(r *http.Request) (string, bool) {
	session, ok := s.sessionFromRequest(r)
	if !ok {
		return "", false
	}
	token, err := hashSessionToken(s.cfg.SessionSecret, "csrf:"+session.TokenHash)
	if err != nil {
		return "", false
	}
	return token, true
}

func userFromContext(ctx context.Context) User {
	user, _ := ctx.Value(userContextKey).(User)
	return user
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	if err := s.store.Ping(r.Context()); err != nil {
		writeError(w, http.StatusServiceUnavailable, "database unavailable")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	email := normalizeEmail(req.Email)
	if !s.allowAuthAttempt(r, "register", email) {
		writeError(w, http.StatusTooManyRequests, "too many attempts")
		return
	}
	if !validEmail(email) || !validPassword(req.Password) {
		writeError(w, http.StatusBadRequest, "valid email and password of at least 8 characters are required")
		return
	}
	passwordHash, err := hashPassword(req.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not secure password")
		return
	}
	user, err := s.store.CreateUser(r.Context(), email, passwordHash)
	if errors.Is(err, ErrConflict) {
		writeError(w, http.StatusConflict, "email already registered")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create user")
		return
	}
	if !s.issueSession(w, r, user.ID) {
		return
	}
	writeJSON(w, http.StatusCreated, map[string]User{"user": user})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	email := normalizeEmail(req.Email)
	if !s.allowAuthAttempt(r, "login", email) {
		writeError(w, http.StatusTooManyRequests, "too many attempts")
		return
	}
	user, err := s.store.GetUserByEmail(r.Context(), email)
	if err != nil || !checkPassword(user.PasswordHash, req.Password) {
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}
	if !s.issueSession(w, r, user.ID) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]User{"user": user})
}

func (s *Server) handleCSRF(w http.ResponseWriter, r *http.Request) {
	token, ok := s.csrfTokenFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"csrf_token": token})
}

func (s *Server) handlePasswordResetRequest(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	email := normalizeEmail(req.Email)
	user, err := s.store.GetUserByEmail(r.Context(), email)
	if err != nil {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	token, err := newPasswordResetToken()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create reset token")
		return
	}
	tokenHash, err := hashSessionToken(s.cfg.SessionSecret, token)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create reset token")
		return
	}
	if _, err := s.store.CreatePasswordResetToken(r.Context(), user.ID, tokenHash, s.now().Add(passwordResetTTL)); err != nil {
		writeError(w, http.StatusInternalServerError, "could not create reset token")
		return
	}
	if s.cfg.Env == "test" || s.cfg.Env == "development" {
		writeJSON(w, http.StatusOK, map[string]string{"reset_token": token})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handlePasswordResetComplete(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if !validPassword(req.Password) {
		writeError(w, http.StatusBadRequest, "valid password of at least 8 characters is required")
		return
	}
	tokenHash, err := hashSessionToken(s.cfg.SessionSecret, req.Token)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid reset token")
		return
	}
	reset, err := s.store.GetPasswordResetToken(r.Context(), tokenHash)
	if err != nil || !reset.ExpiresAt.After(s.now()) {
		writeError(w, http.StatusBadRequest, "invalid reset token")
		return
	}
	passwordHash, err := hashPassword(req.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not secure password")
		return
	}
	if err := s.store.UpdateUserPassword(r.Context(), reset.UserID, passwordHash); err != nil {
		writeError(w, http.StatusInternalServerError, "could not update password")
		return
	}
	_ = s.store.DeletePasswordResetToken(r.Context(), tokenHash)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) allowAuthAttempt(r *http.Request, scope string, email string) bool {
	key := r.RemoteAddr + "|" + scope + "|" + email
	now := s.now()
	s.limitsMu.Lock()
	defer s.limitsMu.Unlock()
	entry := s.limits[key]
	if entry.WindowEnds.IsZero() || !entry.WindowEnds.After(now) {
		entry = rateLimitEntry{WindowEnds: now.Add(15 * time.Minute)}
	}
	entry.Count++
	s.limits[key] = entry
	return entry.Count <= 5
}

func (s *Server) issueSession(w http.ResponseWriter, r *http.Request, userID string) bool {
	token, err := newSessionToken()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create session")
		return false
	}
	tokenHash, err := hashSessionToken(s.cfg.SessionSecret, token)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create session")
		return false
	}
	expiresAt := s.now().Add(sessionTTL)
	if _, err := s.store.CreateSession(r.Context(), userID, tokenHash, expiresAt); err != nil {
		writeError(w, http.StatusInternalServerError, "could not create session")
		return false
	}
	http.SetCookie(w, s.sessionCookie(token, expiresAt))
	return true
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(sessionCookieName)
	if err == nil && cookie.Value != "" {
		if tokenHash, hashErr := hashSessionToken(s.cfg.SessionSecret, cookie.Value); hashErr == nil {
			_ = s.store.DeleteSession(r.Context(), tokenHash)
		}
	}
	http.SetCookie(w, s.expiredSessionCookie())
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]User{"user": userFromContext(r.Context())})
}

func (s *Server) handleListPlans(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	plans, err := s.store.ListPlans(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list plans")
		return
	}
	writeJSON(w, http.StatusOK, map[string][]Plan{"plans": plans})
}

func (s *Server) handleCreatePlan(w http.ResponseWriter, r *http.Request) {
	input, ok := readPlanInput(w, r)
	if !ok {
		return
	}
	user := userFromContext(r.Context())
	plan, err := s.store.CreatePlan(r.Context(), user.ID, input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create plan")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]Plan{"plan": plan})
}

func (s *Server) handleGetPlan(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	plan, err := s.store.GetPlan(r.Context(), user.ID, r.PathValue("id"))
	if errors.Is(err, ErrNotFound) {
		writeError(w, http.StatusNotFound, "plan not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not get plan")
		return
	}
	writeJSON(w, http.StatusOK, map[string]Plan{"plan": plan})
}

func (s *Server) handleUpdatePlan(w http.ResponseWriter, r *http.Request) {
	input, ok := readPlanInput(w, r)
	if !ok {
		return
	}
	user := userFromContext(r.Context())
	plan, err := s.store.UpdatePlan(r.Context(), user.ID, r.PathValue("id"), input)
	if errors.Is(err, ErrNotFound) {
		writeError(w, http.StatusNotFound, "plan not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update plan")
		return
	}
	writeJSON(w, http.StatusOK, map[string]Plan{"plan": plan})
}

func (s *Server) handleDeletePlan(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	if err := s.store.DeletePlan(r.Context(), user.ID, r.PathValue("id")); errors.Is(err, ErrNotFound) {
		writeError(w, http.StatusNotFound, "plan not found")
		return
	} else if err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete plan")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func readPlanInput(w http.ResponseWriter, r *http.Request) (PlanInput, bool) {
	var input PlanInput
	if !decodeJSON(w, r, &input) {
		return PlanInput{}, false
	}
	input.Name = strings.TrimSpace(input.Name)
	input.Sport = strings.TrimSpace(input.Sport)
	input.Template = strings.TrimSpace(input.Template)
	if input.Name == "" {
		writeError(w, http.StatusBadRequest, "plan name is required")
		return PlanInput{}, false
	}
	if len(input.PlanJSON) == 0 || !json.Valid(input.PlanJSON) {
		writeError(w, http.StatusBadRequest, "valid plan_json is required")
		return PlanInput{}, false
	}
	return input, true
}

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	defer r.Body.Close()
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	dec.DisallowUnknownFields()
	if err := dec.Decode(target); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return false
	}
	var extra any
	if err := dec.Decode(&extra); err != io.EOF {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return false
	}
	return true
}

func (s *Server) sessionCookie(value string, expiresAt time.Time) *http.Cookie {
	return &http.Cookie{
		Name:     sessionCookieName,
		Value:    value,
		Path:     "/",
		Expires:  expiresAt,
		MaxAge:   int(time.Until(expiresAt).Seconds()),
		HttpOnly: true,
		SameSite: s.sameSiteMode(),
		Secure:   s.cfg.CookieSecure,
	}
}

func (s *Server) expiredSessionCookie() *http.Cookie {
	return &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: s.sameSiteMode(),
		Secure:   s.cfg.CookieSecure,
	}
}

func (s *Server) sameSiteMode() http.SameSite {
	if s.cfg.CookieSecure {
		return http.SameSiteNoneMode
	}
	return http.SameSiteLaxMode
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
