# E2E tests (Playwright)

Run with:

```bash
npm run test:e2e
```

`playwright.config.ts` auto-starts the Vite dev server (`npm run dev`) for you. It does **not** start the backend or database — these tests hit a real backend at `http://localhost:3000` (the frontend's default API base URL), so the backend + Postgres must already be running with the seed data applied (`npm run prisma:seed` in `backend/`).

## Credentials

Tests log in as the seeded `SUPER_ADMIN` account. Override via env vars if your seed data differs:

```bash
E2E_ADMIN_EMAIL=admin@virata-hr.local E2E_ADMIN_PASSWORD=ChangeMe123! npm run test:e2e
```

## Coverage and known gaps

- `auth.spec.ts` — login form rendering, client-side required-field validation, invalid-credentials error, successful login, logout + protected-route redirect.
- `navigation.spec.ts` — sidebar nav reaches every SUPER_ADMIN page without a crash, Command Palette open/search/navigate/close-on-Escape, Employees search filtering, Drawer focus-trap + Escape-close, a destructive-action confirm dialog (cancel path only — these tests never confirm a real delete).

**Only one seeded account (`SUPER_ADMIN`) exists in this environment**, so role-based *route-blocking* (Manager/Employee/Finance hitting a page they shouldn't reach) is **not** exercised here end-to-end — it's covered exhaustively instead by the pure-function unit tests in `src/config/navigation.test.ts`, which check `isPathAllowed`/`getNavItems` for all five roles without needing a live login. If HR_ADMIN/MANAGER/FINANCE/EMPLOYEE test accounts are added to the seed data later, extend `navigation.spec.ts` with a `login(page, role)` helper per account to close this gap at the E2E layer too.
