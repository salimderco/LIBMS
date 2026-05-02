import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BookOpen, Loader2, AlertCircle } from "lucide-react";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

const DEMO_ACCOUNTS = [
  { email: "alice@university.edu", role: "Student" },
  { email: "david.chen@university.edu", role: "Faculty" },
  { email: "sarah@library.edu", role: "Librarian" },
  { email: "admin@university.edu", role: "Admin" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const loginMutation = useLogin();
  const [apiError, setApiError] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const fillDemo = (email: string) => {
    form.setValue("email", email);
    form.setValue("password", "password123");
  };

  const onSubmit = async (values: FormValues) => {
    setApiError("");
    loginMutation.mutate(
      { data: values },
      {
        onSuccess: (res) => login(res.token, res.user),
        onError: (err: any) => {
          const msg = err?.data?.message ?? err?.message ?? "Login failed";
          setApiError(msg);
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-primary p-12 text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="font-serif text-lg font-semibold leading-tight">Faculty Library</p>
            <p className="text-xs opacity-70">Management System</p>
          </div>
        </div>
        <div className="space-y-6">
          <h1 className="font-serif text-4xl font-light leading-snug">
            Knowledge at your<br />fingertips.
          </h1>
          <p className="text-sm opacity-75 leading-relaxed max-w-sm">
            Access thousands of academic resources, manage your loans, and discover new titles across every discipline.
          </p>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-60">Demo accounts</p>
            {DEMO_ACCOUNTS.map(a => (
              <button
                key={a.email}
                type="button"
                data-testid={`demo-${a.role.toLowerCase()}`}
                onClick={() => fillDemo(a.email)}
                className="block text-left w-full px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
              >
                <span className="text-xs font-medium">{a.role}</span>
                <span className="text-xs opacity-60 ml-2">{a.email}</span>
              </button>
            ))}
            <p className="text-xs opacity-50">Password: password123</p>
          </div>
        </div>
        <p className="text-xs opacity-40">University Academic Library System</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-primary" />
            <span className="font-serif text-lg font-semibold">Faculty Library</span>
          </div>

          <div>
            <h2 className="font-serif text-2xl font-light">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1">Sign in to your library account</p>
          </div>

          {apiError && (
            <Alert variant="destructive" data-testid="alert-login-error">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@university.edu"
                autoComplete="email"
                data-testid="input-email"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                data-testid="input-password"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
              data-testid="button-login"
            >
              {loginMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</>
              ) : "Sign in"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            No account?{" "}
            <Link
              href="/register"
              className="text-primary hover:underline font-medium"
              data-testid="link-register"
            >
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
