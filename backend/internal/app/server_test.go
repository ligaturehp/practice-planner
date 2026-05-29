package app

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
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

func TestRegisterDoesNotKeepUserWhenSessionCreationFails(t *testing.T) {
	store := &sessionFailingStore{MemoryStore: NewMemoryStore()}
	handler := newTestHandler(store)

	res := performJSON(handler, http.MethodPost, "/api/auth/register", `{"email":"partial@example.com","password":"strong-password"}`, nil)
	if res.Code != http.StatusInternalServerError {
		t.Fatalf("expected register failure 500, got %d: %s", res.Code, res.Body.String())
	}

	if _, err := store.GetUserByEmail(t.Context(), "partial@example.com"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected failed registration to leave no login-capable user, got err %v", err)
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

func TestUserPreferencesDefaultAndUpdate(t *testing.T) {
	store := NewMemoryStore()
	handler := newTestHandler(store)
	cookie := registerUser(t, handler, "preferences@example.com")

	res := performJSON(handler, http.MethodGet, "/api/profile/preferences", "", cookie)
	if res.Code != http.StatusOK {
		t.Fatalf("expected preferences 200, got %d: %s", res.Code, res.Body.String())
	}
	var body struct {
		Preferences UserPreferences `json:"preferences"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode preferences response: %v", err)
	}
	if body.Preferences.WeekOrder != "mondayFirst" {
		t.Fatalf("expected monday-first default, got %q", body.Preferences.WeekOrder)
	}

	csrf := fetchCSRFToken(t, handler, cookie)
	res = performJSONWithHeaders(handler, http.MethodPut, "/api/profile/preferences", `{"week_order":"sundayFirst"}`, cookie, map[string]string{"X-CSRF-Token": csrf})
	if res.Code != http.StatusOK {
		t.Fatalf("expected preferences update 200, got %d: %s", res.Code, res.Body.String())
	}
	if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode updated preferences response: %v", err)
	}
	if body.Preferences.WeekOrder != "sundayFirst" {
		t.Fatalf("expected sunday-first preference, got %q", body.Preferences.WeekOrder)
	}

	res = performJSONWithHeaders(handler, http.MethodPut, "/api/profile/preferences", `{"week_order":"custom"}`, cookie, map[string]string{"X-CSRF-Token": csrf})
	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected invalid preference 400, got %d", res.Code)
	}
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

	res = performJSONWithHeaders(handler, http.MethodPost, "/api/plans", planBody("Week 1", "football", "weekly", validPlanJSON(), nil), cookie, map[string]string{"X-CSRF-Token": csrf})
	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected invalid template 400, got %d", res.Code)
	}

	invalidPayload := `{"selectedDay":"mon","sport":"football","template":"gameFriday","days":[],"rowLabels":[],"grid":{},"blocks":{"mon":[{"id":"block-1","name":"Bad","category":"Contact","level":"High","minutes":-1,"demand":12,"tags":[],"exposures":[],"notes":""}]},"blockLabelPresets":[]}`
	res = performJSONWithHeaders(handler, http.MethodPost, "/api/plans", planBody("Week 1", "football", "gameFriday", invalidPayload, nil), cookie, map[string]string{"X-CSRF-Token": csrf})
	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected invalid planner block payload 400, got %d", res.Code)
	}
}

func TestPlanOwnershipCRUD(t *testing.T) {
	store := NewMemoryStore()
	handler := newTestHandler(store)
	coachA := registerUser(t, handler, "a@example.com")
	coachB := registerUser(t, handler, "b@example.com")
	csrfA := fetchCSRFToken(t, handler, coachA)
	csrfB := fetchCSRFToken(t, handler, coachB)

	createBody := planBody("Week 1", "football", "gameFriday", validPlanJSON(), nil)
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

	updateBody := planBody("Stolen", "football", "gameFriday", validPlanJSON(), &plan.LockVersion)
	res = performJSONWithHeaders(handler, http.MethodPut, "/api/plans/"+plan.ID, updateBody, coachB, map[string]string{"X-CSRF-Token": csrfB})
	if res.Code != http.StatusNotFound {
		t.Fatalf("expected cross-user update 404, got %d", res.Code)
	}

	res = performJSONWithHeaders(handler, http.MethodDelete, "/api/plans/"+plan.ID, "", coachB, map[string]string{"X-CSRF-Token": csrfB})
	if res.Code != http.StatusNotFound {
		t.Fatalf("expected cross-user delete 404, got %d", res.Code)
	}

	updateBody = planBody("Week 1 Updated", "rugby", "gameSaturday", validPlanJSONFor("rugby", "gameSaturday"), &plan.LockVersion)
	res = performJSONWithHeaders(handler, http.MethodPut, "/api/plans/"+plan.ID, updateBody, coachA, map[string]string{"X-CSRF-Token": csrfA})
	if res.Code != http.StatusOK {
		t.Fatalf("expected owner update 200, got %d: %s", res.Code, res.Body.String())
	}
	updated := decodePlan(t, res.Body.Bytes())
	if updated.Name != "Week 1 Updated" || updated.Sport != "rugby" {
		t.Fatalf("unexpected updated plan: %+v", updated)
	}
	if updated.LockVersion != plan.LockVersion+1 {
		t.Fatalf("expected lock version to increment from %d to %d, got %d", plan.LockVersion, plan.LockVersion+1, updated.LockVersion)
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

func TestPlanUpdateRejectsStaleLockVersion(t *testing.T) {
	store := NewMemoryStore()
	handler := newTestHandler(store)
	cookie := registerUser(t, handler, "lock@example.com")
	csrf := fetchCSRFToken(t, handler, cookie)

	res := performJSONWithHeaders(handler, http.MethodPost, "/api/plans", planBody("Week 1", "football", "gameFriday", validPlanJSON(), nil), cookie, map[string]string{"X-CSRF-Token": csrf})
	if res.Code != http.StatusCreated {
		t.Fatalf("expected create 201, got %d: %s", res.Code, res.Body.String())
	}
	plan := decodePlan(t, res.Body.Bytes())
	if plan.LockVersion != 1 {
		t.Fatalf("expected new plan lock version 1, got %d", plan.LockVersion)
	}

	res = performJSONWithHeaders(handler, http.MethodPut, "/api/plans/"+plan.ID, planBody("Week 1 Current", "football", "gameFriday", validPlanJSON(), &plan.LockVersion), cookie, map[string]string{"X-CSRF-Token": csrf})
	if res.Code != http.StatusOK {
		t.Fatalf("expected current lock update 200, got %d: %s", res.Code, res.Body.String())
	}
	updated := decodePlan(t, res.Body.Bytes())
	if updated.LockVersion != 2 {
		t.Fatalf("expected updated lock version 2, got %d", updated.LockVersion)
	}

	res = performJSONWithHeaders(handler, http.MethodPut, "/api/plans/"+plan.ID, planBody("Week 1 Stale", "football", "gameFriday", validPlanJSON(), &plan.LockVersion), cookie, map[string]string{"X-CSRF-Token": csrf})
	if res.Code != http.StatusConflict {
		t.Fatalf("expected stale lock version 409, got %d: %s", res.Code, res.Body.String())
	}
}

func TestPlanVersionsRestoreAndDuplicate(t *testing.T) {
	store := NewMemoryStore()
	handler := newTestHandler(store)
	cookie := registerUser(t, handler, "versions@example.com")
	csrf := fetchCSRFToken(t, handler, cookie)

	res := performJSONWithHeaders(handler, http.MethodPost, "/api/plans", planBody("Week 1", "football", "gameFriday", validPlanJSON(), nil), cookie, map[string]string{"X-CSRF-Token": csrf})
	if res.Code != http.StatusCreated {
		t.Fatalf("expected create 201, got %d: %s", res.Code, res.Body.String())
	}
	plan := decodePlan(t, res.Body.Bytes())
	res = performJSONWithHeaders(handler, http.MethodPut, "/api/plans/"+plan.ID, planBody("Week 1 Updated", "rugby", "gameSaturday", validPlanJSONFor("rugby", "gameSaturday"), &plan.LockVersion), cookie, map[string]string{"X-CSRF-Token": csrf})
	if res.Code != http.StatusOK {
		t.Fatalf("expected update 200, got %d: %s", res.Code, res.Body.String())
	}

	res = performJSON(handler, http.MethodGet, "/api/plans/"+plan.ID+"/versions", "", cookie)
	if res.Code != http.StatusOK {
		t.Fatalf("expected versions 200, got %d: %s", res.Code, res.Body.String())
	}
	var versionsBody struct {
		Versions []PlanVersion `json:"versions"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &versionsBody); err != nil {
		t.Fatalf("decode versions: %v", err)
	}
	if len(versionsBody.Versions) != 2 {
		t.Fatalf("expected create and update versions, got %d", len(versionsBody.Versions))
	}

	createVersionID := versionsBody.Versions[len(versionsBody.Versions)-1].ID
	res = performJSONWithHeaders(handler, http.MethodPost, "/api/plans/"+plan.ID+"/versions/"+createVersionID+"/restore", `{}`, cookie, map[string]string{"X-CSRF-Token": csrf})
	if res.Code != http.StatusOK {
		t.Fatalf("expected restore 200, got %d: %s", res.Code, res.Body.String())
	}
	restored := decodePlan(t, res.Body.Bytes())
	if restored.Name != "Week 1" || restored.Sport != "football" || restored.Template != "gameFriday" {
		t.Fatalf("unexpected restored plan: %+v", restored)
	}
	if restored.LockVersion != 3 {
		t.Fatalf("expected restore to increment lock version to 3, got %d", restored.LockVersion)
	}

	res = performJSONWithHeaders(handler, http.MethodPost, "/api/plans/"+plan.ID+"/duplicate", `{"name":"Week 2"}`, cookie, map[string]string{"X-CSRF-Token": csrf})
	if res.Code != http.StatusCreated {
		t.Fatalf("expected duplicate 201, got %d: %s", res.Code, res.Body.String())
	}
	duplicate := decodePlan(t, res.Body.Bytes())
	if duplicate.ID == plan.ID || duplicate.Name != "Week 2" || duplicate.LockVersion != 1 {
		t.Fatalf("unexpected duplicate plan: %+v", duplicate)
	}
}

func TestRegisterCreatesDefaultOrganization(t *testing.T) {
	store := NewMemoryStore()
	handler := newTestHandler(store)
	cookie := registerUser(t, handler, "team@example.com")

	res := performJSON(handler, http.MethodGet, "/api/organizations", "", cookie)
	if res.Code != http.StatusOK {
		t.Fatalf("expected organizations 200, got %d: %s", res.Code, res.Body.String())
	}
	var body struct {
		Organizations []Organization `json:"organizations"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode organizations: %v", err)
	}
	if len(body.Organizations) != 1 || body.Organizations[0].Role != "owner" {
		t.Fatalf("expected default owner organization, got %+v", body.Organizations)
	}
}

func TestOrganizationMemberCanAccessOrganizationPlans(t *testing.T) {
	store := NewMemoryStore()
	handler := newTestHandler(store)
	owner := registerUser(t, handler, "owner@example.com")
	member := registerUser(t, handler, "member@example.com")
	ownerCSRF := fetchCSRFToken(t, handler, owner)

	createOrg := performJSONWithHeaders(handler, http.MethodPost, "/api/organizations", `{"name":"Varsity Staff"}`, owner, map[string]string{"X-CSRF-Token": ownerCSRF})
	if createOrg.Code != http.StatusCreated {
		t.Fatalf("expected create org 201, got %d: %s", createOrg.Code, createOrg.Body.String())
	}
	org := decodeOrganization(t, createOrg.Body.Bytes())

	addMember := performJSONWithHeaders(handler, http.MethodPost, "/api/organizations/"+org.ID+"/members", `{"email":"member@example.com","role":"member"}`, owner, map[string]string{"X-CSRF-Token": ownerCSRF})
	if addMember.Code != http.StatusNoContent {
		t.Fatalf("expected add member 204, got %d: %s", addMember.Code, addMember.Body.String())
	}

	res := performJSONWithHeaders(handler, http.MethodPost, "/api/plans", planBodyWithOrg("Shared Week", "football", "gameFriday", validPlanJSON(), org.ID, nil), owner, map[string]string{"X-CSRF-Token": ownerCSRF})
	if res.Code != http.StatusCreated {
		t.Fatalf("expected owner create plan 201, got %d: %s", res.Code, res.Body.String())
	}
	plan := decodePlan(t, res.Body.Bytes())

	res = performJSON(handler, http.MethodGet, "/api/plans/"+plan.ID, "", member)
	if res.Code != http.StatusOK {
		t.Fatalf("expected org member get 200, got %d: %s", res.Code, res.Body.String())
	}
	memberPlan := decodePlan(t, res.Body.Bytes())
	if memberPlan.OrganizationID != org.ID {
		t.Fatalf("expected organization-scoped plan, got %+v", memberPlan)
	}
}

func TestPlanShareLinksExposeReadOnlyPlan(t *testing.T) {
	store := NewMemoryStore()
	handler := newTestHandler(store)
	owner := registerUser(t, handler, "share-owner@example.com")
	other := registerUser(t, handler, "share-other@example.com")
	csrf := fetchCSRFToken(t, handler, owner)

	res := performJSONWithHeaders(handler, http.MethodPost, "/api/plans", planBody("Shared Week", "football", "gameFriday", validPlanJSON(), nil), owner, map[string]string{"X-CSRF-Token": csrf})
	if res.Code != http.StatusCreated {
		t.Fatalf("expected create plan 201, got %d: %s", res.Code, res.Body.String())
	}
	plan := decodePlan(t, res.Body.Bytes())

	res = performJSONWithHeaders(handler, http.MethodPost, "/api/plans/"+plan.ID+"/share-links", `{}`, other, map[string]string{"X-CSRF-Token": fetchCSRFToken(t, handler, other)})
	if res.Code != http.StatusNotFound {
		t.Fatalf("expected cross-user share create 404, got %d: %s", res.Code, res.Body.String())
	}

	res = performJSONWithHeaders(handler, http.MethodPost, "/api/plans/"+plan.ID+"/share-links", `{}`, owner, map[string]string{"X-CSRF-Token": csrf})
	if res.Code != http.StatusCreated {
		t.Fatalf("expected share link 201, got %d: %s", res.Code, res.Body.String())
	}
	share := decodePlanShare(t, res.Body.Bytes())
	if share.Token == "" || share.PlanID != plan.ID {
		t.Fatalf("unexpected share response: %+v", share)
	}

	res = performJSON(handler, http.MethodGet, "/api/shared-plans/"+share.Token, "", nil)
	if res.Code != http.StatusOK {
		t.Fatalf("expected public share lookup 200, got %d: %s", res.Code, res.Body.String())
	}
	sharedPlan := decodePlan(t, res.Body.Bytes())
	if sharedPlan.ID != plan.ID || sharedPlan.Name != "Shared Week" {
		t.Fatalf("unexpected shared plan: %+v", sharedPlan)
	}
}

func TestPlanCSVExportRequiresPlanAccess(t *testing.T) {
	store := NewMemoryStore()
	handler := newTestHandler(store)
	owner := registerUser(t, handler, "csv-owner@example.com")
	other := registerUser(t, handler, "csv-other@example.com")
	csrf := fetchCSRFToken(t, handler, owner)

	res := performJSONWithHeaders(handler, http.MethodPost, "/api/plans", planBody("CSV Week", "football", "gameFriday", validPlanJSON(), nil), owner, map[string]string{"X-CSRF-Token": csrf})
	if res.Code != http.StatusCreated {
		t.Fatalf("expected create plan 201, got %d: %s", res.Code, res.Body.String())
	}
	plan := decodePlan(t, res.Body.Bytes())

	res = performJSON(handler, http.MethodGet, "/api/plans/"+plan.ID+"/export.csv", "", other)
	if res.Code != http.StatusNotFound {
		t.Fatalf("expected cross-user csv export 404, got %d: %s", res.Code, res.Body.String())
	}

	res = performJSON(handler, http.MethodGet, "/api/plans/"+plan.ID+"/export.csv", "", owner)
	if res.Code != http.StatusOK {
		t.Fatalf("expected csv export 200, got %d: %s", res.Code, res.Body.String())
	}
	if got := res.Header().Get("Content-Type"); got != "text/csv; charset=utf-8" {
		t.Fatalf("expected csv content type, got %q", got)
	}
	body := res.Body.String()
	for _, expected := range []string{"plan_name,day,title,block_name,category,minutes,demand,au,exposures,tags,notes", "CSV Week,MON,Install,Contact period,Contact,28,9,252"} {
		if !strings.Contains(body, expected) {
			t.Fatalf("expected CSV to contain %q, got:\n%s", expected, body)
		}
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

	res := performJSON(handler, http.MethodPost, "/api/plans", planBody("Week 1", "football", "gameFriday", validPlanJSON(), nil), cookie)
	if res.Code != http.StatusForbidden {
		t.Fatalf("expected missing CSRF token to return 403, got %d: %s", res.Code, res.Body.String())
	}

	csrf := fetchCSRFToken(t, handler, cookie)
	res = performJSONWithHeaders(
		handler,
		http.MethodPost,
		"/api/plans",
		planBody("Week 1", "football", "gameFriday", validPlanJSON(), nil),
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

type sessionFailingStore struct {
	*MemoryStore
}

func (s *sessionFailingStore) CreateSession(context.Context, string, string, time.Time) (Session, error) {
	return Session{}, errors.New("session store unavailable")
}

func (s *sessionFailingStore) CreateUserWithSession(context.Context, string, string, string, time.Time) (User, error) {
	return User{}, errors.New("session store unavailable")
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

func planBody(name string, sport string, template string, planJSON string, lockVersion *int) string {
	return planBodyWithOrg(name, sport, template, planJSON, "", lockVersion)
}

func planBodyWithOrg(name string, sport string, template string, planJSON string, organizationID string, lockVersion *int) string {
	body := `{"name":` + quoteJSON(name) + `,"sport":` + quoteJSON(sport) + `,"template":` + quoteJSON(template) + `,"plan_json":` + planJSON
	if organizationID != "" {
		body += `,"organization_id":` + quoteJSON(organizationID)
	}
	if lockVersion != nil {
		body += `,"lock_version":` + quoteJSONInt(*lockVersion)
	}
	return body + `}`
}

func decodeOrganization(t *testing.T, body []byte) Organization {
	t.Helper()
	var response struct {
		Organization Organization `json:"organization"`
	}
	if err := json.Unmarshal(body, &response); err != nil {
		t.Fatalf("decode organization response: %v", err)
	}
	return response.Organization
}

func decodePlanShare(t *testing.T, body []byte) PlanShare {
	t.Helper()
	var response struct {
		Share PlanShare `json:"share"`
	}
	if err := json.Unmarshal(body, &response); err != nil {
		t.Fatalf("decode share response: %v", err)
	}
	return response.Share
}

func validPlanJSON() string {
	return validPlanJSONFor("football", "gameFriday")
}

func validPlanJSONFor(sport string, template string) string {
	return `{"selectedDay":"mon","sport":` + quoteJSON(sport) + `,"template":` + quoteJSON(template) + `,"days":[{"id":"sat","label":"SAT","title":"Recovery"},{"id":"sun","label":"SUN","title":"Active Recovery"},{"id":"mon","label":"MON","title":"Install"},{"id":"tue","label":"TUE","title":"Contact"},{"id":"wed","label":"WED","title":"Specials"},{"id":"thu","label":"THU","title":"Execution + Speed"},{"id":"fri","label":"FRI","title":"Game"}],"rowLabels":["Pace"],"grid":{"sat":["Rest"],"sun":["Easy"],"mon":["Moderate"],"tue":["Fast"],"wed":["Moderate"],"thu":["Fast"],"fri":["Max"]},"blocks":{"sat":[],"sun":[],"mon":[{"id":"block-1","name":"Contact period","category":"Contact","level":"High","minutes":28,"demand":9,"tags":["contact"],"exposures":["Accelerations/decelerations"],"notes":"Primary stressor"}],"tue":[],"wed":[],"thu":[],"fri":[]},"blockLabelPresets":[{"id":"preset-1","label":"Walk-through","category":"Tactical","level":"Low","minutes":25,"demand":3,"tags":["install"],"exposures":[],"notes":"Low strain"}]}`
}

func quoteJSON(value string) string {
	raw, _ := json.Marshal(value)
	return string(raw)
}

func quoteJSONInt(value int) string {
	raw, _ := json.Marshal(value)
	return string(raw)
}
