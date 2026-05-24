package app

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthCheck(t *testing.T) {
	store := NewMemoryStore()
	handler := newTestHandler(store)

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", res.Code, res.Body.String())
	}

	store.pingErr = errors.New("database down")
	req = httptest.NewRequest(http.MethodGet, "/healthz", nil)
	res = httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d: %s", res.Code, res.Body.String())
	}
}

func TestRegisterMeAndLogoutSessionFlow(t *testing.T) {
	store := NewMemoryStore()
	handler := newTestHandler(store)

	res := performJSON(handler, http.MethodPost, "/api/auth/register", `{"email":"Coach@example.com","password":"short"}`, nil)
	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected bad password to return 400, got %d", res.Code)
	}

	res = performJSON(handler, http.MethodPost, "/api/auth/register", `{"email":"Coach@example.com","password":"strong-password"}`, nil)
	if res.Code != http.StatusCreated {
		t.Fatalf("expected register 201, got %d: %s", res.Code, res.Body.String())
	}
	cookie := findSessionCookie(t, res.Result())
	if !cookie.HttpOnly {
		t.Fatal("expected session cookie to be HttpOnly")
	}

	res = performJSON(handler, http.MethodGet, "/api/auth/me", "", cookie)
	if res.Code != http.StatusOK {
		t.Fatalf("expected me 200, got %d: %s", res.Code, res.Body.String())
	}
	var body struct {
		User User `json:"user"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode me response: %v", err)
	}
	if body.User.Email != "coach@example.com" {
		t.Fatalf("expected normalized email, got %q", body.User.Email)
	}

	csrf := fetchCSRFToken(t, handler, cookie)
	res = performJSONWithHeaders(handler, http.MethodPost, "/api/auth/logout", `{}`, cookie, map[string]string{"X-CSRF-Token": csrf})
	if res.Code != http.StatusNoContent {
		t.Fatalf("expected logout 204, got %d: %s", res.Code, res.Body.String())
	}

	res = performJSON(handler, http.MethodGet, "/api/auth/me", "", cookie)
	if res.Code != http.StatusUnauthorized {
		t.Fatalf("expected logged out session to return 401, got %d", res.Code)
	}
}

func TestLoginRejectsBadPassword(t *testing.T) {
	store := NewMemoryStore()
	handler := newTestHandler(store)

	res := performJSON(handler, http.MethodPost, "/api/auth/register", `{"email":"coach@example.com","password":"strong-password"}`, nil)
	if res.Code != http.StatusCreated {
		t.Fatalf("expected register 201, got %d", res.Code)
	}

	res = performJSON(handler, http.MethodPost, "/api/auth/login", `{"email":"coach@example.com","password":"wrong-password"}`, nil)
	if res.Code != http.StatusUnauthorized {
		t.Fatalf("expected bad login 401, got %d", res.Code)
	}

	res = performJSON(handler, http.MethodPost, "/api/auth/login", `{"email":"coach@example.com","password":"strong-password"}`, nil)
	if res.Code != http.StatusOK {
		t.Fatalf("expected login 200, got %d: %s", res.Code, res.Body.String())
	}
	findSessionCookie(t, res.Result())
}

func TestPlansRequireAuthenticationAndValidateInput(t *testing.T) {
	store := NewMemoryStore()
	handler := newTestHandler(store)

	res := performJSON(handler, http.MethodGet, "/api/plans", "", nil)
	if res.Code != http.StatusUnauthorized {
		t.Fatalf("expected unauthenticated list 401, got %d", res.Code)
	}

	cookie := registerUser(t, handler, "coach@example.com")
	csrf := fetchCSRFToken(t, handler, cookie)
	res = performJSONWithHeaders(handler, http.MethodPost, "/api/plans", `{"name":"","sport":"football","template":"weekly","plan_json":{}}`, cookie, map[string]string{"X-CSRF-Token": csrf})
	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected missing plan name 400, got %d", res.Code)
	}

	res = performJSONWithHeaders(handler, http.MethodPost, "/api/plans", `{"name":"Week 1","sport":"football","template":"weekly"}`, cookie, map[string]string{"X-CSRF-Token": csrf})
	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected missing plan_json 400, got %d", res.Code)
	}
}

func TestPlanOwnershipCRUD(t *testing.T) {
	store := NewMemoryStore()
	handler := newTestHandler(store)
	coachA := registerUser(t, handler, "a@example.com")
	coachB := registerUser(t, handler, "b@example.com")
	csrfA := fetchCSRFToken(t, handler, coachA)
	csrfB := fetchCSRFToken(t, handler, coachB)

	createBody := `{"name":"Week 1","sport":"football","template":"weekly","plan_json":{"days":[]}}`
	res := performJSONWithHeaders(handler, http.MethodPost, "/api/plans", createBody, coachA, map[string]string{"X-CSRF-Token": csrfA})
	if res.Code != http.StatusCreated {
		t.Fatalf("expected create 201, got %d: %s", res.Code, res.Body.String())
	}

	plan := decodePlan(t, res.Body.Bytes())
	if plan.ID == "" {
		t.Fatal("expected created plan id")
	}

	res = performJSON(handler, http.MethodGet, "/api/plans/"+plan.ID, "", coachB)
	if res.Code != http.StatusNotFound {
		t.Fatalf("expected cross-user get 404, got %d", res.Code)
	}

	updateBody := `{"name":"Stolen","sport":"football","template":"weekly","plan_json":{"days":[1]}}`
	res = performJSONWithHeaders(handler, http.MethodPut, "/api/plans/"+plan.ID, updateBody, coachB, map[string]string{"X-CSRF-Token": csrfB})
	if res.Code != http.StatusNotFound {
		t.Fatalf("expected cross-user update 404, got %d", res.Code)
	}

	res = performJSONWithHeaders(handler, http.MethodDelete, "/api/plans/"+plan.ID, "", coachB, map[string]string{"X-CSRF-Token": csrfB})
	if res.Code != http.StatusNotFound {
		t.Fatalf("expected cross-user delete 404, got %d", res.Code)
	}

	updateBody = `{"name":"Week 1 Updated","sport":"rugby","template":"microcycle","plan_json":{"days":[1]}}`
	res = performJSONWithHeaders(handler, http.MethodPut, "/api/plans/"+plan.ID, updateBody, coachA, map[string]string{"X-CSRF-Token": csrfA})
	if res.Code != http.StatusOK {
		t.Fatalf("expected owner update 200, got %d: %s", res.Code, res.Body.String())
	}
	updated := decodePlan(t, res.Body.Bytes())
	if updated.Name != "Week 1 Updated" || updated.Sport != "rugby" {
		t.Fatalf("unexpected updated plan: %+v", updated)
	}

	res = performJSON(handler, http.MethodGet, "/api/plans", "", coachB)
	if res.Code != http.StatusOK {
		t.Fatalf("expected other user list 200, got %d", res.Code)
	}
	var listBody struct {
		Plans []Plan `json:"plans"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &listBody); err != nil {
		t.Fatalf("decode list response: %v", err)
	}
	if len(listBody.Plans) != 0 {
		t.Fatalf("expected other user to have no plans, got %d", len(listBody.Plans))
	}

	res = performJSONWithHeaders(handler, http.MethodDelete, "/api/plans/"+plan.ID, "", coachA, map[string]string{"X-CSRF-Token": csrfA})
	if res.Code != http.StatusNoContent {
		t.Fatalf("expected owner delete 204, got %d: %s", res.Code, res.Body.String())
	}

	res = performJSON(handler, http.MethodGet, "/api/plans/"+plan.ID, "", coachA)
	if res.Code != http.StatusNotFound {
		t.Fatalf("expected deleted plan 404, got %d", res.Code)
	}
}

func TestCORSAllowsConfiguredOriginOnly(t *testing.T) {
	store := NewMemoryStore()
	handler := newTestHandler(store)

	req := httptest.NewRequest(http.MethodOptions, "/api/plans", nil)
	req.Header.Set("Origin", "http://localhost:4200")
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusNoContent {
		t.Fatalf("expected preflight 204, got %d", res.Code)
	}
	if got := res.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:4200" {
		t.Fatalf("expected allowed origin header, got %q", got)
	}

	req = httptest.NewRequest(http.MethodOptions, "/api/plans", nil)
	req.Header.Set("Origin", "https://evil.example")
	res = httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if got := res.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("expected disallowed origin to get no CORS header, got %q", got)
	}
}

func TestProductionCookieSupportsCredentialedCrossOriginRequests(t *testing.T) {
	store := NewMemoryStore()
	cfg := Config{
		SessionSecret:  "test-session-secret",
		AllowedOrigins: []string{"https://planner.example"},
		Env:            "production",
		CookieSecure:   true,
	}
	handler := NewServer(cfg, store).Handler()

	res := performJSON(handler, http.MethodPost, "/api/auth/register", `{"email":"coach@example.com","password":"strong-password"}`, nil)
	if res.Code != http.StatusCreated {
		t.Fatalf("expected register 201, got %d: %s", res.Code, res.Body.String())
	}

	cookie := findSessionCookie(t, res.Result())
	if !cookie.Secure {
		t.Fatal("expected production session cookie to be Secure")
	}
	if cookie.SameSite != http.SameSiteNoneMode {
		t.Fatalf("expected SameSite=None for cross-origin production auth, got %v", cookie.SameSite)
	}
}

func TestMutatingAuthenticatedRoutesRequireCSRFToken(t *testing.T) {
	store := NewMemoryStore()
	handler := newTestHandler(store)
	cookie := registerUser(t, handler, "csrf@example.com")

	res := performJSON(handler, http.MethodPost, "/api/plans", `{"name":"Week 1","sport":"football","template":"gameFriday","plan_json":{"days":[]}}`, cookie)
	if res.Code != http.StatusForbidden {
		t.Fatalf("expected missing CSRF token to return 403, got %d: %s", res.Code, res.Body.String())
	}

	csrf := fetchCSRFToken(t, handler, cookie)
	res = performJSONWithHeaders(
		handler,
		http.MethodPost,
		"/api/plans",
		`{"name":"Week 1","sport":"football","template":"gameFriday","plan_json":{"days":[]}}`,
		cookie,
		map[string]string{"X-CSRF-Token": csrf},
	)
	if res.Code != http.StatusCreated {
		t.Fatalf("expected CSRF-authorized create 201, got %d: %s", res.Code, res.Body.String())
	}
}

func TestLoginRateLimitRejectsRepeatedFailures(t *testing.T) {
	store := NewMemoryStore()
	handler := newTestHandler(store)
	_ = registerUser(t, handler, "limit@example.com")

	for i := 0; i < 5; i++ {
		res := performJSON(handler, http.MethodPost, "/api/auth/login", `{"email":"limit@example.com","password":"wrong-password"}`, nil)
		if res.Code != http.StatusUnauthorized {
			t.Fatalf("expected bad login %d to return 401, got %d", i+1, res.Code)
		}
	}

	res := performJSON(handler, http.MethodPost, "/api/auth/login", `{"email":"limit@example.com","password":"wrong-password"}`, nil)
	if res.Code != http.StatusTooManyRequests {
		t.Fatalf("expected repeated bad login to return 429, got %d", res.Code)
	}
}

func TestPasswordResetFlowUpdatesPassword(t *testing.T) {
	store := NewMemoryStore()
	handler := newTestHandler(store)
	_ = registerUser(t, handler, "reset@example.com")

	res := performJSON(handler, http.MethodPost, "/api/auth/password-reset/request", `{"email":"reset@example.com"}`, nil)
	if res.Code != http.StatusOK {
		t.Fatalf("expected reset request 200 in test env, got %d: %s", res.Code, res.Body.String())
	}
	var resetBody struct {
		ResetToken string `json:"reset_token"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &resetBody); err != nil {
		t.Fatalf("decode reset response: %v", err)
	}
	if resetBody.ResetToken == "" {
		t.Fatal("expected test reset response to include reset token")
	}

	res = performJSON(handler, http.MethodPost, "/api/auth/password-reset/complete", `{"token":"`+resetBody.ResetToken+`","password":"new-strong-password"}`, nil)
	if res.Code != http.StatusNoContent {
		t.Fatalf("expected reset complete 204, got %d: %s", res.Code, res.Body.String())
	}

	res = performJSON(handler, http.MethodPost, "/api/auth/login", `{"email":"reset@example.com","password":"new-strong-password"}`, nil)
	if res.Code != http.StatusOK {
		t.Fatalf("expected login with reset password 200, got %d: %s", res.Code, res.Body.String())
	}
}

func newTestHandler(store Store) http.Handler {
	cfg := Config{
		SessionSecret:  "test-session-secret",
		AllowedOrigins: []string{"http://localhost:4200"},
		Env:            "test",
	}
	return NewServer(cfg, store).Handler()
}

func registerUser(t *testing.T, handler http.Handler, email string) *http.Cookie {
	t.Helper()
	body := `{"email":"` + email + `","password":"strong-password"}`
	res := performJSON(handler, http.MethodPost, "/api/auth/register", body, nil)
	if res.Code != http.StatusCreated {
		t.Fatalf("expected register 201 for %s, got %d: %s", email, res.Code, res.Body.String())
	}
	return findSessionCookie(t, res.Result())
}

func performJSON(handler http.Handler, method string, path string, body string, cookie *http.Cookie) *httptest.ResponseRecorder {
	return performJSONWithHeaders(handler, method, path, body, cookie, nil)
}

func performJSONWithHeaders(handler http.Handler, method string, path string, body string, cookie *http.Cookie, headers map[string]string) *httptest.ResponseRecorder {
	var requestBody *bytes.Reader
	if body == "" {
		requestBody = bytes.NewReader(nil)
	} else {
		requestBody = bytes.NewReader([]byte(body))
	}
	req := httptest.NewRequest(method, path, requestBody)
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	if cookie != nil {
		req.AddCookie(cookie)
	}
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	return res
}

func fetchCSRFToken(t *testing.T, handler http.Handler, cookie *http.Cookie) string {
	t.Helper()
	res := performJSON(handler, http.MethodGet, "/api/auth/csrf", "", cookie)
	if res.Code != http.StatusOK {
		t.Fatalf("expected csrf 200, got %d: %s", res.Code, res.Body.String())
	}
	var body struct {
		CSRFToken string `json:"csrf_token"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode csrf response: %v", err)
	}
	if body.CSRFToken == "" {
		t.Fatal("expected csrf token")
	}
	return body.CSRFToken
}

func findSessionCookie(t *testing.T, res *http.Response) *http.Cookie {
	t.Helper()
	for _, cookie := range res.Cookies() {
		if cookie.Name == sessionCookieName {
			return cookie
		}
	}
	t.Fatalf("missing %s cookie", sessionCookieName)
	return nil
}

func decodePlan(t *testing.T, body []byte) Plan {
	t.Helper()
	var response struct {
		Plan Plan `json:"plan"`
	}
	if err := json.Unmarshal(body, &response); err != nil {
		t.Fatalf("decode plan response: %v", err)
	}
	return response.Plan
}
