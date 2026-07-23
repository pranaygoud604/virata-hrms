# Admin User Guide

For HR Admin, Super Admin, Manager, and Finance roles. What each of you sees in the sidebar differs — this guide covers every screen; skip the sections your role doesn't have a link for.

## Signing in and getting around

Sign in with your email and password at `/login`. Your sidebar (left on desktop, bottom bar on mobile) only lists the sections your role can use — that's intentional, not a bug, and typing a URL for a section you can't see won't let you in either.

Press **Ctrl+K** (or **⌘K** on Mac) anywhere to open the Command Palette — jump to any page, search for a person or department by name (HR/Admin/Manager/Finance roles only), check in/out, or sign out, all without touching the mouse.

Your account menu (bottom of the sidebar) shows your email and role, and is where you sign out.

## Dashboard

Your landing page. Super Admin and HR Admin see a company-wide overview (headcount, today's attendance %, pending approvals, hiring pipeline); Managers see their team; everyone also sees their own attendance/leave status. Super Admin's dashboard is customizable — the "Customize" button lets you reorder or hide widgets; it remembers your layout.

## Employees (HR Admin, Super Admin, Manager)

The full people directory (Managers see only their direct reports, labeled "My Team"). Search by name, sort any column, and:
- **Add person** — opens a form for a single new employee.
- **Import** (HR Admin/Super Admin) — upload a CSV (`firstName, lastName, department, designation, dateOfJoining, email, phone`; department/designation names must match existing ones exactly). You'll see a preview with any row errors called out before anything is created.
- **Export** — downloads the current filtered view as CSV.
- **Bulk actions** — select multiple people (checkboxes) to change their department, shift, or grant a leave allocation all at once.

Click a row to open that person's profile drawer.

## Attendance

Everyone sees their own check-in/out here (see the Employee Guide for that part). HR Admin/Super Admin additionally see the team history and geofence-based location data recorded with each check-in.

## Leave

Apply for your own leave, see your balance by leave type, and view your request history. HR Admin/Super Admin/Manager additionally see a **Pending your approval** panel to approve or reject direct reports' requests, and HR Admin/Super Admin can manage the list of leave types (Casual, Sick, Earned, etc. — add a new type, set its annual allocation and whether it carries forward) and grant comp-off credit for a specific worked holiday/weekend.

## Payroll (HR Admin, Super Admin, Finance)

- **Set salary structure** — Basic/HRA/Special Allowance per employee, effective from a given date.
- **Process payroll run** — pick a month/year to generate payslips for everyone with an active salary structure. After processing, you can download the bank transfer file for that run.
- **Bank details** — an employee's account number/IFSC/bank name for payouts.
- **Bonus/deduction** — a one-off ad-hoc amount applied automatically to that employee's next processed run.

Everyone (including Employee role) can view and print their own payslips from this same page.

## Recruitment (HR Admin, Super Admin)

Post an open role, then track candidates through the pipeline: Applied → Screening → Interview → Offer → Hired/Rejected. Drag a candidate's card between columns, or — if you're not using a mouse — use the stage dropdown on the card itself, which does the same thing. Schedule interviews and generate offer letters from a candidate's card; the funnel chart above the table updates live as candidates move stages.

## Performance

Everyone submits their own self-review and tracks their own goals' progress. Managers additionally submit a manager review for their reports and can promote someone (records a new designation + effective date). HR Admin/Super Admin create performance cycles (a review period) and open/close them, and can view goal/review completion aggregated company-wide from the Reports page.

## Expenses

Submit your own claims with receipts (a URL per receipt — paste a link to an already-hosted image/PDF). Managers/HR Admin/Super Admin/Finance additionally approve or reject pending claims; Finance additionally marks approved claims as reimbursed once paid out.

## Reports (HR Admin, Super Admin, Manager, Finance)

Attendance, Leave, Payroll Register, Department headcount, and Performance — each tab has its own filters (month/year/employee) and an Export button for a CSV of exactly what's on screen. Managers see figures scoped to their own team where applicable.

## Administration (HR Admin, Super Admin)

Manage Departments, Designations, and Geofenced office locations (add a site by name + coordinates + radius — this is what attendance check-in validates against). The Policies tab is a read-only overview; attendance/payroll policy values (geofence enforcement, PF/ESI/PT/TDS rates) are fixed backend configuration with no in-app editor — see that tab's own note if you need one changed.

## Organization Chart (HR Admin, Super Admin, Manager)

The full reporting hierarchy as a collapsible tree. Search a name to jump straight to them; click anyone to see their quick-view profile.

## Approval Center (all roles with something to approve)

One inbox for every pending Leave request and Expense claim awaiting your decision, instead of hunting through each page separately.

## Notification Center & Calendar

The bell icon (top right) previews your recent notifications; the full Notification Center lists everything with filters for channel and read/unread. Calendar overlays your attendance, leave, holidays, and (if you approve for others) their pending leave and any interviews you have scheduled, all in one month view.
