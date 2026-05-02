import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLogout } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, BookOpen, Library, ClipboardList, Users,
  BookMarked, LogOut, User, Menu, X, ChevronRight
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard", roles: ["STUDENT", "FACULTY", "LIBRARIAN", "ADMIN"] },
  { href: "/catalog", icon: BookOpen, label: "Catalog", roles: ["STUDENT", "FACULTY", "LIBRARIAN", "ADMIN"] },
  { href: "/my-loans", icon: BookMarked, label: "My Loans", roles: ["STUDENT", "FACULTY"] },
  { href: "/catalog-management", icon: Library, label: "Catalog Management", roles: ["LIBRARIAN", "ADMIN"] },
  { href: "/all-loans", icon: ClipboardList, label: "All Loans", roles: ["LIBRARIAN", "ADMIN"] },
  { href: "/users", icon: Users, label: "User Management", roles: ["ADMIN"] },
  { href: "/profile", icon: User, label: "My Profile", roles: ["STUDENT", "FACULTY", "LIBRARIAN", "ADMIN"] },
];

const ROLE_COLORS: Record<string, string> = {
  STUDENT: "bg-blue-100 text-blue-700",
  FACULTY: "bg-purple-100 text-purple-700",
  LIBRARIAN: "bg-amber-100 text-amber-700",
  ADMIN: "bg-red-100 text-red-700",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const logoutMutation = useLogout();
  const queryClient = useQueryClient();

  const visibleNav = NAV_ITEMS.filter(item => user && item.roles.includes(user.role));

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        queryClient.clear();
        logout();
      }
    });
  };

  const initials = user?.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() ?? "U";

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn(
      "flex flex-col h-full bg-sidebar border-r border-sidebar-border",
      mobile ? "w-full" : "w-64"
    )}>
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
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
        <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-sidebar-accent">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
            <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", ROLE_COLORS[user?.role ?? "STUDENT"])}>
              {user?.role}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMobileOpen(!mobileOpen)}
            data-testid="button-menu"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="font-serif text-sm font-semibold">Faculty Library</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
