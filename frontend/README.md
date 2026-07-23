# Virata HR — Frontend

The employee-facing web client for Virata HR: a role-based HRMS covering Employees, Attendance, Leave, Payroll, Recruitment, Performance, Expenses, Reports, Administration, Approvals, Notifications, and Calendar.

React 18 + TypeScript + Vite, talking to a locked NestJS/Prisma backend over REST.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173 — expects the backend on http://localhost:3000
```

Requires the backend (see `../backend/README.md` or its `.env.example`) and its Postgres database to already be running and seeded, since this app has no mock/offline mode.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check (`tsc -b`) then production build (`vite build`) into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint — TypeScript, React, Hooks, jsx-a11y, unused-imports |
| `npm test` | Run the Vitest unit/component suite once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Vitest with a v8 coverage report |
| `npm run test:e2e` | Playwright E2E suite (see `e2e/README.md` — needs a live backend) |

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — architecture overview and folder structure
- [`docs/CODING_STANDARDS.md`](docs/CODING_STANDARDS.md) — component guidelines and coding standards
- [`docs/SETUP.md`](docs/SETUP.md) — environment setup and build guide
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — deploying to Vercel, Netlify, Nginx, or Docker
- [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) — common problems and fixes
- [`docs/DEVELOPER_GUIDE.md`](docs/DEVELOPER_GUIDE.md) — adding a page, a mutation, a test
- [`docs/ADMIN_GUIDE.md`](docs/ADMIN_GUIDE.md) — user guide for HR/Admin/Finance/Manager roles
- [`docs/EMPLOYEE_GUIDE.md`](docs/EMPLOYEE_GUIDE.md) — user guide for the Employee role
- [`docs/RELEASE_NOTES_v1.0.md`](docs/RELEASE_NOTES_v1.0.md) — v1.0 release notes
- [`e2e/README.md`](e2e/README.md) — running the Playwright suite

## Tech stack

React 18 · TypeScript · Vite · Tailwind CSS · React Router 6 · TanStack Query 5 · React Hook Form + Zod · Framer Motion · Axios · `cmdk` (Command Palette) · Leaflet (geofence map).

## Status

Feature-complete, production-hardened v1.0. The backend is locked (no API/DB/auth/business-logic changes) — this app is frontend-only from here forward. See [`docs/RELEASE_NOTES_v1.0.md`](docs/RELEASE_NOTES_v1.0.md) for the full readiness report.
