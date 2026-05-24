# Practice Planner Prototype

## Plan

- [x] Create task tracking files for the prototype scope.
- [x] Build a static weekly demand board in plain HTML/CSS/JS.
- [x] Add editable block metadata, AU calculation, and adaptive low/medium/high day labels.
- [x] Verify locally in a browser and record the review.

## Scope

Build a static first-pass UI that focuses on a 30,000-foot weekly demand map for football and rugby coaches. The prototype should feel like a spreadsheet, support coach-created blocks with free text and metadata, calculate AU from duration and planned demand score, categorize daily load as low/medium/high relative to the current week, preserve separate exposure flags, and support browser print/PDF export.

## Review

- `node --check app.js` passed.
- Local preview served at `http://127.0.0.1:5177/index.html`.
- Browser verification passed: weekly board renders, all seven day columns fit at desktop width, no browser console errors were reported, and adding a coach-created block to Thursday updated the selected-day AU from 144 to 264 and weekly AU from 676 to 796.

## Follow-up Plan: Side Panel Clarity

- [x] Separate the side panel into day overview, block builder, and current day blocks.
- [x] Add clearer labels and supporting day-level metrics so the top area is not confused with block entry.
- [x] Verify the revised side panel in the browser and record results.

## Follow-up Review

- `node --check app.js` passed.
- ASCII check passed for edited prototype files.
- Browser verification passed at `http://127.0.0.1:5177/index.html`: side panel now has three explicit sections, `Day Overview`, `Add Training Block`, and `Current Day Blocks`.
- The day overview now reports day-level AU, category, assigned-block count, and unique exposure-flag count separately from the block-entry form.
- Asset version query strings were added so the browser loads the revised side-panel script and styles instead of a cached older script.

## Follow-up Plan: Grid Block References

- [x] Map assigned blocks back into the weekly grid by day and planning row.
- [x] Add compact expandable block references in grid cells with AU, tags, exposure flags, and coach notes.
- [ ] Verify the grid references update when adding and removing blocks.

## Follow-up Plan: PDF Output

- [x] Set print/PDF output to landscape.
- [x] Preserve the same color system in print/PDF output.
- [x] Verify the print styles are present and the browser loads the revised assets cleanly.

## PDF Review

- `node --check app.js` passed.
- ASCII check passed for edited prototype files.
- Browser verification passed at `http://127.0.0.1:5177/index.html`: revised assets loaded with `pdf-landscape-1`, print CSS contains `@page { size: landscape; }`, exact color adjustment is present, the print legend remains visible, and the page reports no browser console errors.
- Grid block references are present in the loaded page after the PDF change, with three initial references mapped from the side-panel blocks into the weekly board.

## Follow-up Plan: Editable Day Focus

- [x] Add an editable day-focus control to the Day Overview section.
- [x] Sync edited day focus to the day header, overview badge, and block-builder day context.
- [x] Verify the day-focus control loads in the browser.

## Editable Day Focus Review

- `node --check app.js` passed.
- ASCII check passed for edited prototype files.
- Browser verification passed at `http://127.0.0.1:5177/index.html`: revised assets loaded with `day-focus-1`, the Day Overview section includes the editable day-focus input, and the initial selected-day header, overview badge, and input value all match `Install`.
- The input event handler updates the selected day title, re-renders the weekly day header, and updates the overview badge.

## Follow-up Plan: Collapsed Block Builder

- [x] Move the full Add Training Block form out of the default sidebar.
- [x] Add a compact New Block action that opens the form as a popup.
- [x] Verify the sidebar prioritizes current planned blocks and the popup opens cleanly.

## Collapsed Block Builder Review

- `node --check app.js` passed.
- ASCII check passed for edited prototype files.
- Browser verification passed at `http://127.0.0.1:5177/index.html`: revised assets loaded with `block-dialog-1`, the sidebar no longer contains the full block form by default, `Current Day Blocks` stays visible above the compact New Block action, and the dialog opens and closes cleanly with no browser console errors.

## Follow-up Plan: Grid Cell Spacing

- [x] Reduce excess vertical space between grid cell labels and planned block references.
- [x] Keep editable cells usable while making block-bearing cells more compact.
- [x] Verify spacing and browser load after the CSS update.

## Grid Cell Spacing Review

- `node --check app.js` passed.
- ASCII check passed for edited prototype files.
- Browser verification passed at `http://127.0.0.1:5177/index.html`: revised assets loaded with `grid-spacing-1`, planned block references still render, the popup block form remains closed by default, and the sidebar still omits the full block form.
- Block-bearing grid cell editor height is now more compact than plain cells, reducing whitespace above the planned block details.

## Follow-up Plan: Compact Weekly Metrics

- [x] Move weekly summary metrics into the planner header area.
- [x] Restyle total AU, highest day, and exposure watch as compact pills instead of wide cards.
- [x] Verify the board starts higher on the page and the metrics still update.

## Compact Weekly Metrics Review

- `node --check app.js` passed.
- ASCII check passed for edited prototype files.
- Browser verification passed at `http://127.0.0.1:5177/index.html`: revised assets loaded with `compact-metrics-1`, the three weekly metrics render as compact header pills, and the metric values still show total AU, highest day, and exposure watch.
- The planner header height is reduced and the grid starts higher on the page.

## Follow-up Plan: Remove Planner Subtitle

- [x] Remove the visible `30,000-foot weekly view` subtitle from the planner header.
- [x] Preserve a meaningful accessible label for the planner region.
- [x] Verify the page loads the revised assets cleanly.

## Remove Planner Subtitle Review

- `node --check app.js` passed.
- ASCII check passed for edited prototype files.
- Browser verification passed at `http://127.0.0.1:5177/index.html`: revised assets loaded with `remove-planner-title-1`, the visible subtitle is gone, no `#plannerTitle` element remains, and the planner region keeps `aria-label="Weekly demand planner"`.

## Follow-up Plan: Block Cell Color Logic

- [x] Make block-bearing grid cells derive color from combined planned block AU instead of static text keywords.
- [x] Keep static template text coloring for cells without assigned blocks.
- [x] Verify Monday strength block no longer renders neutral when its AU is high.

## Follow-up Plan: Coach AU Priority

- [x] Keep keyword matching as the guide for empty planning cells.
- [x] Make coach-entered block AU the primary day-load evaluation signal when a day has assigned AU.
- [x] Add concise legend guidance so coaches understand AU priority versus keyword guidance.

## Load Color And Priority Review

- `node --check app.js` passed.
- ASCII check passed for edited prototype files.
- Browser verification passed at `http://127.0.0.1:5177/index.html`: revised assets loaded with `load-priority-1`, Monday S&C renders as `level-high has-blocks` from its 280 AU block, Tuesday contact renders from its 252 AU block, and Thursday speed renders from its 144 AU block.
- Empty planning cells still use keyword matching, and the legend now distinguishes `Block AU priority` from `Keywords guide empty cells`.
- Day-load category evaluation now prioritizes days with coach-entered AU, while keyword scores remain a fallback for days without assigned AU.

## Follow-up Plan: Day Header Workload Colors

- [x] Apply low/medium/high/max workload colors to day header cells.
- [x] Preserve readable text and selected-day outline.
- [x] Verify the header colors render from the existing day workload classes.

## Day Header Workload Color Review

- `node --check app.js` passed.
- ASCII check passed for edited prototype files.
- Browser verification passed at `http://127.0.0.1:5177/index.html`: revised assets loaded with `day-header-colors-1`, day headers now render workload colors from their existing level classes, and Monday displays as high with the high-load color.

## Production MVP Plan: Angular + Go on Railway

- [x] Worker 1: scaffold an Angular frontend in `frontend/` only, preserving the current planner experience.
- [x] Worker 1: move planner state, AU calculation, keyword fallback, block color priority, and exposure summaries into testable Angular services.
- [x] Worker 1: add planner shell, demand grid, day inspector, block dialog, auth panel, saved plans list/drawer, planner state service, and API/auth service.
- [x] Worker 1: add GitHub Pages-friendly environment placeholders for the Railway API base URL.
- [x] Worker 1: add focused frontend tests for AU math, day workload categories, keyword fallback, block AU priority, and exposure summaries.
- [x] Worker 1: run frontend install/build/tests when feasible and record exact results.
- [x] Add guest-mode planning plus account-gated save/load controls.
- [x] Build a Go API with email/password auth, sessions, CORS, health check, and plan CRUD routes.
- [x] Add Railway/Postgres configuration and SQL migrations.
- [x] Add focused frontend and backend tests.
- [x] Verify production builds, tests, local browser behavior, and record results.

## Worker 1 Angular Frontend Plan

- [x] Preserve the root prototype behavior while limiting edits to `frontend/` plus this task log.
- [x] Scaffold Angular with TypeScript, standalone components, and a dense coach-planning UI.
- [x] Implement typed planner models, defaults, templates, keyword scoring, AU scoring, block-to-grid mapping, exposure summaries, and saved-plan/auth API placeholders.
- [x] Compose the UI from planner shell, demand grid, day inspector, block dialog, auth panel, and saved plans list.
- [x] Add unit tests for AU math, day workload categories, keyword fallback, block AU priority, and exposure summaries.
- [x] Verify with install/build/tests and record exact commands/results in this file.

## Worker 1 Angular Frontend Review

- `npm install` passed: added 469 packages, audited 470 packages, 0 vulnerabilities.
- `npm run build` passed: Angular production build completed, output at `frontend/dist/frontend`.
- `npm test -- --watch=false` passed: 2 test files, 8 tests.
- Local serve sanity check passed at `http://127.0.0.1:4200/`; dev server was stopped after verification.
- Known gaps for integration: auth and cloud save/load are UI/API placeholders until the Go API contract is connected; saved plans currently persist guest copies in browser local storage.

## Worker 2 Backend Plan

- [x] Scaffold `backend/` as a standalone Go module.
- [x] Add configuration for `DATABASE_URL`, `SESSION_SECRET`, `ALLOWED_ORIGINS`, `PORT`, and `ENV`.
- [x] Add PostgreSQL migrations for `users`, `sessions`, and `plans`.
- [x] Implement auth routes with bcrypt password hashing, cryptographic session tokens, hashed server-side sessions, and cookie-backed session validation.
- [x] Implement CORS with explicit allowed origins and production-ready cookie behavior.
- [x] Implement health check plus owner-checked saved plan CRUD routes.
- [x] Add focused backend tests for auth/session validation, plan ownership, bad input, unauthorized access, and health check.
- [x] Run `gofmt` and `go test`, then record exact results.

## Worker 2 Backend Review

- `gofmt -w ./cmd ./internal` passed with no output.
- `go test ./...` passed:
  - `?    practice-planner/backend/cmd/api [no test files]`
  - `ok   practice-planner/backend/internal/app 0.513s`
- `go build ./cmd/api` passed with no output; the temporary local binary was removed afterward.
- Railway config was checked against the current Railway config-as-code reference and uses `RAILPACK`, `buildCommand`, `startCommand`, and `/healthz`.
- Production session cookies are `Secure` and `SameSite=None`; local/test cookies stay `SameSite=Lax`.
- Known gap: tests use the in-memory store for route behavior; the PostgreSQL implementation and embedded migration are present but were not exercised against a live database in this pass.

## Production MVP Integration Review

- Frontend API wiring now calls the Go routes under `/api/*` with credentialed requests for cookie-backed sessions.
- Signed-in users can save account plans, refresh/load account plans, and delete account plans through the Railway API contract; guest users can still save browser-local copies without authenticating.
- Added root deployment documentation, frontend deployment notes, and repository ignore rules for build artifacts.
- `npm run build` passed in `frontend/`; output at `frontend/dist/frontend`.
- `npm test -- --watch=false` passed in `frontend/`: 2 test files, 8 tests.
- `go test ./...` passed in `backend/`.
- `go build ./cmd/api` passed in `backend/`; the temporary local binary was removed afterward.
- ASCII check passed for source, docs, and task files.
- Browser verification passed at `http://127.0.0.1:4200/`: Angular planner renders, the weekly grid and inspector are present, the initial weekly AU summary shows 676, Plans opens guest save/account-gated controls, Account opens the sign-in/register panel, and no browser console errors were reported.

## Railway Two-Service Deployment Plan

- [x] Add a Railway config for the Angular frontend service.
- [x] Add a production static server for the built Angular app with SPA fallback.
- [x] Tighten backend Railway config for monorepo service deployment.
- [x] Update deployment docs for two Railway services and required variables.
- [x] Verify frontend build/start and backend build/tests after config changes.

## Web Application Production Planning Sprint

### Sprint Scope

Assess what must be true for Practice Planner to move from a desktop-first/planner prototype into a stable, maintainable web application for coaches. Cover system architecture, hosting and operations, security, database design, user accounts, billing/email hooks, UX, and product features. Produce a prioritized production roadmap rather than making implementation changes in this pass.

### Plan

- [x] Inventory the current app structure, deployment notes, and test coverage.
- [x] Run parallel specialist reviews for security, database/backend design, UX/product workflow, and web operations.
- [x] Synthesize findings into a production-readiness assessment with clear go/no-go risks.
- [x] Define the target web architecture and phased roadmap.
- [x] Estimate Railway hosting costs, bandwidth assumptions, and subscription margin at $5-$10 per month.
- [x] Record verification steps and sprint results in this task log.

### Review

- Railway hosting estimate added at `docs/railway-hosting-cost-estimate.md`.
- Estimate uses the current documented web architecture: Railway Angular frontend service, Go backend service, and Railway PostgreSQL.
- Current frontend production build was checked at about 312 KB, making idle memory and database footprint the likely early cost drivers rather than bandwidth.
- Railway pricing was refreshed on 2026-05-24 from official Railway docs: Hobby $5/month with $5 included usage, Pro $20/month with $20 included usage, RAM $10/GB-month, CPU $20/vCPU-month, network egress $0.05/GB, and volume storage $0.15/GB-month.
- Rough conclusion: normal coach-planner traffic should stay near the Hobby floor through early validation. Hosting-only gross margin remains high at both $5/month and $10/month unless the product adds large files, media, PDF-heavy workflows, or duplicate always-on environments.
- Created `tasks/web-application-production-plan.md` as the durable production planning artifact.
- Go/no-go judgment: go for private alpha with constraints; no-go for broad public launch or paid accounts until security, account recovery, backup, CI, and web account wiring gaps are closed.
- Security review found the strongest launch blockers: cross-site cookie auth without CSRF, no login/register rate limiting, arbitrary planner JSON validation, incomplete production timeouts, production CORS fallback risk, and missing hardening headers.
- Database/backend review found the main architecture blockers: user-owned plans instead of team/workspace ownership, opaque unversioned `plan_json`, no version history, no sharing/template model, minimal audit trail, and no export/import story.
- UX/product review found the strongest workflow blockers: active Angular save/load is still desktop/local-first, collaboration is absent, first-use onboarding is thin, mobile/tablet needs a day-first mode, and PDF/export needs a dedicated report view.
- Operations review found missing production guardrails: placeholder API URL can survive production build, no repo-level CI gate, no password reset/email routing/support flows, minimal observability, no backup/restore runbook, and billing hooks are absent.
- Verification reported by specialist reviewers: `go test ./...` passed in `backend/`; root Go tests passed with macOS linker warnings; frontend tests passed with `npm test -- --watch=false`.

## Web Production Buildout Plan

### Scope

Implement phases 1-7 from `tasks/web-application-production-plan.md` in order, leaving billing out of scope. Use a test-first workflow for each phase, then build, run the full relevant test suite, and verify added user-facing behavior in the browser before moving to the next phase.

### Phase Gates

- [x] Phase 1: Production guardrails: env validation, CI, server timeouts, security headers.
- [x] Phase 2: Web account wiring: Angular auth/API service, account states, credentialed save/load.
- [x] Phase 3: Auth safety: CSRF, rate limits, password reset.
- [ ] Phase 4: Planner data safety: server-side plan validation, autosave, optimistic locking.
- [ ] Phase 5: Versioning: `plan_versions`, restore, duplicate week.
- [ ] Phase 6: Team model: organizations, memberships, roles.
- [ ] Phase 7: Sharing and reporting: share links, dedicated PDF/CSV exports.

### Phase 1 Tasks

- [x] Write failing backend tests for production config validation and HTTP timeout configuration.
- [x] Write failing frontend/server tests for required production API base URL and static hardening headers.
- [x] Implement backend production config guardrails and complete server timeout settings.
- [x] Implement frontend production env guardrail and static response hardening headers.
- [x] Add repo-level CI for frontend and backend checks.
- [x] Run backend tests, frontend tests, production builds, and browser smoke verification.

### Phase 1 Review

- Added backend config tests for production-only `ALLOWED_ORIGINS` requirements, HTTPS origins, wildcard rejection, localhost rejection, and minimum production `SESSION_SECRET` length.
- Extracted backend HTTP server construction into `newHTTPServer()` and added read, write, idle, and read-header timeouts.
- Added frontend Node tests for production API URL generation and static server hardening headers.
- Exported `writeEnvironment()` and `createFrontendServer()` to make guardrails testable.
- Production frontend builds now run the environment writer before Angular build, so missing/placeholder API origins fail before deployment.
- Added `.github/workflows/ci.yml` with frontend Node tests, Angular tests, frontend build, and backend Go tests.
- Verification passed: `go test ./...` in `backend/`; `npm run test:node`; `npm test -- --watch=false`; `API_BASE_URL=https://api.example.com npm run build`.
- Browser verification passed at `http://127.0.0.1:4301/`: app rendered `Weekly Demand Map`, no console errors were reported, `/healthz` returned `{ "status": "ok" }`, and static responses included `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, and `Content-Security-Policy`.
- Browser screenshot saved at `frontend/__screenshots__/phase-1-guardrails.png`.

### Phase 2 Tasks

- [x] Write failing frontend tests for web auth/account state and credentialed plan API calls.
- [x] Write failing browser-facing tests or service tests for signed-in save/load/delete behavior.
- [x] Implement Angular auth/API services for register, login, logout, session bootstrap, and plan CRUD.
- [x] Split web API storage from desktop/local fallback while keeping guest/local draft mode explicit.
- [x] Update account and saved-plan UI states for signed out, signed in, loading, save failed, saved, and guest draft.
- [x] Run frontend tests, backend tests, build, and browser account-flow verification before Phase 3.

### Phase 2 Review

- Added `ApiAuthService` for session bootstrap, register, login, logout, account status, and credentialed auth requests.
- Added `ApiPlanStorageService` for credentialed account plan list/save/delete calls.
- Updated planner state to use account API storage when signed in and guest/local storage when signed out.
- Updated the saved-plans drawer with explicit guest draft and signed-in account states.
- Added a development-only `DATABASE_URL=memory` backend mode for repeatable browser verification without local Postgres.
- Fixed the static CSP to allow local API targets for browser verification.
- Verification passed: `go test ./...` in `backend/`; `npm run test:node`; `npm test -- --watch=false`; `API_BASE_URL=http://127.0.0.1:8081 npm run build`.
- Browser verification passed with backend memory API at `http://127.0.0.1:8081` and frontend at `http://127.0.0.1:4302`: create account, show account state, save account plan, delete account plan, and sign out to guest draft mode.
- Browser screenshot saved at `frontend/__screenshots__/phase-2-account-flow.png`.

### Phase 3 Tasks

- [x] Write failing backend tests for CSRF token issuance and enforcement on mutating cookie-authenticated routes.
- [x] Write failing backend tests for login/register rate limiting.
- [x] Write failing backend tests for password reset request and completion.
- [x] Implement CSRF tokens and frontend header support.
- [x] Implement auth rate limiting.
- [x] Implement password reset storage/routes with development-safe reset behavior.
- [x] Run backend tests, frontend tests, build, and browser auth-safety verification before Phase 4.

### Phase 3 Review

- Added `GET /api/auth/csrf` and required `X-CSRF-Token` on authenticated mutating routes.
- Updated frontend account logout and plan save/delete calls to fetch and send CSRF tokens.
- Added in-memory auth rate limiting for login/register attempts.
- Added password reset token storage, Postgres migration, request route, and completion route. Development/test responses include the reset token; production returns no token body so a mailer can be added later.
- Updated CORS to allow `X-CSRF-Token` preflight headers.
- Verification passed: `go test ./...` in `backend/`; `npm run test:node`; `npm test -- --watch=false`; `API_BASE_URL=http://127.0.0.1:8081 npm run build`.
- Browser verification passed with CSRF-protected account save, password reset request returning a development reset token, and a saved account plan visible in the drawer.
- Browser screenshot saved at `frontend/__screenshots__/phase-3-auth-safety.png`.

## Railway Two-Service Deployment Review

- Added `frontend/railway.toml` for the Angular service with Railpack, build command, start command, health check, restart policy, and watch patterns.
- Added `frontend/server.mjs` to serve `dist/frontend/browser`, expose `/healthz`, and fall back to `index.html` for client-side Angular routes.
- Added `frontend/scripts/write-environment.mjs` so Railway can compile the frontend with `API_BASE_URL` or `PRACTICE_PLANNER_API_ORIGIN` set to the backend service URL.
- Updated `backend/railway.toml` with watch patterns and restart retry settings.
- Updated deployment docs for two Railway services: `/frontend`, `/backend`, plus Railway PostgreSQL.
- Verified `API_BASE_URL=https://api.example.test node scripts/write-environment.mjs && npm run build` passes.
- Verified `PORT=4300 npm start` serves `/healthz` and the Angular index from the production build.
- Verified `npm run build`, `npm test -- --watch=false`, `go test ./...`, and `go build ./cmd/api` pass.
- ASCII check passed for changed source, docs, and task files.

## Frontend Railway Lockfile Fix Plan

- [x] Regenerate `frontend/package-lock.json` so it is in sync with `frontend/package.json` and Linux optional dependencies.
- [x] Run the exact Railway frontend build command locally with `npm ci`.
- [x] Verify frontend tests still pass.
- [x] Record the deployment fix and results.

## Frontend Railway Lockfile Fix Review

- Root cause: Railway's Linux clean install needed `@emnapi/core`, `@emnapi/runtime`, and `@emnapi/wasi-threads` entries that were not represented as installable lockfile packages.
- Added those packages as explicit frontend dev dependencies so `npm ci` has stable lockfile entries on Railway.
- `rm -rf node_modules && npm ci && node scripts/write-environment.mjs && npm run build` passed in `frontend/`.
- `npm test -- --watch=false` passed in `frontend/`: 2 test files, 8 tests.

## Mac Desktop Packaging Plan

- [x] Add a Wails desktop shell that embeds the existing Angular production build.
- [x] Add a local SQLite plan store provisioned on first launch under macOS Application Support.
- [x] Replace the desktop save/load/delete path with Wails bindings and remove account-dependent UI from the packaged app.
- [x] Add DMG packaging documentation and scripts for the simplest repeatable local build.
- [x] Verify frontend tests/build, Go tests/build, Wails package build, and SQLite persistence behavior.

## Mac Desktop Packaging Review

- Added a root Wails desktop app around the existing Angular frontend, with generated TypeScript bindings under `frontend/bindings/`.
- Added a local SQLite-backed `PlanService` that provisions `~/Library/Application Support/Practice Planner/practice-planner.sqlite` on first launch and stores saved plans as JSON.
- Removed the active account/login UI from the Angular shell; `Plans` now saves, lists, loads, and deletes plans locally on the Mac.
- Added `scripts/package-mac.sh` and README instructions for building `dist/mac/Practice Planner.app` and `dist/mac/Practice Planner.dmg`.
- `npm test -- --watch=false` passed in `frontend/`: 2 test files, 8 tests.
- `npm run build` passed in `frontend/`.
- `go test ./...` passed for the root desktop module; the new SQLite test verified DB provisioning, save, list, and delete.
- `go test ./...` passed in `backend/`, preserving the existing Railway API tests.
- `./scripts/package-mac.sh` passed and created `dist/mac/Practice Planner.app` plus `dist/mac/Practice Planner.dmg`.
- `codesign --verify --deep --strict --verbose=2 "dist/mac/Practice Planner.app"` passed.
- `hdiutil verify "dist/mac/Practice Planner.dmg"` passed.
- DMG mount verification passed: the mounted volume contained `Practice Planner.app`.
- Native launch smoke test passed: the packaged app started, then quit cleanly through AppleScript.
- First-launch SQLite provisioning was confirmed at `~/Library/Application Support/Practice Planner/practice-planner.sqlite`, with the expected `plans` table and index.
- Distribution note: the local app bundle is ad-hoc signed for local testing. Sharing outside this Mac still needs Developer ID signing and notarization.

## Blank Plan And Label Library Plan

- [x] Start new plans with no assigned training blocks while keeping the weekly demand grid template intact.
- [x] Add a reusable block-label preset library with intended category, level, minutes, and demand score.
- [x] Let coaches select a preset quickly in the block dialog while still allowing typed custom labels.
- [x] Add a compact label configuration tool for creating, editing, and removing presets.
- [x] Verify calculations, UI behavior, frontend build/tests, desktop Go tests, and DMG packaging after the change.

## Blank Plan And Label Library Review

- New plans now start with zero assigned training blocks and zero planned AU; the weekly demand grid template remains available for planning context.
- Added saved-plan state for `blockLabelPresets`, including label, category, intended level, minutes, demand score, tags, exposures, and notes.
- Added a block label datalist and quick-pick preset buttons in the Add Training Block dialog; coaches can still type a custom label.
- Added a compact Label Library panel in the day inspector for adding, editing, and removing preset labels and their intended load.
- Browser verification passed at `http://127.0.0.1:4201/`: initial total planned AU was 0, the selected day showed no blocks, selecting `Full-contact competitive period` filled category/contact/load fields, adding it updated total AU to 252, and adding `Red-zone competition` to the label library produced a 128 AU high-load preset.
- `npm test -- --watch=false` passed in `frontend/`: 2 test files, 9 tests.
- `npm run build` passed in `frontend/`.
- `go test ./...` passed for the root desktop module.
- `go test ./...` passed in `backend/`.
- `./scripts/package-mac.sh` passed and rebuilt `dist/mac/Practice Planner.app` plus `dist/mac/Practice Planner.dmg`.
- `codesign --verify --deep --strict --verbose=2 "dist/mac/Practice Planner.app"` passed.
- `hdiutil verify "dist/mac/Practice Planner.dmg"` passed.
- Native launch smoke test confirmed the rebuilt packaged app starts; an existing `/Applications/Practice Planner.app` process was already present after the smoke test.

## DMG Applications Alias Review

- Updated `scripts/package-mac.sh` to build the DMG from `dist/mac/dmg-staging/`.
- The staging folder now contains `Practice Planner.app` and an `Applications -> /Applications` symlink.
- Rebuilt `dist/mac/Practice Planner.dmg` successfully.
- `codesign --verify --deep --strict --verbose=2 "dist/mac/Practice Planner.app"` passed.
- `hdiutil verify "dist/mac/Practice Planner.dmg"` passed.
- Mounted DMG verification passed: `/Volumes/Practice Planner` contains both `Practice Planner.app` and `Applications -> /Applications`.
