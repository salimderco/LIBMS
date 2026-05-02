import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUpdateMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { User, Loader2, CheckCircle } from "lucide-react";
import { useState } from "react";
import { format, parseISO } from "date-fns";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  department: z.string().optional(),
  phone: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const ROLE_COLORS: Record<string, string> = {
  STUDENT: "bg-blue-100 text-blue-700",
  FACULTY: "bg-purple-100 text-purple-700",
  LIBRARIAN: "bg-amber-100 text-amber-700",
  ADMIN: "bg-red-100 text-red-700",
};

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateMutation = useUpdateMe();
  const [success, setSuccess] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? "",
      department: user?.department ?? "",
      phone: user?.phone ?? "",
    },
  });

  const initials = user?.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() ?? "U";

  const onSubmit = (values: FormValues) => {
    setSuccess(false);
    updateMutation.mutate(
      { data: { name: values.name, department: values.department || undefined, phone: values.phone || undefined } },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData(getGetMeQueryKey(), updated);
          setSuccess(true);
          toast({ title: "Profile updated" });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.data?.message ?? err?.message, variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-light" data-testid="heading-profile">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your account information</p>
      </div>

      {/* Profile summary */}
      <Card>
        <CardContent className="pt-6 pb-6 flex items-center gap-6">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h2 className="font-serif text-xl font-light">{user?.name}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <div className="flex items-center gap-2 pt-1">
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${ROLE_COLORS[user?.role ?? "STUDENT"]}`}>
                {user?.role}
              </span>
              {user?.department && (
                <span className="text-xs text-muted-foreground">{user.department}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit form */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-base font-medium flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Edit Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          {success && (
            <Alert className="mb-4 border-green-200 bg-green-50 text-green-800">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription>Profile updated successfully.</AlertDescription>
            </Alert>
          )}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Full name</Label>
              <Input
                id="profile-name"
                {...form.register("name")}
                data-testid="input-profile-name"
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-email">Email address</Label>
              <Input
                id="profile-email"
                value={user?.email ?? ""}
                disabled
                className="bg-muted/50 text-muted-foreground cursor-not-allowed"
                data-testid="input-profile-email"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="profile-department">Department</Label>
                <Input
                  id="profile-department"
                  {...form.register("department")}
                  placeholder="e.g. Computer Science"
                  data-testid="input-profile-department"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-phone">Phone</Label>
                <Input
                  id="profile-phone"
                  {...form.register("phone")}
                  placeholder="e.g. 555-0101"
                  data-testid="input-profile-phone"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                data-testid="button-save-profile"
              >
                {updateMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                ) : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Account details */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-base font-medium">Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Account status</span>
            <span className={`font-medium ${user?.isActive ? "text-green-600" : "text-destructive"}`}>
              {user?.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Member since</span>
            <span>{user?.createdAt ? format(parseISO(user.createdAt), "MMMM d, yyyy") : "—"}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Role</span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${ROLE_COLORS[user?.role ?? "STUDENT"]}`}>
              {user?.role}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
