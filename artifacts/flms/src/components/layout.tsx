import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useI18n, LANGUAGES } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLogout } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, BookOpen, Library, ClipboardList, Users,
  BookMarked, LogOut, User, Menu, X, ChevronRight, Globe,
  Heart, Megaphone, Activity, BarChart2, Settings, Sun, Moon
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/notification-bell";

const NAV_KEYS = [
  { href: "/", key: "dashboard" as const, icon: LayoutDashboard, roles: ["STUDENT", "FACULTY", "LIBRARIAN", "ADMIN"] },
  { href: "/catalog", key: "catalog" as const, icon: BookOpen, roles: ["STUDENT", "FACULTY", "LIBRARIAN", "ADMIN"] },
  { href: "/my-loans", key: "myLoans" as const, icon: BookMarked, roles: ["STUDENT", "FACULTY"] },
  { href: "/wishlist", key: "wishlist" as const, icon: Heart, roles: ["STUDENT", "FACULTY"] },
  { href: "/catalog-management", key: "catalogManagement" as const, icon: Library, roles: ["LIBRARIAN", "ADMIN"] },
  { href: "/all-loans", key: "allLoans" as const, icon: ClipboardList, roles: ["LIBRARIAN", "ADMIN"] },
  { href: "/announcements-admin", key: "announcements" as const, icon: Megaphone, roles: ["LIBRARIAN", "ADMIN"] },
  { href: "/audit-log", key: "auditLog" as const, icon: Activity, roles: ["LIBRARIAN", "ADMIN"] },
  { href: "/reports", key: "reports" as const, icon: BarChart2, roles: ["LIBRARIAN", "ADMIN"] },
  { href: "/loan-policy", key: "loanPolicy" as const, icon: Settings, roles: ["ADMIN"] },
  { href: "/users", key: "userManagement" as const, icon: Users, roles: ["ADMIN"] },
  { href: "/profile", key: "myProfile" as const, icon: User, roles: ["STUDENT", "FACULTY", "LIBRARIAN", "ADMIN"] },
];

const ROLE_COLORS: Record<string, string> = {
  STUDENT: "bg-blue-100 text-blue-700",
  FACULTY: "bg-purple-100 text-purple-700",
  LIBRARIAN: "bg-amber-100 text-amber-700",
  ADMIN: "bg-red-100 text-red-700",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { t, lang, setLang, dir } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const logoutMutation = useLogout();
  const queryClient = useQueryClient();

  const visibleNav = NAV_KEYS.filter(item => user && item.roles.includes(user.role));

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => { queryClient.clear(); logout(); }
    });
  };

  const initials = user?.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() ?? "U";

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn("flex flex-col h-full bg-sidebar border-r border-sidebar-border", mobile ? "w-full" : "w-64")}>
      <div className="px-6 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <p className="font-serif text-sm font-semibold text-sidebar-foreground leading-tight">Faculty Library</p>
            <p className="text-xs text-muted-foreground">Management System</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleNav.map(item => {
          const Icon = item.icon;
          const isActive = location === item.href;
          const label = t.nav[item.key];
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`nav-${item.href.replace(/\//g, "").replace(/-/g, "_") || "dashboard"}`}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors group",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                dir === "rtl" && "flex-row-reverse text-right"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {isActive && <ChevronRight className={cn("w-3 h-3 opacity-60", dir === "rtl" && "rotate-180")} />}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
        <div className={cn("flex items-center gap-3 px-3 py-2 rounded-md bg-sidebar-accent", dir === "rtl" && "flex-row-reverse")}>
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-medium text-sidebar-foreground truncate", dir === "rtl" && "text-right")}>{user?.name}</p>
            <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", ROLE_COLORS[user?.role ?? "STUDENT"])}>
              {user?.role}
            </span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className={cn("w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent", dir === "rtl" && "flex-row-reverse")}
          onClick={toggleTheme}
        >
          {theme === "dark"
            ? <Sun className="w-4 h-4 flex-shrink-0" />
            : <Moon className="w-4 h-4 flex-shrink-0" />}
          <span className="flex-1 text-start">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </Button>

        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className={cn("w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent", dir === "rtl" && "flex-row-reverse")}
            onClick={() => setLangOpen(o => !o)}
          >
            <Globe className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-start">{t.nav.language}: {LANGUAGES.find(l => l.code === lang)?.nativeLabel}</span>
          </Button>
          {langOpen && (
            <div className={cn("absolute bottom-full mb-1 left-0 right-0 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50")}>
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => { setLang(l.code); setLangOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors",
                    lang === l.code && "text-primary font-medium bg-primary/5",
                    dir === "rtl" && "flex-row-reverse text-right"
                  )}
                >
                  <span className="flex-1">{l.nativeLabel}</span>
                  {l.code !== "en" && <span className="text-xs text-muted-foreground">{l.label}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className={cn("w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10", dir === "rtl" && "flex-row-reverse")}
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          {t.nav.signOut}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background" dir={dir}>
      <div className={cn("hidden lg:flex flex-shrink-0", dir === "rtl" && "order-last")}>
        <Sidebar />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className={cn("absolute top-0 bottom-0 w-72", dir === "rtl" ? "right-0" : "left-0")}>
            <Sidebar mobile />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className={cn("lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card", dir === "rtl" && "flex-row-reverse")}>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileOpen(!mobileOpen)} data-testid="button-menu">
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
          <div className={cn("flex items-center gap-2 flex-1", dir === "rtl" && "flex-row-reverse")}>
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="font-serif text-sm font-semibold">Faculty Library</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <NotificationBell />
        </div>

        <div className={cn("hidden lg:flex items-center justify-end px-6 py-2 border-b border-border/50 bg-background/80 backdrop-blur-sm gap-2", dir === "rtl" && "flex-row-reverse")}>
          <NotificationBell />
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
