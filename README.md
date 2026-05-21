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
cd backend
go mod download
DATABASE_URL="postgres://..." SESSION_SECRET="dev-secret-change-me" ALLOWED_ORIGINS="http://localhost:4200" go run ./cmd/api
```

## Railway Deployment

Deploy this repo to Railway as two services plus one PostgreSQL database.

### Frontend Service

- Root directory: `/frontend`
- Config file: `/frontend/railway.toml`
- Public networking: enabled
- Build command: handled by `frontend/railway.toml`
- Start command: handled by `frontend/railway.toml`

Set this variable after the backend service URL exists:

```txt
PRACTICE_PLANNER_API_ORIGIN=https://<your-backend-service>.up.railway.app
```

The Angular production environment currently uses `frontend/src/environments/environment.ts`; update `apiBaseUrl` to the backend Railway URL before deploying the frontend.

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
