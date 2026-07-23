# Troubleshooting Guide

## Dev server / build

**`npm run dev` starts but every page shows a loading spinner forever, or every request fails in the browser console.**
The backend isn't running or `VITE_API_URL` is wrong. Confirm the backend is up at the URL you expect: `curl http://localhost:3000/auth/login` (a `400`/`401` response means it's alive; a connection error means it isn't). Then check `frontend/.env`'s `VITE_API_URL` matches.

**`npm run build` fails at the `tsc -b` step.**
That's a real type error — the build is intentionally wired to fail on one, rather than shipping a type-unsafe bundle. Run `npx tsc -b` directly to see the full error list; fix the types, don't add `as any` to silence it (see `docs/CODING_STANDARDS.md`).

**Changing `VITE_API_URL` after building doesn't do anything.**
Expected — it's inlined into the JS bundle at build time (Vite's behavior for all `VITE_*` vars). You must rebuild, not just restart the server or edit the deployed files. See `docs/DEPLOYMENT.md`.

## Login / auth

**Login always fails with "Invalid email or password." even with correct credentials.**
That exact message is shown for *any* login failure, including a network error reaching the backend (see `LoginPage.tsx`'s catch-all) — so this isn't necessarily a credentials problem. Open the browser Network tab and check what `/auth/login` actually returned. A CORS error there means the backend's CORS config doesn't allow the frontend's origin — that's a backend-side fix, out of this repo's scope.

**User gets bounced to `/login` immediately after a successful login, or randomly while using the app.**
The access token expired and the refresh attempt failed (see `src/api/client.ts`'s response interceptor) — this is by design when the refresh token has also expired or is invalid, not a bug. If it's happening right after a *fresh* login, check the backend's JWT expiry config and that the server's clock is correct (a skewed clock can make a freshly-issued token look already-expired).

**A user can see a page in the URL bar but it's blank / redirects to `/`.**
That's `RoleGuard` doing its job — the user's role isn't allowed on that path per `src/config/navigation.ts`'s `isPathAllowed`. If they *should* have access, that's a role-configuration question, not a frontend bug; if the nav sidebar also doesn't show a link for it, the two are in sync by design (and unit-tested to stay that way — see `src/config/navigation.test.ts`).

## UI behavior

**A dropdown/popover doesn't close when clicking outside it.**
Every popover in this app is supposed to have an invisible `fixed inset-0` backdrop that closes it on outside-click (see `docs/CODING_STANDARDS.md`'s "Popovers/dropdowns" guideline). If one doesn't, it's missing that backdrop — add it rather than reaching for a `document.addEventListener("click", ...)` workaround.

**A toast doesn't disappear on its own.**
`loading`-type toasts never auto-dismiss by design (`DEFAULT_DURATION.loading` is `undefined` in `ToastContext.tsx`) — they're meant to be explicitly `update()`d to `success`/`error` once the operation finishes. If a `loading` toast is stuck, the mutation that opened it likely has a code path that doesn't call `update()` (e.g. an early `return` before the `try`/`catch` resolves).

**A date is off by one day somewhere.**
Almost always a `new Date(isoString)` interpreting a date-only string ("2026-07-21T00:00:00.000Z") as UTC and rendering it in local time, which shifts backward a day in any positive-UTC-offset timezone (e.g. IST). Use `parseDateOnly()` from `utils/date.ts` instead — see that file's own comments and `utils/date.test.ts` for the exact failure mode this guards against.

## Testing

**Vitest hangs or times out on first run.**
The first run in a fresh environment pays a real cost spinning up jsdom + transforming dependencies (observed 15-60s+ in this repo's CI-like sandbox) — this is normal, not a hang. Subsequent runs are much faster. If it's genuinely stuck (no progress after several minutes), check for a test awaiting a real network call instead of a mock.

**A Vitest test using `vi.useFakeTimers()` passes alone but fails when run with the rest of the suite (or vice versa).**
Fake timers that outlive their test leak into the next one. Always pair `vi.useFakeTimers()` with a guaranteed `vi.useRealTimers()` — in an `afterEach`, or, more simply, avoid fake timers entirely for anything wrapped in `framer-motion`'s `AnimatePresence`: its exit-animation completion relies on real RAF timing, which fake timers don't drive, so a component can appear "stuck" mid-exit under fake time even though its underlying state already updated correctly. Prefer a short *real* duration (e.g. an explicit 50ms toast) plus `waitFor` over fake timers for anything animation-adjacent.

**A Playwright E2E test fails with "element intercepts pointer events" from a completely unrelated part of the page.**
This is exactly the bug class described above — a popover missing its backdrop, or two elements' stacking contexts overlapping unexpectedly (see `IconRail.tsx`'s account-menu fix, caught this exact way during v1.0 hardening). Don't work around it with a forced `{ force: true }` click in the test; fix the underlying stacking/backdrop issue.

**`npm run test:e2e` fails immediately with a connection error.**
The backend (and its database) must already be running and seeded — Playwright's config only auto-starts the *frontend* dev server. See `e2e/README.md`.
