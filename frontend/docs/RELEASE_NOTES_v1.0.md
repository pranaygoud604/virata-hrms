# Release Notes — v1.0 (Production Readiness)

This release contains no new HRMS features and no backend changes. It's the frontend hardening pass that takes the already-feature-complete app from "works" to "ready to run for paying customers": accessibility, error handling, testing, security, performance, and operational documentation.

## Highlights

**Never fails silently.** A global toast system now backs every mutation in the app — Employees, Attendance, Leave, Payroll, Recruitment, Performance, Expenses, Administration, Approval Center, Reports, Notifications, Shifts/Holidays, Organization Chart, and Calendar. Every `useMutation` has both success and error feedback; every data-fetching page has an explicit loading/empty/error+retry state via a shared `ErrorState` component.

**Accessible by construction.** `Drawer` and `ConfirmDialog` share one focus-trap hook (initial focus, Tab cycling, scroll lock, restore-focus-on-close) rather than each reimplementing it, so every drawer and confirmation dialog in the app inherits the same WAI-ARIA-conformant behavior automatically. The Recruitment Kanban board keeps its drag-and-drop but now also has a keyboard-operable stage selector on every candidate card. A full sitewide sweep added missing `aria-label`s, `aria-expanded`/`aria-haspopup` on every popover trigger, proper `<label htmlFor>`/`id` pairing on every form control (previously ~80 unlabeled instances across 10 pages), and `role="progressbar"`/`role="menu"`/`role="alert"` where semantically correct.

**Confirmation before every destructive action.** One reusable `ConfirmDialog`, wired into every destructive action that has a real backend endpoint (delete department/designation/shift, deactivate geofence, cancel leave, remove an unsaved receipt). Actions the user asked for but that have no backend endpoint (delete employee, delete holiday, delete payroll run, delete review, delete goal) were deliberately left unimplemented rather than faked — see "Known Backend Limitations" below.

**Faster.** Route-level code splitting (`React.lazy` + `Suspense`) across all 14 authenticated routes cut the initial bundle from ~942KB to ~478KB gzip; a heavy per-route dependency (the Leaflet geofence map) is now isolated to just the Attendance route instead of shipping on every page. `QueryClient` now has a sane 30s `staleTime` to cut redundant refetches.

**ESLint installed from scratch and passing at zero errors** — TypeScript, React, Hooks (`rules-of-hooks`/`exhaustive-deps`), `jsx-a11y`, and unused-imports, previously not configured at all despite an `npm run lint` script existing.

**A real automated test suite**, previously nonexistent: Vitest + React Testing Library for units/components, `jest-axe` for automated accessibility assertions on every shared dialog/toast primitive, and Playwright for end-to-end coverage of login, RBAC-gated navigation, the Command Palette, and a destructive-action confirm flow — run against a live backend, not mocked. See "Test Coverage Summary" in the final QA report for the full breakdown.

**Security hardening**, all backend-independent:
- Fixed a real gap: `PayrollPage.tsx`'s printable payslip interpolated the employee's name into a `document.write()`'d HTML string without escaping it (inconsistent with the offer-letter viewer, which already did this correctly) — now goes through a shared `escapeHtml()` utility.
- Receipt/resume URLs are now restricted to `http(s)` before being rendered as clickable links or accepted by the expense-claim form, closing a `javascript:`/`data:` URI injection vector.
- CSV import now validates file extension and caps file size (5MB) before parsing, instead of trusting the `accept=".csv"` browser hint alone.
- Confirmed: no `dangerouslySetInnerHTML`/`eval`/raw `innerHTML` assignment anywhere in the app; JWT storage in `localStorage` (a pre-existing, backend-controlled auth design) is documented as a known tradeoff rather than silently accepted — see the Security Report.

**A bug E2E testing actually caught**: the account-menu dropdown in the sidebar (`IconRail.tsx`) was the one popover in the app missing the invisible click-outside-to-close backdrop every other dropdown has — under the right circumstances, page content underneath could intercept a click meant for the menu. Fixed to match the established pattern.

**Full documentation set** (this folder): architecture, coding standards, setup/build, deployment (Vercel/Netlify/Nginx/Docker configs included, not just described), troubleshooting, a developer guide, and separate Admin/Employee user guides.

## Explicitly not in this release

- No visual redesign, no UI rebuild, no new HRMS modules or workflows.
- No backend, API, database, authentication, or business-logic changes of any kind.
- No fabricated UI for backend capabilities that don't exist.

## Known Backend Limitations (unchanged by this release)

The following are UI gaps only because the backend has no supporting endpoint — implementing them would require backend changes, which were explicitly out of scope:

- Delete Employee (only exit/deactivate exists)
- Delete Holiday
- Delete Payroll Run
- Delete Performance Review
- Delete Goal
- Attendance corrections, asset requests, and recruitment stages have no formal approval-workflow entity — the Approval Center only covers Leave and Expenses for real, and says so on-screen rather than pretending otherwise.

## Upgrade notes

Nothing behavior-changing for end users. Developers picking this branch up should run `npm install` (new dev dependencies: ESLint + plugins, Vitest + Testing Library + jest-axe, Playwright) and read `docs/CODING_STANDARDS.md` before their next PR — several previously-implicit conventions (toast on every mutation, confirm before delete, label/id pairing, shared formatting utilities) are now enforced by lint/tests, not just habit.
