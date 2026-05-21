# Practice Planner Backend

Railway-ready Go API for the production MVP.

## Configuration

- `DATABASE_URL`: PostgreSQL connection URL.
- `SESSION_SECRET`: high-entropy secret used to hash session tokens.
- `ALLOWED_ORIGINS`: comma-separated browser origins allowed for credentialed CORS.
- `PORT`: bind port, defaults to `8080`.
- `ENV`: set to `production` on Railway to enable secure cookies.

## Run locally

```sh
go mod download
DATABASE_URL="postgres://..." SESSION_SECRET="dev-secret-change-me" ALLOWED_ORIGINS="http://localhost:4200" go run ./cmd/api
```

The server applies embedded SQL migrations on startup.

## Railway

Create a Railway service rooted at `backend/`, add a PostgreSQL plugin, and set:

```txt
DATABASE_URL=${{Postgres.DATABASE_URL}}
SESSION_SECRET=<generated-secret>
ALLOWED_ORIGINS=https://your-frontend-origin.example
ENV=production
```

Railway supplies `PORT`; no custom start command is needed when using the included `railway.toml`.

