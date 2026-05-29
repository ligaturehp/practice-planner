# Practice Planner

Production MVP for a coach-facing weekly demand planner.

## App Shape

- `frontend/`: Angular app intended for GitHub Pages.
- `backend/`: Go API intended for Railway with Railway PostgreSQL.
- Root `index.html`, `styles.css`, and `app.js`: original static prototype kept for reference while the production app matures.

## Local Development

Frontend:

```sh
cd frontend
npm install
npm start
```

Backend:

```sh
createdb -h localhost -p 5432 practice_planner_dev
./scripts/run-backend-dev.sh
```

The local script defaults to `postgres://josephstich@localhost:5432/practice_planner_dev?sslmode=disable` and applies embedded migrations on startup. Override `DATABASE_URL`, `SESSION_SECRET`, `ALLOWED_ORIGINS`, or `PORT` in the shell when needed.

## Railway Deployment

Deploy this repo to Railway as two services plus one PostgreSQL database.

### Frontend Service

- Root directory: `/frontend`
- Config file: `/frontend/railway.toml`
- Public networking: enabled
- Build command: handled by `frontend/railway.toml`
- Start command: handled by `frontend/railway.toml`

Set one of these variables after the backend service URL exists:

```txt
API_BASE_URL=https://<your-backend-service>.up.railway.app
```

`frontend/railway.toml` writes the Angular production environment during the Railway build. `PRACTICE_PLANNER_API_ORIGIN` is also accepted as an alias.

### Backend Service

- Root directory: `/backend`
- Config file: `/backend/railway.toml`
- Public networking: enabled
- PostgreSQL: attach a Railway PostgreSQL database

Set:

```txt
DATABASE_URL=${{Postgres.DATABASE_URL}}
SESSION_SECRET=<generated-secret>
ALLOWED_ORIGINS=https://<your-frontend-service>.up.railway.app
ENV=production
```

Railway supplies `PORT` for both services. The frontend exposes `/healthz`, and the backend exposes `/healthz`.

## Mac Desktop Package

The desktop build uses Wails to package the Angular app with a local Go service. It does not use user accounts, sessions, Railway, or Postgres. Saved plans are stored in SQLite at:

```txt
~/Library/Application Support/Practice Planner/practice-planner.sqlite
```

One-time prerequisite:

```sh
go install github.com/wailsapp/wails/v3/cmd/wails3@latest
```

Build the local `.app` and `.dmg`:

```sh
./scripts/package-mac.sh
```

Outputs:

```txt
dist/mac/Practice Planner.app
dist/mac/Practice Planner.dmg
```

The script generates Wails bindings, builds the Angular frontend, runs the desktop Go tests, compiles the app, ad-hoc signs the local app bundle, and creates the DMG. The mounted DMG includes `Practice Planner.app` plus an `Applications` alias so users can drag the app into `/Applications`. For distribution outside your own Mac, sign and notarize with an Apple Developer ID before sharing.
