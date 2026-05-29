# Practice Planner Prototype

## Day Details Drawer UX Plan

- [x] Rename the user-facing `Inspector` entry point to a clearer day-planning/details surface.
- [x] Add structured day-level fields beyond the grid: objective, constraints, readiness, and coach notes.
- [x] Keep the drawer organized into logical sections so day context, assigned work, adding work, and label-library management do not run together.
- [x] Make the opened drawer own vertical scrolling at desktop and mobile widths without causing the weekly grid/page to scroll.
- [x] Preserve saved-plan compatibility by defaulting missing detail fields for older plans.
- [x] Add focused regression coverage for day detail updates and drawer labels/structure.
- [x] Verify with frontend tests/build and browser checks for drawer scrolling and detail-field persistence.

### UX Analysis: Day Details Drawer

Current issues:

- The visible `Inspector` label is developer-centric and does not describe the coach workflow.
- The drawer already mixes summary, current blocks, creation actions, and label configuration; adding more fields without stronger grouping would increase cognitive load.
- The drawer does not consistently own its scroll container, so wheel/trackpad scrolling can move the grid behind the drawer instead of the drawer content.
- The grid captures the main demand matrix, but there is no structured place for day objective, constraints, readiness, or coaching notes.

Recommended solution:

- Use `Day Details` as the visible feature name and keep it in the header near the planner controls.
- Put editable day context in the first section: focus, objective, readiness, constraints, and coach notes.
- Keep assigned work, add-block action, and label library as separate sections below the day context.
- Use an internal scroll region inside the fixed drawer with `overscroll-behavior: contain` so the drawer scrolls independently.
- Keep the detail fields optional, compact, and compatible with existing saved plans.

Implementation notes:

- Cognitive Load and Chunking: group day-level notes separately from block-level controls.
- Hick's Law: use one readiness selector with a small set of options instead of a broad custom status system.
- Law of Proximity: keep summary metrics next to day context, and block actions next to assigned blocks.
- Jakob's Law: use a conventional right-side details drawer with a fixed header and scrollable body.
- Fitts's Law: keep close/action buttons and section controls at practical target sizes.

### Day Details Drawer Review

- Renamed the visible header action from `Inspector` to `Day Details`; the drawer heading now reads `Planning Details`.
- Added editable day-level context fields: day focus, readiness posture, primary objective, constraints, and coach notes.
- Kept the drawer grouped into `Day Brief`, `Current Day Blocks`, `Add Training Block`, and `Label Library` sections.
- Added `PlannerDay` detail fields to new plans and normalize missing detail fields when older saved plans are loaded.
- Added backend plan validation for optional day details and readiness values.
- Fixed drawer scrolling by making the fixed drawer an explicit viewport-height flex container and moving overflow to `.planning-drawer-body` with contained overscroll.
- Verification passed: `go test ./...` in `backend/`; `npm run test:node`; `npm test -- --watch=false`; `API_BASE_URL=http://127.0.0.1:8092 npm run build`.
- Browser verification passed at `http://127.0.0.1:4304/` with a `900x620` viewport: drawer body scrolled from `0` to `682` while `window.scrollY` stayed `0`.
- Browser screenshot saved at `frontend/__screenshots__/day-details-drawer-scroll.png`.

## Profile Preferences And Week Order Plan

- [x] Add a user profile/preferences model for account users, starting with week display order.
- [x] Keep the default week order Monday-first.
- [x] Provide Sunday-first and game-relative week order options, where game-relative keeps the game day last.
- [x] Make the weekly grid render from the selected display order without changing canonical day IDs or saved block data.
- [x] Add an account/profile navigation surface that groups Account, Teams, Plans, and Preferences without crowding the main planner.
- [x] Apply UX laws: keep top-level profile sections to 4 tabs, group related controls, use conventional account/settings navigation, and keep touch targets large enough.
- [x] Persist account preferences after sign-in and apply them on bootstrap/login/register.
- [x] Add regression tests for default Monday-first order and saved preference behavior.
- [x] Verify with backend tests, frontend tests/build, and a browser flow that changes week order and confirms the board reorders correctly.

### UX Analysis: Profile Preferences

Current issues:

- Week order is hard-coded Saturday-first, which conflicts with the expected Monday-first default and makes the planner feel oriented around a specific game-week assumption.
- Account, teams, plans, and future preferences are currently crowded into the saved-plans drawer, increasing cognitive load as account features grow.
- The app has no account settings area where a signed-in user can manage preferences after account creation.

Recommended solution:

- Use one profile drawer opened from the header with four tabs: Account, Teams, Plans, Preferences.
- Put week order in Preferences as a segmented control with three choices: Monday first, Sunday first, Game day last.
- Default to Monday first for every new local state and every new account preference.
- Store the selected preference with the account and apply it to the planner display order on bootstrap/login/register.
- Preserve canonical `DayId` keys, grid data, blocks, and plan payload shape; only reorder the display collection used by the board.

Implementation notes:

- Hick's Law: expose only three week-order choices now instead of a broad custom reorder UI.
- Miller's Law: keep profile navigation to four sections.
- Law of Proximity: place week-order controls near a concise preview of the resulting day sequence.
- Jakob's Law: use the familiar Account/Profile entry point in the header, not hidden controls inside the grid.
- Fitts's Law: use full-size tab and segmented-control buttons rather than small inline links.

### Profile Preferences And Week Order Review

- Added backend `user_preferences` storage with `week_order`, defaulting existing and new users to `mondayFirst`.
- Added authenticated profile preference endpoints: `GET /api/profile/preferences` and `PUT /api/profile/preferences`.
- Added frontend API/state support for preferences and display-only week ordering.
- The board now defaults to Monday-first and can render Sunday-first or game-day-last without changing saved day IDs, grid keys, blocks, or plan payload shape.
- Reworked the saved-plans drawer into a profile drawer with four tabs: Account, Teams, Plans, and Preferences.
- Week order uses a three-option segmented control with an inline day-sequence preview.
- Verification passed: `go test ./internal/app -run 'TestUserPreferencesDefaultAndUpdate|TestRegisterDoesNotKeepUserWhenSessionCreationFails' -count=1`; `go test ./...` in `backend/`; `npm test -- --watch=false`; `npm run test:node`; `API_BASE_URL=http://127.0.0.1:8093 npm run build`.
- Browser verification passed at `http://127.0.0.1:4303/`: default order was `MON,TUE,WED,THU,FRI,SAT,SUN`; account creation succeeded; Sunday-first persisted after reload; game-day-last changed the Friday-game template to `SAT,SUN,MON,TUE,WED,THU,FRI`.
- Browser screenshot saved at `frontend/__screenshots__/profile-week-order-preferences.png`.

## Account Creation And Plan Persistence Review

- [x] Trace account registration, login, session, CSRF, organization creation, and first-plan flows from frontend to backend.
- [x] Inspect local database state for users, organizations, plans, plan versions, and unnamed-plan patterns.
- [x] Verify backend sign-up and authentication API behavior directly against the local Go API.
- [x] Identify whether unnamed plans come from expected autosave/versioning behavior or from accidental plan creation.
- [x] Implement the smallest backend root-cause fix for partial account creation during registration.
- [x] Add backend regression coverage for partial registration failures.
- [x] Verify with backend tests and a direct local API flow.
- [x] Document findings, fix, and remaining risks in this file.

### Backend Auth API Check Notes

- Local API target: `http://127.0.0.1:8092`, with frontend origin `http://127.0.0.1:4201`.
- `POST /api/auth/register` returned `201 Created`, set the session cookie, and `GET /api/auth/me` returned the registered user from that cookie.
- `GET /api/auth/csrf` returned a 64-character token for the authenticated session.
- `POST /api/plans` correctly rejected an incomplete planner payload with `400 all planner days are required`.
- `POST /api/plans` accepted a valid full planner payload with `201 Created`.
- `POST /api/auth/logout` returned `204 No Content`; `GET /api/auth/me` then returned `401 authentication required`.
- `POST /api/auth/login` rejected a wrong password with `401 invalid email or password`.
- `POST /api/auth/login` accepted the registered credentials with `200 OK`; `GET /api/plans` then returned the saved plan.
- Temporary API test users were removed after verification.
- Local Postgres after cleanup: one pre-existing user, zero plans, zero plan versions.
- Desktop SQLite store at `~/Library/Application Support/Practice Planner/practice-planner.sqlite`: zero saved plans.

### Backend Auth API Fix Review

- Root cause fixed: registration previously created the user and default organization before issuing the session. A session persistence failure could make the API return signup failure while leaving a user who could later log in.
- Backend registration now creates the user, default organization, and initial session in one store operation before setting the session cookie.
- PostgreSQL registration uses one transaction for user, organization, and session creation.
- In-memory test storage follows the same contract.
- Added regression coverage proving a simulated session creation failure does not leave a login-capable user behind.
- Verification passed: `go test ./internal/app -run TestRegisterDoesNotKeepUserWhenSessionCreationFails -count=1`; `go test ./...` in `backend/`.
- Live local API verification after the fix passed: register `201`, me `200`, CSRF token length `64`, create plan `201`, logout `204`, me after logout `401`, bad login `401`, good login `200`, plan list `200` with one saved plan.
- Remaining risk outside the backend API: frontend signup/login still does not automatically attach the current guest draft to an account plan, and account autosave remains idle until a plan is saved or loaded.
- Plan-row finding: backend signed-in autosave updates the active plan with `PUT` and should not create a new plan row per edit; heavy autosave can still grow `plan_versions`. Desktop/local fallback saves insert new rows by design.

## Follow-up Plan: Active Cell Collapse Control

- [x] Add an in-cell control that collapses the active matrix editor without selecting another cell.
- [x] Support keyboard collapse with Escape from the active intent input.
- [x] Preserve manual demand overrides when collapsing an unchanged intent.
- [x] Add focused component coverage for collapse behavior.
- [x] Verify tests, build, and browser behavior.

## Active Cell Collapse Control Review

- Active matrix editors now show a compact `Done` control that collapses the cell back to the at-rest intent/demand badge view.
- Pressing Escape from the active intent input also collapses the editor.
- Collapsing commits changed intent text, but leaves manual demand overrides intact when the intent text did not change.
- Verification passed: `npm test -- --watch=false`; `npm run test:node`; `API_BASE_URL=http://127.0.0.1:8092 npm run build`; and browser verification at `http://127.0.0.1:4201/`.
- Browser screenshot saved at `frontend/__screenshots__/cell-editor-collapse-control.png`.

## Follow-up Plan: Inline Matrix Demand Editor

- [x] Replace the detached selected-cell demand control with an active-cell inline editor.
- [x] Replace native matrix comboboxes with compact custom intent controls.
- [x] Show lane-specific intent options with demand-preview labels.
- [x] Support custom typed intent values in the active cell.
- [x] Use coach-facing demand labels: Off, Low, Moderate, High, and Max.
- [x] Keep intent changes resetting demand through the existing intent-to-demand mapping.
- [x] Keep manual demand changes separate from intent text changes.
- [x] Preserve block-AU coloring as the dominant visual treatment for block-bearing cells.
- [x] Show a visible intent-demand chip/rail in every matrix cell.
- [x] Reveal demand override controls only for the active cell.
- [x] Add focused Angular coverage for inline demand rendering and interaction.
- [x] Verify tests, build, and browser behavior.

## Inline Matrix Demand Editor Review

- Matrix cells now render as compact intent text plus a demand badge at rest, keeping the board scannable.
- Selecting a cell opens a custom editor with a typed intent field, lane-specific option buttons, and demand-preview labels.
- The active-cell editor shows demand override buttons only for the selected cell.
- Custom typed intent values commit through the existing intent-to-demand mapping, and manual demand overrides do not alter intent text.
- Block-bearing cells keep block-AU color precedence while still showing the compact intent-demand badge.
- Verification passed: `npm test -- --watch=false`; `npm run test:node`; `API_BASE_URL=http://127.0.0.1:8092 npm run build`; and browser verification at `http://127.0.0.1:4201/`.
- Browser screenshot saved at `frontend/__screenshots__/compact-inline-demand-editor.png`.

## Local Postgres Backend Check

- [x] Check whether local Postgres is running and reachable.
- [x] Confirm or create a dedicated local development database.
- [x] Run backend migrations against local Postgres.
- [x] Start backend with local Postgres settings and verify health/API behavior.
- [x] Record findings and any remaining setup gaps.
- [x] Add a local backend run script so Postgres dev settings are repeatable.

### Local Postgres Backend Check Review

- Local PostgreSQL 15.14 is running on `localhost:5432` and accepting connections as user `josephstich`.
- Created dedicated development database `practice_planner_dev` because no Practice Planner database existed locally.
- Backend started successfully with `DATABASE_URL=postgres://josephstich@localhost:5432/practice_planner_dev?sslmode=disable`, `SESSION_SECRET=dev-session-secret-32-characters!!`, and local frontend origins.
- Embedded migrations applied successfully: `001_init`, `002_auth_safety`, `003_plan_lock_version`, `004_plan_versions`, `005_team_model`, and `006_plan_shares`.
- Verified `/healthz` returned `{"status":"ok"}`.
- Verified register/session/CSRF/default organization behavior against Postgres: registration returned `201 Created`, CSRF token was issued, and the new account received a default `My Team` owner organization.
- Added `scripts/run-backend-dev.sh` with local Postgres defaults and updated `README.md` with the local backend command.

## Follow-up Plan: Planning Cell Intent Controls

- [x] Remove non-actionable explanatory legend chips from the weekly grid legend.
- [x] Add per-cell intent inputs with preset options seeded from the existing matrix values.
- [x] Add per-cell demand selectors so coaches can change cell color before assigning detailed blocks.
- [x] Point local Angular development at the local backend port used by the dev run script.
- [x] Add Wails shim assets for local web serving so browser checks do not report desktop-only asset failures.
- [x] Verify tests, production build, and browser behavior.

## Planning Cell Intent Controls Review

- Grid cells now use an intent input with row-specific preset options and a demand selector from `0` to `4`.
- Initial demand scores are generated from the current template values, preserving the existing matrix as the starting option set and default color system.
- Changing a cell demand updates the cell workload class before any training blocks are assigned.
- Local web development now targets `http://127.0.0.1:8092` by default, matching the current backend dev script.
- Verification passed: `npm test -- --watch=false`; `npm run test:node`; `API_BASE_URL=http://127.0.0.1:8092 npm run build`; `go test ./...`; and browser verification at `http://127.0.0.1:4201/`.
- Browser screenshot saved at `frontend/__screenshots__/cell-intent-controls.png`.

## Follow-up Plan: Inspector Drawer And Cell Selector Cleanup

- [x] Collapse the day inspector by default and expose it through an `Inspector` drawer button.
- [x] Replace per-cell dual controls with one intent selector per matrix cell.
- [x] Move demand override to active-cell buttons outside the cell.
- [x] Replace row-limited datalist behavior with a complete selector option set seeded from existing template values.
- [x] Verify tests, build, and browser behavior.

## Inspector Drawer And Cell Selector Cleanup Review

- The inspector is now absent from the default page layout, opens as a right-side drawer, and closes cleanly.
- Each matrix cell now has one native selector for intent; demand is edited through active-cell buttons below the grid.
- The intent selector now exposes the full template variable set instead of a narrow row-specific datalist.
- Verification passed: `npm test -- --watch=false`; `npm run test:node`; `API_BASE_URL=http://127.0.0.1:8092 npm run build`; `go test ./...`; and browser verification at `http://127.0.0.1:4201/`.
- Browser screenshots saved at `frontend/__screenshots__/inspector-drawer-collapsed.png` and `frontend/__screenshots__/single-cell-intent-selector.png`.

## Follow-up Plan: Swim Lane Intent Options

- [x] Define a curated variable set for each swim lane instead of sharing one global variable list.
- [x] Include the requested `Pace` variables: rest, slow, moderate, fast, max, game.
- [x] Include `Work / rest` variables built around short, moderate, and long rest intent.
- [x] Preserve existing template variables within the appropriate swim lanes.
- [x] Verify lane-specific selector behavior in browser.

## Swim Lane Intent Options Review

- Added swim-lane-specific selector options for pace, work/rest, ball-in-play, contact, volume, tactical, technical, decision-making, speed, S&C, and recovery rows.
- Rugby-specific lanes `Attack / defense` and `Unit skills` map to their own tactical and technical option sets.
- Selecting an option still updates the default demand/color via `demandForCellIntent()`, while active-cell demand buttons remain available for overrides.
- Verification passed: `npm test -- --watch=false`; `npm run test:node`; `API_BASE_URL=http://127.0.0.1:8092 npm run build`; `go test ./...`; and browser verification at `http://127.0.0.1:4201/`.
- Browser screenshot saved at `frontend/__screenshots__/swim-lane-intent-options.png`.

## Follow-up Plan: Recovery Emphasis Demand Inversion

- [x] Add a regression test for recovery-emphasis demand mapping.
- [x] Treat `High` recovery emphasis as lower athlete load.
- [x] Treat `Low` recovery emphasis as higher athlete load.
- [x] Verify browser cell color behavior.

## Recovery Emphasis Demand Inversion Review

- Recovery-emphasis cells now invert default demand: `High` maps to low/green load, `Moderate` maps to medium/yellow, and `Low` maps to high/red.
- Other lanes keep their normal load mapping.
- Verification passed: `npm test -- --watch=false`; `npm run test:node`; `API_BASE_URL=http://127.0.0.1:8092 npm run build`; `go test ./...`; and browser verification at `http://127.0.0.1:4201/`.
- Browser screenshot saved at `frontend/__screenshots__/recovery-emphasis-demand.png`.

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
- [x] Phase 4: Planner data safety: server-side plan validation, autosave, optimistic locking.
- [x] Phase 5: Versioning: `plan_versions`, restore, duplicate week.
- [x] Phase 6: Team model: organizations, memberships, roles.
- [x] Phase 7: Sharing and reporting: share links, dedicated PDF/CSV exports.

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

### Phase 4 Tasks

- [x] Write failing backend tests for strict-enough planner payload validation.
- [x] Write failing backend tests for optimistic locking on account plan updates.
- [x] Write failing frontend tests for lock-version-aware API saves and signed-in autosave.
- [x] Implement server-side planner payload validation for sport, template, days, grid, blocks, and label presets.
- [x] Implement plan `lock_version` persistence and stale-update conflict handling.
- [x] Implement signed-in autosave after an account plan has been explicitly saved or loaded.
- [x] Run backend tests, frontend tests, build, and browser planner-data-safety verification before Phase 5.

### Phase 4 Review

- Added account plan `lock_version` to API responses, in-memory storage, PostgreSQL scans, and a new migration.
- Added server-side planner payload validation for allowed sports/templates, complete day/grid/block maps, workload levels, numeric training-block ranges, and bounded labels/notes.
- Account plan updates now require the current `lock_version`, increment it on success, and return `409` on stale writes.
- Frontend account saves now `POST` new plans and `PUT` existing account plans with the current lock version.
- Planner state now starts signed-in autosave only after an account plan has been saved or loaded, keeps server lock metadata outside `plan_json`, and shows account autosave state in the saved-plans drawer.
- Verification passed: `go test ./...` in `backend/`; `npm test -- --watch=false` in `frontend/`; `API_BASE_URL=http://127.0.0.1:8081 npm run build`.
- Browser verification passed with backend memory API at `http://127.0.0.1:8081` and frontend at `http://127.0.0.1:4302`: account creation, manual account save, visible `Account autosave: saved`, and autosave after editing a planner cell.
- Browser screenshot saved at `frontend/__screenshots__/phase-4-data-safety.png`.

### Phase 5 Tasks

- [x] Write failing backend tests for automatic plan version snapshots.
- [x] Write failing backend tests for listing/restoring plan versions.
- [x] Write failing backend tests for duplicating an existing week into a new plan.
- [x] Write failing frontend tests for version/duplicate API calls and planner state restore.
- [x] Implement `plan_versions` persistence, migration, and API routes.
- [x] Implement frontend version history, restore, and duplicate controls for account plans.
- [x] Run backend tests, frontend tests, build, and browser versioning verification before Phase 6.

### Phase 5 Review

- Added `plan_versions` persistence with snapshots on create, update, restore, and duplicate.
- Added `GET /api/plans/{id}/versions`, `POST /api/plans/{id}/versions/{versionID}/restore`, and `POST /api/plans/{id}/duplicate`.
- Postgres create/update/restore/duplicate version writes now run transactionally so plan state and history do not drift.
- Added frontend API calls, saved-plan drawer `History`, `Restore`, and `Duplicate` controls, and state orchestration that keeps lock metadata current after restore/duplicate.
- Fixed production static serving for `/wails/custom.js` so browser tests no longer receive Angular HTML as a JavaScript file.
- Disabled Angular critical CSS inlining in production to avoid CSP-blocked inline `onload` handlers.
- Verification passed: `go test ./...` in `backend/`; `npm run test:node`; `npm test -- --watch=false`; `API_BASE_URL=http://127.0.0.1:8081 npm run build`.
- Browser verification passed at `http://127.0.0.1:4302`: account creation, account save, version history, restore, duplicate week, copied plan visibility, and no unexpected console errors.
- Browser screenshot saved at `frontend/__screenshots__/phase-5-versioning.png`.

### Phase 6 Tasks

- [x] Write failing backend tests for default organization creation on registration.
- [x] Write failing backend tests for organization membership and role-limited plan access.
- [x] Write failing frontend tests for organization API calls and account-team state.
- [x] Implement organization and membership persistence with owner/member roles.
- [x] Scope account plans to an organization while preserving single-user default behavior.
- [x] Add minimal signed-in team controls for listing and creating organizations.
- [x] Run backend tests, frontend tests, build, and browser team-model verification before Phase 7.

### Phase 6 Review

- Added organizations and memberships with owner/member roles, automatic `My Team` creation on registration, and organization-scoped account plan access.
- Added minimal signed-in team controls in the saved-plans drawer for listing and creating teams.
- Verification passed: `go test ./...` in `backend/`; `npm run test:node`; `npm test -- --watch=false`; `API_BASE_URL=http://127.0.0.1:8081 npm run build`.
- Browser verification passed at `http://127.0.0.1:4302`: account creation, default `My Team` visibility, `Varsity Staff` team creation, account plan save, and no unexpected console errors.
- Browser screenshot saved at `frontend/__screenshots__/phase-6-team-model.png`.

### Phase 7 Tasks

- [x] Write failing backend tests for authenticated share-link creation and public read-only share lookup.
- [x] Write failing backend tests for CSV export of a saved plan.
- [x] Write failing frontend tests for share-link and CSV export API calls.
- [x] Implement share-link persistence, API routes, and public read-only lookup.
- [x] Implement CSV export route and frontend sharing/reporting controls.
- [x] Run backend tests, frontend tests, build, and browser sharing/reporting verification before final review.

### Phase 7 Review

- Added authenticated share-link creation for account plans and public read-only shared-plan lookup.
- Share tokens are generated as bearer tokens for the user, but only hashed tokens are stored by backend stores.
- Added `plan_shares` Postgres migration with `revoked_at` so revocation can be added without a schema rewrite.
- Added authenticated CSV export for saved plans with workload rows, AU values, and CSV formula-injection escaping for user-controlled text.
- Added frontend saved-plan controls for `Share` and `CSV`, plus service tests for both API surfaces.
- Verification passed: `go test ./...` in `backend/`; `npm run test:node`; `npm test -- --watch=false`; `API_BASE_URL=http://127.0.0.1:8081 npm run build`.
- Browser verification passed at `http://127.0.0.1:4302`: create a training block, create account, save plan, create share link, fetch public read-only shared plan, fetch authenticated CSV export, and no unexpected console errors.
- Browser screenshot saved at `frontend/__screenshots__/phase-7-sharing-reporting.png`.

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
