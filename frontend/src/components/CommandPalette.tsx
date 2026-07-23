import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Fingerprint, CalendarDays, Receipt, Moon, Sun, LogOut, ArrowRight, User, Building2 } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import { getNavItems } from "../config/navigation";
import { useFocusTrap } from "../hooks/useFocusTrap";
import type { Department, Employee } from "../api/types";

const PEOPLE_SEARCH_ROLES = ["SUPER_ADMIN", "HR_ADMIN", "MANAGER", "FINANCE"];

interface NavAction {
  label: string;
  group: "Navigate" | "Quick actions" | "People" | "Departments";
  icon: React.ReactNode;
  action: () => void;
  keywords?: string;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const canSearchPeople = user ? PEOPLE_SEARCH_ROLES.includes(user.role) : false;
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open);

  const employees = useQuery({
    queryKey: ["employees"],
    queryFn: async () => (await api.get<Employee[]>("/employees")).data,
    enabled: open && canSearchPeople,
  });
  const departments = useQuery({
    queryKey: ["departments"],
    queryFn: async () => (await api.get<Department[]>("/departments")).data,
    enabled: open && canSearchPeople,
  });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function go(path: string) {
    navigate(path);
    setOpen(false);
  }

  const iconProps = { size: 16, strokeWidth: 1.75 };
  const navItems = user ? getNavItems(user.role) : [];
  const actions: NavAction[] = [
    ...navItems.map((item) => ({
      label: item.label,
      group: "Navigate" as const,
      icon: <item.icon {...iconProps} />,
      action: () => go(item.to),
    })),
    { label: "Check in / Check out", group: "Quick actions", icon: <Fingerprint {...iconProps} />, keywords: "attendance gps", action: () => go("/attendance") },
    { label: "Apply for leave", group: "Quick actions", icon: <CalendarDays {...iconProps} />, action: () => go("/leave") },
    { label: "Submit an expense claim", group: "Quick actions", icon: <Receipt {...iconProps} />, action: () => go("/expenses") },
    {
      label: theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
      group: "Quick actions",
      icon: theme === "dark" ? <Sun {...iconProps} /> : <Moon {...iconProps} />,
      action: () => { toggle(); setOpen(false); },
    },
    { label: "Sign out", group: "Quick actions", icon: <LogOut {...iconProps} />, action: () => { logout(); go("/login"); } },
  ];

  const peopleActions: NavAction[] = search.trim()
    ? (employees.data ?? []).map((e) => ({
        label: `${e.firstName} ${e.lastName}`,
        group: "People" as const,
        icon: <User {...iconProps} />,
        keywords: `${e.employeeCode} ${e.department?.name ?? ""} ${e.designation?.title ?? ""}`,
        action: () => go(`/employees?open=${e.id}`),
      }))
    : [];
  const departmentActions: NavAction[] = search.trim()
    ? (departments.data ?? []).map((d) => ({
        label: d.name,
        group: "Departments" as const,
        icon: <Building2 {...iconProps} />,
        action: () => go("/administration"),
      }))
    : [];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg rounded-2xl border border-line bg-surface-1 shadow-floating overflow-hidden"
          >
            <Command
              label="Command Palette"
              filter={(value, search, keywords) => {
                const haystack = `${value} ${keywords?.join(" ") ?? ""}`.toLowerCase();
                return haystack.includes(search.toLowerCase()) ? 1 : 0;
              }}
            >
              <div className="flex items-center gap-2 border-b border-line px-4 py-3">
                <ArrowRight size={15} className="text-ink-300" strokeWidth={1.75} />
                <Command.Input
                  // eslint-disable-next-line jsx-a11y/no-autofocus -- modal search-first dialog; WAI-ARIA combobox pattern expects this
                  autoFocus
                  value={search}
                  onValueChange={setSearch}
                  placeholder={canSearchPeople ? "Search people, departments, or jump to…" : "Search or jump to…"}
                  className="w-full bg-transparent text-sm text-ink-900 placeholder:text-ink-300 outline-none py-1"
                />
                <kbd className="text-[10px] font-medium text-ink-300 border border-line rounded px-1.5 py-0.5">ESC</kbd>
              </div>
              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="px-3 py-8 text-center text-sm text-ink-500">No matches.</Command.Empty>
                {(["Navigate", "People", "Departments", "Quick actions"] as const).map((group) => (
                  <Command.Group
                    key={group}
                    heading={group}
                    className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-ink-300"
                  >
                    {[...actions, ...peopleActions, ...departmentActions]
                      .filter((a) => a.group === group)
                      .map((a) => (
                        <Command.Item
                          key={`${a.group}-${a.label}`}
                          value={`${a.group}-${a.label}`}
                          keywords={[a.label, ...(a.keywords ? [a.keywords] : [])]}
                          onSelect={a.action}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-900 cursor-pointer data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent transition-colors"
                        >
                          <span className="text-ink-500">{a.icon}</span>
                          {a.label}
                        </Command.Item>
                      ))}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
