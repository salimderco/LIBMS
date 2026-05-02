import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, BellDot, CheckCheck, Clock, AlertTriangle, UserCog, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AppNotification {
  id: number;
  type: "DUE_SOON" | "ROLE_CHANGED" | "OVERDUE_FINE";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  data: AppNotification[];
  unreadCount: number;
}

function timeAgo(dateStr: string, t: ReturnType<typeof useI18n>["t"]): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t.notifications.justNow;
  if (mins < 60) return t.notifications.minutesAgo(mins);
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t.notifications.hoursAgo(hours);
  return t.notifications.daysAgo(Math.floor(hours / 24));
}

const TYPE_CONFIG = {
  DUE_SOON: { icon: Clock, color: "text-amber-500", bg: "bg-amber-50 border-amber-200" },
  OVERDUE_FINE: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50 border-red-200" },
  ROLE_CHANGED: { icon: UserCog, color: "text-blue-500", bg: "bg-blue-50 border-blue-200" },
};

export default function NotificationBell() {
  const { token } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [prevUnread, setPrevUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const apiBase = import.meta.env.BASE_URL;

  const fetchNotifications = async (quiet = false) => {
    if (!token) return;
    if (!quiet) setLoading(true);
    try {
      const resp = await fetch(`${apiBase}api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) return;
      const json: NotificationsResponse = await resp.json();
      setData(prev => {
        if (prev && json.unreadCount > prev.unreadCount) {
          const newItems = json.data.filter(n => !n.read && !prev.data.find(p => p.id === n.id));
          newItems.forEach(n => {
            const cfg = TYPE_CONFIG[n.type];
            const Icon = cfg.icon;
            toast(n.title, {
              description: n.message,
              icon: <Icon className={cn("w-4 h-4", cfg.color)} />,
            });
          });
        }
        return json;
      });
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => fetchNotifications(true), 30000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markAllRead = async () => {
    if (!token) return;
    await fetch(`${apiBase}api/notifications/read-all`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchNotifications();
  };

  const markOneRead = async (id: number) => {
    if (!token) return;
    await fetch(`${apiBase}api/notifications/${id}/read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    setData(prev => prev ? {
      ...prev,
      data: prev.data.map(n => n.id === id ? { ...n, read: true } : n),
      unreadCount: Math.max(0, prev.unreadCount - 1),
    } : prev);
  };

  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="relative">
      <Button
        ref={btnRef}
        variant="ghost"
        size="icon"
        className="h-8 w-8 relative"
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifications(); }}
        aria-label={t.notifications.title}
      >
        {unreadCount > 0 ? (
          <>
            <BellDot className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </>
        ) : (
          <Bell className="w-4 h-4" />
        )}
      </Button>

      {open && (
        <div
          ref={panelRef}
          className="absolute top-10 right-0 z-50 w-80 bg-card border border-border rounded-xl shadow-xl overflow-hidden"
          style={{ maxHeight: "420px" }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">{t.notifications.title}</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={markAllRead}>
                  <CheckCheck className="w-3 h-3" />
                  {t.notifications.markAllRead}
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: "340px" }}>
            {loading ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
              </div>
            ) : !data || data.data.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t.notifications.noNotifications}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.data.map(n => {
                  const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.DUE_SOON;
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={n.id}
                      onClick={() => !n.read && markOneRead(n.id)}
                      className={cn(
                        "w-full text-left px-4 py-3 flex gap-3 transition-colors hover:bg-muted/50",
                        !n.read && "bg-primary/3"
                      )}
                    >
                      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border", cfg.bg)}>
                        <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn("text-xs font-medium", !n.read && "font-semibold")}>{n.title}</p>
                          {!n.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.createdAt, t)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
