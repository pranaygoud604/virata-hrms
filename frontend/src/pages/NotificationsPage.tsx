import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Search } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../contexts/ToastContext";
import { extractErrorMessage } from "../utils/apiError";
import ErrorState from "../components/ErrorState";
import type { NotificationItem } from "../api/types";

const CHANNELS = ["ALL", "IN_APP", "EMAIL", "SMS", "WHATSAPP"] as const;

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>("ALL");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const notifications = useQuery({ queryKey: ["notifications", "me"], queryFn: async () => (await api.get<NotificationItem[]>("/notifications/me")).data });

  const markRead = useMutation({
    mutationFn: async (id: string) => (await api.patch(`/notifications/${id}/read`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", "me"] }),
    onError: (err) => toast.error("Could not mark this as read", extractErrorMessage(err)),
  });
  const markAllRead = useMutation({
    mutationFn: async () => {
      const unread = (notifications.data ?? []).filter((n) => !n.isRead);
      await Promise.all(unread.map((n) => api.patch(`/notifications/${n.id}/read`)));
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["notifications", "me"] }); toast.success("All caught up"); },
    onError: (err) => toast.error("Could not mark everything as read", extractErrorMessage(err)),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (notifications.data ?? []).filter((n) => {
      if (unreadOnly && n.isRead) return false;
      if (channel !== "ALL" && n.channel !== channel) return false;
      if (q && !n.title.toLowerCase().includes(q) && !n.message.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [notifications.data, search, channel, unreadOnly]);

  const unreadCount = notifications.data?.filter((n) => !n.isRead).length ?? 0;

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <p className="text-xs font-medium text-brass uppercase tracking-wide mb-1.5">Inbox</p>
          <h1 className="font-display text-4xl font-semibold text-ink-900">Notifications</h1>
          <p className="text-sm text-ink-500 mt-2">{unreadCount} unread of {notifications.data?.length ?? 0} total.</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending} className="inline-flex items-center gap-2 rounded-full bg-accent text-white text-sm font-semibold px-5 py-2.5 hover:bg-accent-strong disabled:opacity-60 transition-colors">
            {markAllRead.isPending ? "Marking…" : "Mark all read"}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative max-w-xs flex-1 min-w-[200px]">
          <Search size={15} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notifications…"
            className="w-full rounded-full border border-line bg-surface-1 pl-9 pr-3 py-2.5 text-sm text-ink-900 outline-none transition-shadow focus:shadow-focus-ring focus:border-accent" />
        </div>
        <select value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)} className="rounded-full border border-line bg-surface-1 px-3.5 py-2.5 text-xs font-medium text-ink-700 outline-none">
          {CHANNELS.map((c) => <option key={c} value={c}>{c === "ALL" ? "All channels" : c}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-xs font-medium text-ink-700">
          <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} className="h-3.5 w-3.5" /> Unread only
        </label>
      </div>

      {notifications.isLoading && <p className="text-sm text-ink-300 py-10 text-center">Loading…</p>}
      {notifications.isError && <ErrorState message="Couldn't load notifications." onRetry={() => notifications.refetch()} />}
      {!notifications.isLoading && !notifications.isError && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center text-sm text-ink-300 flex flex-col items-center gap-2">
          <Bell size={22} strokeWidth={1.5} className="text-ink-300" />
          {notifications.data?.length === 0 ? "No notifications yet." : "Nothing matches your filters."}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((n) => (
          <button
            key={n.id}
            onClick={() => !n.isRead && markRead.mutate(n.id)}
            className={`w-full text-left rounded-2xl border border-line shadow-card p-4 flex items-start gap-3 transition-colors ${!n.isRead ? "bg-accent-soft/30" : "bg-surface-1"}`}
          >
            {!n.isRead && <span className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" />}
            <div className={`min-w-0 flex-1 ${n.isRead ? "pl-5" : ""}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-ink-900">{n.title}</p>
                <span className="text-[11px] text-ink-300 shrink-0">{timeAgo(n.createdAt)}</span>
              </div>
              <p className="text-sm text-ink-500 mt-0.5">{n.message}</p>
              <span className="inline-block mt-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-2 text-ink-500">{n.channel}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
