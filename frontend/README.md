# Practice Planner Frontend

Angular production MVP for the weekly demand planner.

## Commands

```sh
npm install
npm start
npm test -- --watch=false
npm run build
```

## API Configuration

Local development uses `src/environments/environment.development.ts`:

```ts
apiBaseUrl: 'http://localhost:8080'
```

Production builds use `src/environments/environment.ts`. Railway runs `scripts/write-environment.mjs` before `npm run build`, so set `API_BASE_URL` to the Railway backend origin in the frontend service variables.

## Railway

Create a Railway service with root directory `/frontend` and config file `/frontend/railway.toml`. The production server serves `dist/frontend/browser` and falls back to `index.html` for Angular routes.
