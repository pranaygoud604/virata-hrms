import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, Search, Users } from "lucide-react";
import { api } from "../api/client";
import { initials } from "../utils/format";
import Drawer from "../components/Drawer";
import ErrorState from "../components/ErrorState";
import type { Employee } from "../api/types";

interface TreeNode {
  employee: Employee;
  children: TreeNode[];
}

function buildTree(employees: Employee[]): TreeNode[] {
  const byManager = new Map<string | null, Employee[]>();
  for (const e of employees) {
    const key = e.managerId;
    byManager.set(key, [...(byManager.get(key) ?? []), e]);
  }
  function attach(managerId: string | null): TreeNode[] {
    return (byManager.get(managerId) ?? []).map((e) => ({ employee: e, children: attach(e.id) }));
  }
  return attach(null);
}

function countDescendants(node: TreeNode): number {
  return node.children.reduce((sum, c) => sum + 1 + countDescendants(c), 0);
}

function OrgNode({ node, depth, onSelect, highlightId }: { node: TreeNode; depth: number; onSelect: (e: Employee) => void; highlightId?: string }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const isHighlighted = highlightId === node.employee.id;

  return (
    <div>
      <div className="flex items-center gap-1" style={{ paddingLeft: depth * 24 }}>
        {hasChildren ? (
          <button onClick={() => setOpen((v) => !v)} className="h-5 w-5 rounded flex items-center justify-center text-ink-500 hover:bg-surface-2 shrink-0">
            {open ? <ChevronDown size={13} strokeWidth={2} /> : <ChevronRight size={13} strokeWidth={2} />}
          </button>
        ) : (
          <span className="h-5 w-5 shrink-0" />
        )}
        <button
          onClick={() => onSelect(node.employee)}
          className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 my-0.5 flex-1 text-left transition-colors ${isHighlighted ? "bg-accent-soft ring-1 ring-accent" : "hover:bg-surface-2"}`}
        >
          <span className="h-8 w-8 rounded-full bg-accent-soft text-accent flex items-center justify-center text-xs font-semibold shrink-0">
            {initials(node.employee.firstName, node.employee.lastName)}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-900 truncate">{node.employee.firstName} {node.employee.lastName}</p>
            <p className="text-xs text-ink-500 truncate">{node.employee.designation?.title} · {node.employee.department?.name}</p>
          </div>
          {hasChildren && (
            <span className="ml-auto text-[11px] text-ink-300 shrink-0 flex items-center gap-1">
              <Users size={11} strokeWidth={2} /> {countDescendants(node)}
            </span>
          )}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && hasChildren && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            {node.children.map((child) => (
              <OrgNode key={child.employee.id} node={child} depth={depth + 1} onSelect={onSelect} highlightId={highlightId} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function OrganizationChartPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Employee | null>(null);
  const employees = useQuery({ queryKey: ["employees"], queryFn: async () => (await api.get<Employee[]>("/employees")).data });

  const tree = useMemo(() => buildTree(employees.data ?? []), [employees.data]);

  const matchId = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return undefined;
    return employees.data?.find((e) => `${e.firstName} ${e.lastName}`.toLowerCase().includes(q))?.id;
  }, [search, employees.data]);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <p className="text-xs font-medium text-brass uppercase tracking-wide mb-1.5">Structure</p>
          <h1 className="font-display text-4xl font-semibold text-ink-900">Organization chart</h1>
          <p className="text-sm text-ink-500 mt-2">{employees.data?.length ?? 0} people · {tree.length} top-level report{tree.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="relative max-w-xs w-full">
          <Search size={15} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a person…"
            className="w-full rounded-full border border-line bg-surface-1 pl-9 pr-3 py-2.5 text-sm text-ink-900 outline-none transition-shadow focus:shadow-focus-ring focus:border-accent" />
        </div>
      </div>

      {employees.isLoading && <p className="text-sm text-ink-300 py-10 text-center">Loading…</p>}
      {employees.isError && <ErrorState message="Couldn't load the organization chart." onRetry={() => employees.refetch()} />}
      {!employees.isLoading && !employees.isError && tree.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-sm text-ink-300">No employees yet.</div>
      )}

      <div className="rounded-2xl border border-line bg-surface-1 shadow-card p-4">
        {tree.map((node) => (
          <OrgNode key={node.employee.id} node={node} depth={0} onSelect={setSelected} highlightId={matchId} />
        ))}
      </div>

      <Drawer open={!!selected} onClose={() => setSelected(null)} width={380} title={selected ? `${selected.firstName} ${selected.lastName}` : undefined}>
        {selected && (
          <div className="p-8">
            <div className="h-14 w-14 rounded-2xl bg-gradient-signature text-white flex items-center justify-center text-lg font-semibold mb-4">
              {initials(selected.firstName, selected.lastName)}
            </div>
            <h2 className="font-display text-xl font-semibold text-ink-900">{selected.firstName} {selected.lastName}</h2>
            <p className="text-sm text-ink-500 mb-6">{selected.designation?.title} · {selected.department?.name}</p>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-ink-500 uppercase tracking-wide">Employee code</p>
                <p className="text-ink-900 font-mono">{selected.employeeCode}</p>
              </div>
              <div>
                <p className="text-xs text-ink-500 uppercase tracking-wide">Status</p>
                <p className="text-ink-900">{selected.status}</p>
              </div>
              <div>
                <p className="text-xs text-ink-500 uppercase tracking-wide">Joined</p>
                <p className="text-ink-900">{new Date(selected.dateOfJoining).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>
              </div>
              {selected.personalEmail && (
                <div>
                  <p className="text-xs text-ink-500 uppercase tracking-wide">Email</p>
                  <p className="text-ink-900">{selected.personalEmail}</p>
                </div>
              )}
              {selected.phone && (
                <div>
                  <p className="text-xs text-ink-500 uppercase tracking-wide">Phone</p>
                  <p className="text-ink-900">{selected.phone}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
