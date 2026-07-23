# Deployment Guide

This app builds to a static `dist/` folder (`npm run build`) — any of the options below work; pick whichever matches your existing infrastructure. All four configs referenced here already exist at the frontend root, ready to use as-is.

Every option needs one thing decided up front: **`VITE_API_URL`**, the backend's public URL. It's baked in at build time (Vite inlines `import.meta.env.VITE_API_URL` into the bundle), so it must be set correctly *before* building, not adjusted afterward.

## Vercel

`vercel.json` is already configured: build command, output directory, SPA rewrite (so `/employees`, `/payroll`, etc. don't 404 on refresh), asset caching, and baseline security headers.

1. Import the repo in the Vercel dashboard, set the project root to `frontend/`.
2. Set the environment variable `VITE_API_URL` to your backend's URL.
3. Deploy — Vercel picks up `vercel.json` automatically.

## Netlify

`netlify.toml` mirrors the same setup (build command, publish dir, SPA redirect, headers).

1. New site from Git, base directory `frontend/`.
2. Set `VITE_API_URL` in Site settings → Environment variables.
3. Deploy — Netlify reads `netlify.toml` automatically.

## Nginx (self-hosted / VM / bare metal)

```bash
npm run build
# copy dist/ to your server, e.g.:
rsync -av dist/ user@server:/var/www/virata-hr/
```

Use the provided `nginx.conf` as your server block (adjust `root` if your path differs). It handles:
- SPA fallback (`try_files ... /index.html`) so client-side routes work on refresh/direct-link
- Long-cache + immutable headers for hashed `/assets/*` files, no-cache for `index.html`
- gzip compression
- Baseline security headers (see the file's own comments — in particular, adjust the CSP's `connect-src` to your real backend origin; the shipped default only allows same-origin requests)

## Docker

The `Dockerfile` is a two-stage build: Node compiles the app, then a minimal `nginx:alpine` image serves the static output using the same `nginx.conf` described above.

```bash
docker build --build-arg VITE_API_URL=https://api.your-domain.com -t virata-hr-frontend .
docker run -p 8080:80 virata-hr-frontend
```

Because `VITE_API_URL` is baked into the JS bundle at build time, **you must rebuild the image** (not just restart the container) whenever the backend URL changes — there's no runtime env var to override it, by design (a static SPA has no server process to read one from).

## Cache invalidation notes

Every JS/CSS file Vite emits is content-hashed (e.g. `EmployeesPage-DdH2JYz-.js`), so it's safe to cache those forever (`immutable`) — a new deploy produces new filenames automatically. `index.html` is the only file that must never be cached, since it's what references the current set of hashed filenames; all four deployment configs above already set this correctly. If you put a CDN in front of any of these, make sure it respects the origin's `Cache-Control` headers rather than applying its own blanket TTL.

## Rollback

Since the build is a pure static artifact, rolling back is redeploying the previous `dist/` (Vercel/Netlify keep prior deployments and support instant rollback in their dashboards; for Docker/Nginx, keep the previous image tag or `dist/` archive around).

## What this frontend does NOT need at deploy time

No database migrations, no server process to restart mid-deploy, no secrets beyond `VITE_API_URL` (which isn't secret — it's a public URL, visible in the shipped JS regardless). Backend deployment (migrations, environment secrets, the database itself) is entirely out of scope here — see `../backend` for that.
