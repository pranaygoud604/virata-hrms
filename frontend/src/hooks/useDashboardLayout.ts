import { useEffect, useState } from "react";

export interface WidgetDef {
  id: string;
  label: string;
}

interface StoredLayout {
  order: string[];
  hidden: string[];
}

function storageKey(dashboardKey: string) {
  return `virata-dashboard-layout:${dashboardKey}`;
}

export function useDashboardLayout(dashboardKey: string, widgets: WidgetDef[]) {
  const defaultOrder = widgets.map((w) => w.id);
  const [order, setOrder] = useState<string[]>(defaultOrder);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  useEffect(() => {
    const raw = localStorage.getItem(storageKey(dashboardKey));
    if (raw) {
      try {
        const parsed: StoredLayout = JSON.parse(raw);
        const knownIds = new Set(defaultOrder);
        const restoredOrder = parsed.order.filter((id) => knownIds.has(id));
        for (const id of defaultOrder) if (!restoredOrder.includes(id)) restoredOrder.push(id);
        setOrder(restoredOrder);
        setHidden(new Set(parsed.hidden.filter((id) => knownIds.has(id))));
      } catch {
        // ignore corrupt storage
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardKey]);

  function persist(nextOrder: string[], nextHidden: Set<string>) {
    setOrder(nextOrder);
    setHidden(nextHidden);
    localStorage.setItem(storageKey(dashboardKey), JSON.stringify({ order: nextOrder, hidden: Array.from(nextHidden) }));
  }

  function toggleHidden(id: string) {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id); else next.add(id);
    persist(order, next);
  }

  function move(id: string, direction: -1 | 1) {
    const idx = order.indexOf(id);
    const swapWith = idx + direction;
    if (swapWith < 0 || swapWith >= order.length) return;
    const next = [...order];
    [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
    persist(next, hidden);
  }

  function reset() {
    persist(defaultOrder, new Set());
  }

  const visibleOrder = order.filter((id) => !hidden.has(id));

  return { order, hidden, visibleOrder, toggleHidden, move, reset };
}
