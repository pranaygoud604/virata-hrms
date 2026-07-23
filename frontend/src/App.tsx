import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleGuard from "./components/RoleGuard";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import ErrorBoundary from "./components/ErrorBoundary";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const EmployeesPage = lazy(() => import("./pages/EmployeesPage"));
const AttendancePage = lazy(() => import("./pages/AttendancePage"));
const LeavePage = lazy(() => import("./pages/LeavePage"));
const ExpensesPage = lazy(() => import("./pages/ExpensesPage"));
const PayrollPage = lazy(() => import("./pages/PayrollPage"));
const ShiftsHolidaysPage = lazy(() => import("./pages/ShiftsHolidaysPage"));
const RecruitmentPage = lazy(() => import("./pages/RecruitmentPage"));
const PerformancePage = lazy(() => import("./pages/PerformancePage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const AdministrationPage = lazy(() => import("./pages/AdministrationPage"));
const OrganizationChartPage = lazy(() => import("./pages/OrganizationChartPage"));
const ApprovalCenterPage = lazy(() => import("./pages/ApprovalCenterPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const GlobalCalendarPage = lazy(() => import("./pages/GlobalCalendarPage"));

function RouteFallback() {
  return (
    <div className="flex items-center justify-center py-24 text-ink-300">
      <Loader2 size={22} strokeWidth={2} className="animate-spin" />
    </div>
  );
}

/** One route-level error boundary + Suspense fallback per page, so a crash or a chunk-load failure on one page never takes down the app shell (sidebar/router) around it. */
function RouteBoundary({ scope, children }: { scope: string; children: ReactNode }) {
  return (
    <ErrorBoundary scope={scope}>
      <Suspense fallback={<RouteFallback />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleGuard />}>
          <Route element={<Layout />}>
            <Route path="/" element={<RouteBoundary scope="Dashboard"><DashboardPage /></RouteBoundary>} />
            <Route path="/employees" element={<RouteBoundary scope="Employees"><EmployeesPage /></RouteBoundary>} />
            <Route path="/attendance" element={<RouteBoundary scope="Attendance"><AttendancePage /></RouteBoundary>} />
            <Route path="/leave" element={<RouteBoundary scope="Leave"><LeavePage /></RouteBoundary>} />
            <Route path="/expenses" element={<RouteBoundary scope="Expenses"><ExpensesPage /></RouteBoundary>} />
            <Route path="/payroll" element={<RouteBoundary scope="Payroll"><PayrollPage /></RouteBoundary>} />
            <Route path="/shifts-holidays" element={<RouteBoundary scope="Shifts & Holidays"><ShiftsHolidaysPage /></RouteBoundary>} />
            <Route path="/recruitment" element={<RouteBoundary scope="Recruitment"><RecruitmentPage /></RouteBoundary>} />
            <Route path="/performance" element={<RouteBoundary scope="Performance"><PerformancePage /></RouteBoundary>} />
            <Route path="/reports" element={<RouteBoundary scope="Reports"><ReportsPage /></RouteBoundary>} />
            <Route path="/administration" element={<RouteBoundary scope="Administration"><AdministrationPage /></RouteBoundary>} />
            <Route path="/organization-chart" element={<RouteBoundary scope="Organization Chart"><OrganizationChartPage /></RouteBoundary>} />
            <Route path="/approvals" element={<RouteBoundary scope="Approval Center"><ApprovalCenterPage /></RouteBoundary>} />
            <Route path="/notifications" element={<RouteBoundary scope="Notifications"><NotificationsPage /></RouteBoundary>} />
            <Route path="/calendar" element={<RouteBoundary scope="Calendar"><GlobalCalendarPage /></RouteBoundary>} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
