import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import DashboardPage from "@/pages/dashboard";
import CatalogPage from "@/pages/catalog";
import BookDetailPage from "@/pages/book-detail";
import MyLoansPage from "@/pages/my-loans";
import CatalogManagementPage from "@/pages/catalog-management";
import AllLoansPage from "@/pages/all-loans";
import UsersPage from "@/pages/users";
import ProfilePage from "@/pages/profile";
import WishlistPage from "@/pages/wishlist";
import AnnouncementsAdminPage from "@/pages/announcements-admin";
import AuditLogPage from "@/pages/audit-log";
import ReportsPage from "@/pages/reports";
import LoanPolicyPage from "@/pages/loan-policy";
import AppLayout from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, isLoading, token } = useAuth();
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-3 w-64">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }
  if (!token || !user) return <Redirect to="/login" />;
  if (roles && !roles.includes(user.role)) {
    toast.error("Access denied", { description: "You don't have permission to view that page." });
    return <Redirect to="/" />;
  }
  return <>{children}</>;
}

function Router() {
  const { user, isLoading, token } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="space-y-3 w-64">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login">
        {token && user ? <Redirect to="/" /> : <LoginPage />}
      </Route>
      <Route path="/register">
        {token && user ? <Redirect to="/" /> : <RegisterPage />}
      </Route>
      <Route path="/">
        <ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>
      </Route>
      <Route path="/catalog">
        <ProtectedRoute><AppLayout><CatalogPage /></AppLayout></ProtectedRoute>
      </Route>
      <Route path="/catalog/:bookId">
        {(params) => (
          <ProtectedRoute>
            <AppLayout><BookDetailPage bookId={parseInt(params.bookId)} /></AppLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/my-loans">
        <ProtectedRoute roles={["STUDENT", "FACULTY"]}><AppLayout><MyLoansPage /></AppLayout></ProtectedRoute>
      </Route>
      <Route path="/wishlist">
        <ProtectedRoute roles={["STUDENT", "FACULTY"]}><AppLayout><WishlistPage /></AppLayout></ProtectedRoute>
      </Route>
      <Route path="/catalog-management">
        <ProtectedRoute roles={["LIBRARIAN", "ADMIN"]}><AppLayout><CatalogManagementPage /></AppLayout></ProtectedRoute>
      </Route>
      <Route path="/all-loans">
        <ProtectedRoute roles={["LIBRARIAN", "ADMIN"]}><AppLayout><AllLoansPage /></AppLayout></ProtectedRoute>
      </Route>
      <Route path="/announcements-admin">
        <ProtectedRoute roles={["LIBRARIAN", "ADMIN"]}><AppLayout><AnnouncementsAdminPage /></AppLayout></ProtectedRoute>
      </Route>
      <Route path="/audit-log">
        <ProtectedRoute roles={["LIBRARIAN", "ADMIN"]}><AppLayout><AuditLogPage /></AppLayout></ProtectedRoute>
      </Route>
      <Route path="/reports">
        <ProtectedRoute roles={["LIBRARIAN", "ADMIN"]}><AppLayout><ReportsPage /></AppLayout></ProtectedRoute>
      </Route>
      <Route path="/loan-policy">
        <ProtectedRoute roles={["ADMIN"]}><AppLayout><LoanPolicyPage /></AppLayout></ProtectedRoute>
      </Route>
      <Route path="/users">
        <ProtectedRoute roles={["ADMIN"]}><AppLayout><UsersPage /></AppLayout></ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AuthProvider>
                <Router />
              </AuthProvider>
            </WouterRouter>
            <Toaster richColors closeButton position="top-right" />
          </TooltipProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
