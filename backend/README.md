# Virata HR — Backend (Phase 1–4, complete)

NestJS + Prisma + PostgreSQL API covering all four phases of the [Virata HR requirements](../REQUIREMENTS.md):
**Employee Management**, **Attendance with GPS Geo-Fencing**, **Leave Management**, **Payroll**,
**Expense & Reimbursement**, **Reports & Analytics**, **Performance Management**, and **Recruitment**.
All 12 modules from the original requirements doc now have a backend — the Flutter mobile app and a
web frontend are the remaining pieces (see "What's intentionally NOT here yet").

## What's implemented

**Phase 1**
- **Auth** — JWT access tokens (short-lived) + refresh tokens (hashed at rest, rotated on use), role-based guards.
- **RBAC** — `SUPER_ADMIN`, `HR_ADMIN`, `MANAGER`, `FINANCE`, `EMPLOYEE` roles enforced via `@Roles()` + `RolesGuard`.
- **Departments / Designations / Shifts** — CRUD, department hierarchy support.
- **Employees** — CRUD, automatic sequential employee code generation (`VH-2026-0001`, atomic under concurrency), exit workflow.
- **Geo-fence locations** — CRUD for approved sites/offices with lat/lng + radius.
- **Attendance** — check-in/out with GPS coordinates, geo-fence validation (haversine distance against every active location), break tracking, late-arrival detection against the employee's shift, correction requests, history.

**Phase 2**
- **Leave** — leave types, per-employee/year allocations (with carry-forward), holiday calendar, apply/approve/reject/cancel with a working-day-aware balance calculation (excludes weekends + holidays), single-level manager approval with HR/Super Admin override, comp-off credit grant + consumption.
- **Payroll** — salary structures, bank details, ad-hoc bonus/incentive/deduction/loan-EMI components, payroll run processing that computes attendance-and-leave-aware prorated pay, overtime (from actual check-in/out vs shift hours), PF/ESI/Professional Tax/TDS deductions, payslip generation, bank-transfer CSV export.
- **Notifications** — in-app notifications, fired automatically on leave approval/rejection, payslip generation, and expense decisions/reimbursement.

**Phase 3**
- **Expense & Reimbursement** — claim submission with category/amount/date, receipt attachment (URL-based — see caveat below), manager/HR approval, mark-reimbursed.
- **Reports & Analytics** — attendance summary (present/late/half-day/on-leave/unrecorded-absent per employee per month, weekend+holiday aware), leave balance/utilization report, payroll register (per run, with totals), HR dashboard (headcount by status, today's attendance %, pending leave/expense approval counts, next holiday).
**Phase 4**
- **Performance Management** — appraisal cycles, per-cycle goals (with weight/target/achieved value — this is also where "KPI tracking" lives, as a metric on a goal rather than a separate catalog), self- and manager-reviews (1–5 rating + strengths/improvements), promotion records that atomically update the employee's designation and notify them.
- **Recruitment** — job postings (with a **public**, unauthenticated careers-page listing — candidates don't have accounts), candidate applications (also public) and pipeline stage tracking, interview scheduling + feedback, offers with a plain-text offer-letter endpoint.
- **Swagger** — full interactive API docs at `/api/docs`, now covering all four phases.

## What's intentionally NOT here yet

The Flutter mobile app and a web frontend are the two pieces of the original ask with nothing built yet — this repo is API-only. OTP login and MFA are also deferred; JWT + refresh is the working baseline for now. Leave, expense, and goal-progress approval are all single-level (direct manager, or HR/Super Admin override) — the requirements doc mentions optional multi-level approval chains, which would need a configurable approval-chain model on top of this.

**Resume parsing** was in the enterprise mega-spec but not in the actual client requirements doc, so it's out of scope — candidates supply a `resumeUrl` (uploaded elsewhere) rather than a parsed structured resume. **Offer letters** are generated as plain text via `GET /offers/:id/letter`, not a rendered/branded PDF — no PDF templating library is wired in yet. Same file-upload caveat as expense receipts applies to resumes: this API stores the URL, not the file.

**Employee-wise productivity reporting** (listed in the original requirements) is deliberately not implemented — there's no agreed definition of "productivity" for this org yet, and fabricating a score from attendance data alone would be more misleading than useful. Define the metric first, then it's a straightforward addition to the reports module.

**Expense receipts**: this API stores receipt *URLs*, it doesn't handle file upload itself. The intended flow is: frontend uploads the file directly to object storage (Supabase Storage, S3, etc.) and passes the resulting URL to `POST /expenses`. Wiring up actual storage is unimplemented — no credentials/bucket exist yet.

### Payroll — read before using this for real payroll

`src/payroll/payroll-config.ts` documents this explicitly, but it's worth repeating here: **the PF/ESI/Professional Tax/TDS rates are illustrative defaults, not verified-current statutory figures.** PF/ESI wage ceilings, PT slabs (state-specific — the seeded default is a Telangana example), and income tax slabs all change by government notification. The TDS calculation in particular is a simplified estimate with no HRA exemption, Section 80C, or old-vs-new-regime handling — it exists so a payslip has a TDS line, not as a compliance-grade tax engine. **Verify every rate against current rules (or a compliance provider) before running real payroll.**

Statutory deductions (PF/ESI/PT) are calculated on the *prorated* month's earnings; TDS is estimated off the employee's full contracted monthly gross annualized (×12), so one light-attendance month doesn't distort the TDS estimate. Both are documented assumptions, not settled payroll law — reasonable people could compute this differently.

## Prerequisites

- Node.js 20+
- Docker (for local Postgres) — or point `DATABASE_URL` at an existing Postgres/Supabase instance

## Setup

```bash
cd backend
cp .env.example .env          # edit secrets as needed
npm install
docker compose up -d          # starts local Postgres
npm run prisma:migrate        # creates tables
npm run prisma:seed           # creates departments, shift, geo-fence location, 5 leave types, and a super admin login
npm run start:dev
```

The API starts on `http://localhost:3000`. Swagger docs: `http://localhost:3000/api/docs`.

Seeded login (from `.env`): `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (defaults: `admin@virata-hr.local` / `ChangeMe123!` — change these before using anywhere real).

## Trying it end-to-end

**Phase 1 (attendance)**
1. `POST /auth/login` with the seeded credentials → returns `accessToken` + `refreshToken`.
2. `POST /employees` to onboard someone (needs a `departmentId`/`designationId` from `GET /departments` / `GET /designations`).
3. Link a `User` to that employee (not yet exposed as an endpoint — use `npx prisma studio` for now) then log in as them.
4. `POST /attendance/check-in` with `{ "latitude": 17.4126, "longitude": 78.4482 }` — matches the seeded Head Office geo-fence.

**Phase 2 (leave + payroll)**
5. `GET /leave-types` to see the seeded types, then `POST /leave-allocations` to give the employee a balance for the current year.
6. As the employee: `POST /leave-requests` to apply; as their manager (or HR/Super Admin): `PATCH /leave-requests/:id/approve`.
7. `POST /salary-structures` to set a basic/HRA/special-allowance structure for the employee, effective from a past date.
8. `POST /payroll/runs/process` with `{ "month": 7, "year": 2026 }` — generates payslips for every active employee with a salary structure, prorated by attendance/paid-leave for that month.
9. `GET /payroll/payslips/me` (as the employee) or `GET /payroll/runs/:payrollRunId/bank-file` (as HR/Finance, returns CSV) to see the result.

**Phase 3 (expenses + reports)**
10. As the employee: `POST /expenses` with `{ "category": "Travel", "amount": 1450.50, "expenseDate": "2026-07-18" }`; as their manager or HR: `PATCH /expenses/:id/approve`, then HR/Finance: `PATCH /expenses/:id/reimburse`.
11. `GET /reports/dashboard` for the HR summary tile view; `GET /reports/attendance?month=7&year=2026` and `GET /reports/leave?year=2026` for the detailed reports; `GET /reports/payroll/:payrollRunId` for the payroll register from step 8.

**Phase 4 (performance + recruitment)**
12. `POST /performance-cycles` to open a cycle, `POST /goals` to set a goal for the employee in it, then `POST /performance-reviews/self` and `POST /performance-reviews/manager` to record both sides of the review.
13. `GET /job-postings` (no auth needed — this is the public careers listing) to see open roles; `POST /candidates` (also no auth) to apply; then as HR: `PATCH /candidates/:id/stage`, `POST /interviews`, `POST /offers`, and `GET /offers/:id/letter` for the offer text.

## Geo-fence enforcement

Controlled by `ENFORCE_GEOFENCE` in `.env`:
- `true` (default): check-in/out outside every active geo-fence radius is rejected (403).
- `false`: still recorded, just flagged `checkInWithinGeofence: false` for later review.

## Tests

```bash
npm test
```

29 tests across 4 suites, focused on the logic most likely to be subtly wrong:
- `src/attendance/geofence.util.spec.ts` — haversine distance / geo-fence containment
- `src/leave/working-days.util.spec.ts` — weekend/holiday-aware working-day counting
- `src/payroll/payroll-calculator.spec.ts` — PF/ESI/PT/TDS/overtime math and attendance-to-paid-days logic
- `src/reports/attendance-summary.spec.ts` — attendance/leave/absence bucketing for reports

This is a starting baseline, not the ">90% coverage" end state from the original ask — controller/service integration tests (which need a real or in-memory database) should be added next.

## Database

Schema lives in `prisma/schema.prisma`. Run `npx prisma studio` for a GUI to browse/edit data, or `npx prisma migrate dev` after changing the schema to create a new migration.

## Verification note

This sandbox has no Docker/local Postgres, so the app has not been booted against a live database — everything checkable without one has been: `npx prisma validate`, `npx prisma generate`, `npx tsc --noEmit`, `npx nest build`, and the full test suite all pass clean. Run `docker compose up -d && npm run prisma:migrate && npm run prisma:seed && npm run start:dev` to close that last gap.
