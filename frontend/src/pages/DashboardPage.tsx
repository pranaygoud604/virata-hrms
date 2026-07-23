import { useAuth } from "../auth/AuthContext";
import SuperAdminDashboard from "../dashboards/SuperAdminDashboard";
import HRAdminDashboard from "../dashboards/HRAdminDashboard";
import ManagerDashboard from "../dashboards/ManagerDashboard";
import EmployeeDashboard from "../dashboards/EmployeeDashboard";

export default function DashboardPage() {
  const { user } = useAuth();

  switch (user?.role) {
    case "SUPER_ADMIN":
      return <SuperAdminDashboard />;
    case "HR_ADMIN":
      return <HRAdminDashboard />;
    case "MANAGER":
      return <ManagerDashboard />;
    default:
      return <EmployeeDashboard />;
  }
}
