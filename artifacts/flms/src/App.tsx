import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
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
  if (roles && !roles.includes(user.role)) return <Redirect to="/" />;
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
        <ProtectedRoute>
          <AppLayout><DashboardPage /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/catalog">
        <ProtectedRoute>
          <AppLayout><CatalogPage /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/catalog/:bookId">
        {(params) => (
          <ProtectedRoute>
            <AppLayout><BookDetailPage bookId={parseInt(params.bookId)} /></AppLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/my-loans">
        <ProtectedRoute roles={["STUDENT", "FACULTY"]}>
          <AppLayout><MyLoansPage /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/catalog-management">
        <ProtectedRoute roles={["LIBRARIAN", "ADMIN"]}>
          <AppLayout><CatalogManagementPage /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/all-loans">
        <ProtectedRoute roles={["LIBRARIAN", "ADMIN"]}>
          <AppLayout><AllLoansPage /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/users">
        <ProtectedRoute roles={["ADMIN"]}>
          <AppLayout><UsersPage /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute>
          <AppLayout><ProfilePage /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
