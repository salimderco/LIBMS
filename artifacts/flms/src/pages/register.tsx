import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegister, RegisterBodyRole } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BookOpen, Loader2, AlertCircle } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["STUDENT", "FACULTY", "LIBRARIAN", "ADMIN"]),
  department: z.string().min(1, "Department is required"),
});
type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const { login } = useAuth();
  const registerMutation = useRegister();
  const [apiError, setApiError] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", role: "STUDENT", department: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setApiError("");
    registerMutation.mutate(
      { data: { ...values, role: values.role as RegisterBodyRole } },
      {
        onSuccess: (res) => login(res.token, res.user),
        onError: (err: any) => {
          const msg = err?.data?.message ?? err?.message ?? "Registration failed";
          setApiError(msg);
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex flex-col justify-between w-1/3 bg-primary p-12 text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="font-serif text-lg font-semibold leading-tight">Faculty Library</p>
            <p className="text-xs opacity-70">Management System</p>
          </div>
        </div>
        <div className="space-y-4">
          <h1 className="font-serif text-3xl font-light leading-snug">
            Join the<br />academic community.
          </h1>
          <p className="text-sm opacity-75 leading-relaxed">
            Create an account to access the library catalog, borrow books, and manage your academic resources.
          </p>
        </div>
        <p className="text-xs opacity-40">University Academic Library System</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-primary" />
            <span className="font-serif text-lg font-semibold">Faculty Library</span>
          </div>

          <div>
            <h2 className="font-serif text-2xl font-light">Create account</h2>
            <p className="text-sm text-muted-foreground mt-1">Register for library access</p>
          </div>

          {apiError && (
            <Alert variant="destructive" data-testid="alert-register-error">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" placeholder="Dr. Jane Smith" data-testid="input-name" {...form.register("name")} />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" placeholder="you@university.edu" data-testid="input-email" {...form.register("email")} />
              {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="Min. 8 characters" data-testid="input-password" {...form.register("password")} />
              {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select defaultValue="STUDENT" onValueChange={(v) => form.setValue("role", v as any)}>
                  <SelectTrigger data-testid="select-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STUDENT">Student</SelectItem>
                    <SelectItem value="FACULTY">Faculty</SelectItem>
                    <SelectItem value="LIBRARIAN">Librarian</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="department">Department *</Label>
                <Input id="department" placeholder="e.g. Mathematics" data-testid="input-department" {...form.register("department")} />
                {form.formState.errors.department && <p className="text-xs text-destructive">{form.formState.errors.department.message}</p>}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={registerMutation.isPending} data-testid="button-register">
              {registerMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating account...</>
              ) : "Create account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium" data-testid="link-login">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
