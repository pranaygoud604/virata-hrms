import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Moon, Sun, LogOut, type LucideIcon } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import { getNavItems } from "../config/navigation";

function isActivePath(pathname: string, to: string, end?: boolean) {
  return end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
}

function RailButton({ to, end, icon: Icon, label, active }: { to: string; end?: boolean; icon: LucideIcon; label: string; active: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <NavLink
        to={to}
        end={end}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className="relative flex items-center justify-center h-11 w-11 rounded-2xl transition-colors"
        style={{ color: active ? "var(--accent)" : "var(--ink-500)" }}
      >
        {active && (
          <motion.span
            layoutId="rail-active"
            className="absolute inset-0 rounded-2xl bg-accent-soft"
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          />
        )}
        <Icon size={19} strokeWidth={1.75} className="relative" />
      </NavLink>
      {hover && (
        <motion.div
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.12 }}
          className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 whitespace-nowrap rounded-lg bg-ink-900 text-surface-0 text-xs font-medium px-2.5 py-1.5 shadow-floating pointer-events-none"
        >
          {label}
        </motion.div>
      )}
    </div>
  );
}

export default function IconRail({ mobile = false }: { mobile?: boolean }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();
  const [profileOpen, setProfileOpen] = useState(false);
  const navItems = user ? getNavItems(user.role) : [];

  return (
    <div className={`flex ${mobile ? "flex-row items-center h-16 px-2" : "flex-col items-center h-screen py-4"} gap-1 bg-surface-1 ${mobile ? "border-t" : "border-r"} border-line`}>
      {!mobile && (
        <div className="h-10 w-10 rounded-2xl bg-gradient-signature text-white flex items-center justify-center font-display font-semibold text-sm shrink-0 mb-4">
          VH
        </div>
      )}
      <nav className={`flex ${mobile ? "flex-row gap-1 flex-1 justify-around overflow-x-auto" : "flex-col gap-1 flex-1"}`}>
        {navItems.map((item) => (
          <RailButton key={item.to} to={item.to} end={item.end} icon={item.icon} label={item.label} active={isActivePath(location.pathname, item.to, item.end)} />
        ))}
      </nav>

      {!mobile && (
        <div className="flex flex-col items-center gap-1 relative">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="h-11 w-11 rounded-2xl flex items-center justify-center text-ink-500 hover:text-ink-900 hover:bg-surface-2 transition-colors"
          >
            {theme === "dark" ? <Sun size={17} strokeWidth={1.75} /> : <Moon size={17} strokeWidth={1.75} />}
          </button>
          <button
            onClick={() => setProfileOpen((v) => !v)}
            aria-label="Account menu"
            aria-haspopup="true"
            aria-expanded={profileOpen}
            className="h-11 w-11 rounded-2xl bg-brass-soft text-brass flex items-center justify-center text-xs font-semibold hover:ring-2 hover:ring-brass/30 transition-shadow"
          >
            {initials}
          </button>
          {profileOpen && (
            <>
              <div aria-hidden="true" className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
              <motion.div
                role="menu"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-0 left-full ml-3 w-56 rounded-2xl border border-line bg-surface-1 shadow-floating p-3 z-50"
              >
                <p className="text-xs font-medium text-ink-900 truncate">{user?.email}</p>
                <p className="text-[11px] text-ink-500 mb-2">{user?.role.replace("_", " ")}</p>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink-700 hover:bg-surface-2 transition-colors"
                >
                  <LogOut size={15} strokeWidth={1.75} /> Sign out
                </button>
              </motion.div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
