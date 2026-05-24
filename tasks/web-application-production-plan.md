# Practice Planner Web Application Production Plan

Date: 2026-05-23

## Executive Judgment

Practice Planner is ready for private web testing with a trusted user, but it is not ready for broad web launch or paid accounts.

The current codebase has a useful Angular planning interface, a Go/Postgres backend with email/password auth, secure password hashing, server-side sessions, owner-scoped plan CRUD, and Railway deployment configuration. The main gap is that the active Angular app still behaves like a desktop/local planner: saves go through Wails bindings or browser local storage, not the web account API. The backend also needs security, schema, recovery, and operating controls before real user accounts are trusted.

## Current State

- Frontend: Angular planner UI with sport/template controls, weekly grid, day inspector, block dialog, label library, saved-plans drawer, and print/PDF action.
- Desktop path: Wails plus local SQLite remains supported.
- Backend: Go API with `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, and authenticated plan CRUD routes.
- Database: Postgres tables for `users`, `sessions`, and `plans`; plans are single-user owned and stored as opaque `jsonb`.
- Deployment: Railway configs exist for frontend, backend, and Postgres.
- Testing: Backend route tests and frontend unit tests exist; recent specialist checks passed `go test ./...` and `npm test -- --watch=false`.

## Go / No-Go

### Private Alpha: Go With Constraints

Use this for one trusted coach or a very small closed group if:

- The deployment is clearly labeled alpha.
- The user knows data recovery is limited.
- The app is free/manual access only.
- The owner is prepared to manually support account and data issues.

### Public Web Launch: No-Go

Do not broadly launch until these are complete:

- Angular account-backed save/load is wired to the backend.
- CSRF protection is added or frontend/backend are deployed same-site with safer cookies.
- Login/register rate limiting exists.
- Plan payloads are validated server-side.
- Password reset and support contact routing exist.
- Database backup and restore runbook is written and tested.
- Production build fails when required API environment variables are missing.
- CI runs frontend and backend tests before deploy.

## Critical Risks

1. The web frontend is not account-backed yet.
   The current saved-plan flow says plans are saved on this Mac and uses desktop bindings or `localStorage`. A web coach expects saved plans to follow their account across devices.

2. Cross-site cookie auth needs CSRF protection.
   Production cookies use `SameSite=None` for separate frontend/backend origins. CORS does not stop all cross-site state-changing requests.

3. The database is too user/blob oriented for a real team product.
   `plans.user_id` is the only ownership boundary, and `plan_json` is opaque. This blocks team staff roles, plan sharing, version history, reporting, and long-term migrations.

4. Account recovery is missing.
   Email/password auth without password reset, support routing, or account deletion/export is not operationally complete.

5. Ops guardrails are thin.
   Railway deploy configs exist, but there is no CI quality gate, backup/restore runbook, request logging, alerting, or production environment validation strong enough for public users.

## Recommended Product Direction

The strongest web product shape is a coach/team planning workspace:

- A coach creates or joins a team workspace.
- Plans are organized by week, sport, team/group, and status.
- Coaches can build a plan from a template, adjust workload, add blocks, and save automatically.
- Staff can review, comment, duplicate, export, or share a read-only version.
- The planner remains fast and spreadsheet-like on desktop, but tablet/mobile defaults to a day-first workflow.

Avoid building billing, admin panels, and deep analytics before the core coach workflow is reliable. The first production target should be: account-backed weekly plans with safe save/load, version recovery, export, and basic sharing.

## Target Architecture

### Hosting

Preferred simple path:

- Frontend: Cloudflare Pages, Netlify, GitHub Pages, or Railway static service.
- Backend API: Railway Go service.
- Database: Railway Postgres.
- Domains: `app.<domain>` for frontend and `api.<domain>` for API, or same-site routing if feasible.

If frontend and API remain separate origins, keep credentialed requests but add CSRF tokens/custom headers and strict origin checks. If same-site deployment is feasible, prefer safer cookie settings.

### Backend Services

- Go API remains a good fit.
- Keep server-side sessions for now.
- Add request logging, security middleware, rate limiting, and full HTTP timeouts.
- Add transactional writes for plan updates once versioning is introduced.

### Database

Move from single-user plan ownership to workspace ownership:

- `users`
- `organizations`
- `organization_memberships`
- `sessions`
- `plans`
- `plan_versions`
- `plan_templates`
- `plan_template_versions`
- `plan_shares`
- `audit_events`
- `exports`
- `imports`

Keep full `plan_json` snapshots for fast load/save, but add `schema_version`, week/date metadata, ownership, current version, status, and indexed fields needed for lists and reports.

### Email

Use a transactional email provider such as Resend or Postmark for:

- Password reset
- Email verification if abuse becomes a concern
- Support contact confirmation
- Share invitations later

### Billing

Leave billing out of the first alpha unless the product must be paid from day one. If paid access is required, use Stripe and add:

- Customers
- Subscriptions
- Entitlements
- Webhook signature verification
- Billing support workflow
- Access checks on plan APIs

## Security Roadmap

### Before Private Alpha

- Require production `ALLOWED_ORIGINS`; do not silently fall back to localhost in production.
- Require a strong `SESSION_SECRET`.
- Fail frontend production builds if `API_BASE_URL` is missing or still a placeholder.
- Add full server timeouts: read, write, idle, and read-header.

### Before Public Accounts

- Add CSRF protection for cookie-authenticated mutating routes.
- Add login/register rate limiting by IP and normalized email.
- Add password reset.
- Add server-side planner payload validation.
- Add structured audit events for auth and plan mutations.
- Add hardened static headers: content type options, referrer policy, frame protection, and a conservative CSP.

### Before Paid or Team Use

- Add organization roles and permission checks.
- Add share-token hashing and expiration.
- Add soft delete and restore.
- Add account export and deletion workflows.
- Add operational incident/support playbooks.

## UX / Feature Roadmap

### Phase 1: Solo Coach Web MVP

- Add account sign-in/register/logout UI.
- Connect Angular save/load/delete to the Go API using credentialed requests.
- Preserve guest/local draft mode only as a clearly labeled fallback.
- Add first-run setup: sport, game day, template, and week start date.
- Add explicit new blank plan and new from template actions.
- Add undo or confirmation for clear day, delete plan, and modal close with unsaved form data.
- Add action-rich empty states: add first block, save this week, load template.
- Add autosave status: saved, saving, failed, offline draft.

### Phase 2: Team-Ready Planning

- Add organization/team workspace.
- Add plan metadata: team, week date, status, owner, last edited by.
- Add duplicate week/copy plan.
- Add plan versions and restore.
- Add staff review status: draft, review, final, archived.
- Add share links with viewer/editor roles.

### Phase 3: Better Coaching Outputs

- Build a dedicated report view rather than relying only on browser print.
- Export weekly summary PDF with AU totals, daily loads, exposure watch, notes, and comments.
- Add CSV export for workload/exposure totals.
- Add report variants: coach handout and staff review.

### Phase 4: Mobile / Field-Side Use

- Add tablet and phone day-first layout.
- Keep the full matrix for desktop.
- Add fast day navigation.
- Make add-block and current-day review one-handed/mobile friendly.

## Operations Roadmap

### Deployment

- Add repo-level CI before deploy:
  - Frontend: `npm ci`, `npm test -- --watch=false`, `npm run build`
  - Backend: `go test ./...`
- Add smoke checks for frontend and backend `/healthz`.
- Decide whether Railway hosts both services or only API/Postgres.
- Use custom domains before broad testing.

### Observability

- Add backend structured request logs with method, path, status, duration, and request id.
- Add error capture for frontend and backend.
- Add alerting on health check failures and repeated restarts.
- Keep user-facing error states specific enough for support.

### Backups

- Enable daily Postgres backups.
- Write restore procedure.
- Run a restore drill against a staging database monthly during active use.
- Add user export for plans and templates.

### Support

Write support procedures for:

- Lost password
- Wrong email
- Missing plan
- Accidental delete
- Data export
- Account deletion
- Billing issue, if billing is added

## Recommended Build Order

1. Production guardrails: env validation, CI, server timeouts, security headers.
2. Web account wiring: Angular auth/API service, account states, credentialed save/load.
3. Auth safety: CSRF, rate limits, password reset.
4. Planner data safety: server-side plan validation, autosave, optimistic locking.
5. Versioning: `plan_versions`, restore, duplicate week.
6. Team model: organizations, memberships, roles.
7. Sharing and reporting: share links, dedicated PDF/CSV exports.
8. Billing, only after retention and support workflows are proven.

## Verification Notes

- Backend specialist verification: `go test ./...` passed in `backend/`; root Go tests also passed with macOS linker warnings.
- Security specialist verification: backend tests passed; frontend tests passed with `npm test -- --watch=false`.
- Planning sprint did not modify application source code. It added this planning artifact and updated the task log.
