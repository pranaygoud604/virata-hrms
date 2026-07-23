import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { isPathAllowed } from "../config/navigation";

/**
 * Blocks a role from ever rendering a page outside its own navigation —
 * defense in depth against typing a URL directly, not just hiding the nav
 * link. Redirects to "/" rather than showing a page that would just 403
 * against the API anyway.
 */
export default function RoleGuard() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace />;
  if (!isPathAllowed(user.role, location.pathname)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
