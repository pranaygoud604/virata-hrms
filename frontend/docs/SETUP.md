# Environment Setup & Build Guide

## Prerequisites

- Node.js 18+ and npm
- The backend running (see `../backend`), with its Postgres database migrated and seeded — this frontend has no offline/mock mode; every page needs a real API to talk to.

## Environment variables

One variable, read via `import.meta.env` (Vite's standard mechanism — never `process.env` in browser code):

| Variable | Default if unset | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | Base URL the axios client (`src/api/client.ts`) prefixes every request with |

Set it in a `.env` file at the frontend root (gitignored) for local overrides, or via your hosting provider's environment variable settings for deployed builds:

```bash
# frontend/.env
VITE_API_URL=https://api.your-domain.com
```

Vite only exposes variables prefixed `VITE_` to client code — this is a Vite security feature, not a project convention, so don't rename it without also updating `client.ts`.

There are no secrets in the frontend build — no API keys, no auth secrets. Anything sensitive (JWT signing secrets, DB credentials) lives in the backend's own `.env`, which this app never reads.

## Local development

```bash
cd frontend
npm install
npm run dev
```

Opens on `http://localhost:5173` (configured in `vite.config.ts`). Requires the backend reachable at `VITE_API_URL` (defaults to `http://localhost:3000`).

## Production build

```bash
npm run build
```

Runs `tsc -b` (type-check; the build fails if this fails) then `vite build`, producing a static `dist/` folder: one `index.html`, route-level JS chunks (via `React.lazy`), and CSS. This is a pure static-file output — serve it with any static file server or CDN; there is no Node server required to run the built app (see `docs/DEPLOYMENT.md`).

```bash
npm run preview   # serve dist/ locally to sanity-check the production build
```

## Verifying a clean setup

Before considering a change ready, all four of these should be clean:

```bash
npx tsc -b              # 0 errors
npm run lint             # 0 errors, 0 warnings
npm test                 # Vitest unit/component suite
npm run build            # production build succeeds
```

`npm run test:e2e` additionally requires the backend + Postgres running and seeded — see `e2e/README.md`.
