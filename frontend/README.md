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

Production builds use `src/environments/environment.ts`. Set `apiBaseUrl` to the Railway API origin before publishing the built Angular files to GitHub Pages.

## GitHub Pages

Build output is written to `dist/frontend/browser`. Publish that folder through your preferred GitHub Pages workflow.
