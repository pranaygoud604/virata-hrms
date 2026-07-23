import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Search } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../contexts/ToastContext";
import { extractErrorMessage } from "../utils/apiError";
import type { NotificationItem } from "../api/types";

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

export default function TopBar() {
  const [notifOpen, setNotifOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();

  const notifications = useQuery({
    queryKey: ["notifications", "me"],
    queryFn: async () => (await api.get<NotificationItem[]>("/notifications/me")).data,
    refetchInterval: 30_000,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => (await api.patch(`/notifications/${id}/read`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", "me"] }),
    onError: (err) => toast.error("Could not mark this as read", extractErrorMessage(err)),
  });

  const items = notifications.data ?? [];
  const unreadCount = items.filter((n) => !n.isRead).length;

  return (
    <div className="sticky top-0 z-20 flex items-center justify-end gap-2 h-14 px-4 sm:px-6 lg:px-8 bg-surface-0/80 backdrop-blur-md border-b border-line">
      <button
        onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
        className="flex items-center gap-2 rounded-full border border-line bg-surface-1 px-3 py-1.5 text-ink-500 hover:text-ink-900 hover:border-ink-300 transition-colors"
      >
        <Search size={14} strokeWidth={1.75} />
        <span className="text-xs">Search</span>
        <kbd className="text-[10px] font-medium border border-line rounded px-1 py-0.5">⌘K</kbd>
      </button>
      <div className="relative">
        <button
          onClick={() => setNotifOpen((v) => !v)}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          aria-haspopup="true"
          aria-expanded={notifOpen}
          className="relative h-11 w-11 rounded-full flex items-center justify-center text-ink-500 hover:text-ink-900 hover:bg-surface-2 transition-colors"
        >
          <Bell size={16} strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 h-4 min-w-4 px-0.5 rounded-full bg-status-critical text-white text-[9px] font-semibold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        <AnimatePresence>
          {notifOpen && (
            <>
              <div aria-hidden="true" className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-80 max-h-[26rem] overflow-y-auto rounded-2xl border border-line bg-surface-1 shadow-floating p-2 z-50"
              >
                <div className="flex items-center justify-between px-2 py-2">
                  <p className="text-sm font-semibold text-ink-900">Notifications</p>
                  {unreadCount > 0 && <span className="text-[11px] text-ink-500">{unreadCount} unread</span>}
                </div>
                {items.length === 0 ? (
                  <p className="text-xs text-ink-300 px-2 pb-3">You&apos;re all caught up.</p>
                ) : (
                  <div className="space-y-0.5">
                    {items.slice(0, 6).map((n) => (
                      <button
                        key={n.id}
                        onClick={() => !n.isRead && markRead.mutate(n.id)}
                        className={`w-full text-left rounded-xl px-2.5 py-2.5 transition-colors hover:bg-surface-2 ${!n.isRead ? "bg-accent-soft/40" : ""}`}
                      >
                        <div className="flex items-start gap-2">
                          {!n.isRead && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />}
                          <div className={`min-w-0 ${n.isRead ? "pl-3.5" : ""}`}>
                            <p className="text-xs font-medium text-ink-900 truncate">{n.title}</p>
                            <p className="text-xs text-ink-500 line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-ink-300 mt-0.5">{timeAgo(n.createdAt)}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => { setNotifOpen(false); navigate("/notifications"); }}
                  className="w-full text-center text-xs font-semibold text-accent hover:underline mt-1 py-2"
                >
                  View all notifications
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
