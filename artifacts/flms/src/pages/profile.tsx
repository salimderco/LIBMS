import { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { User, Loader2, Lock } from "lucide-react";
import { format, parseISO } from "date-fns";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  department: z.string().optional(),
  phone: z.string().optional(),
});
type ProfileValues = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Required"),
  newPassword: z.string().min(8, "Must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Required"),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
type PasswordValues = z.infer<typeof passwordSchema>;

const ROLE_COLORS: Record<string, string> = {
  STUDENT: "bg-blue-100 text-blue-700",
  FACULTY: "bg-purple-100 text-purple-700",
  LIBRARIAN: "bg-amber-100 text-amber-700",
  ADMIN: "bg-red-100 text-red-700",
};

export default function ProfilePage() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const updateMutation = useUpdateMe();
  const [changingPassword, setChangingPassword] = useState(false);

  const baseUrl = import.meta.env.BASE_URL;
  const apiBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? "",
      department: user?.department ?? "",
      phone: user?.phone ?? "",
    },
  });

  const passwordForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  const initials = user?.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() ?? "U";

  const onProfileSubmit = (values: ProfileValues) => {
    updateMutation.mutate(
      { data: { name: values.name, department: values.department || undefined, phone: values.phone || undefined } },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData(getGetMeQueryKey(), updated);
          toast.success("Profile updated", { description: "Your information has been saved." });
        },
        onError: (err: any) => toast.error("Update failed", { description: err?.data?.message ?? err?.message }),
      }
    );
  };

  const onPasswordSubmit = async (values: PasswordValues) => {
    setChangingPassword(true);
    try {
      const resp = await fetch(`${apiBase}api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: values.currentPassword, newPassword: values.newPassword }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message ?? "Failed to change password");
      toast.success("Password changed", { description: "Your new password is active." });
      passwordForm.reset();
    } catch (err: any) {
      toast.error("Password change failed", { description: err.message });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-light" data-testid="heading-profile">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your account information and security</p>
      </div>

      {/* Avatar card */}
      <Card>
        <CardContent className="pt-6 pb-6 flex items-center gap-6">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h2 className="font-serif text-xl font-light">{user?.name}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <div className="flex items-center gap-2 pt-1">
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${ROLE_COLORS[user?.role ?? "STUDENT"]}`}>{user?.role}</span>
              {user?.department && <span className="text-xs text-muted-foreground">{user.department}</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit profile */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-base font-medium flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Edit Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Full name</Label>
              <Input id="profile-name" {...profileForm.register("name")} data-testid="input-profile-name" />
              {profileForm.formState.errors.name && <p className="text-xs text-destructive">{profileForm.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-email">Email address</Label>
              <Input id="profile-email" value={user?.email ?? ""} disabled className="bg-muted/50 text-muted-foreground cursor-not-allowed" data-testid="input-profile-email" />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="profile-department">Department</Label>
                <Input id="profile-department" {...profileForm.register("department")} placeholder="e.g. Computer Science" data-testid="input-profile-department" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-phone">Phone</Label>
                <Input id="profile-phone" {...profileForm.register("phone")} placeholder="e.g. 555-0101" data-testid="input-profile-phone" />
              </div>
            </div>
            <div className="pt-2">
              <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-profile">
                {updateMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-base font-medium flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current-password">Current password</Label>
              <Input id="current-password" type="password" {...passwordForm.register("currentPassword")} data-testid="input-current-password" />
              {passwordForm.formState.errors.currentPassword && <p className="text-xs text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input id="new-password" type="password" {...passwordForm.register("newPassword")} data-testid="input-new-password" />
              {passwordForm.formState.errors.newPassword && <p className="text-xs text-destructive">{passwordForm.formState.errors.newPassword.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input id="confirm-password" type="password" {...passwordForm.register("confirmPassword")} data-testid="input-confirm-password" />
              {passwordForm.formState.errors.confirmPassword && <p className="text-xs text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>}
            </div>
            <div className="pt-2">
              <Button type="submit" variant="outline" disabled={changingPassword} data-testid="button-change-password">
                {changingPassword ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating…</> : "Update password"}
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
            <span className={`font-medium ${user?.isActive ? "text-green-600" : "text-destructive"}`}>{user?.isActive ? "Active" : "Inactive"}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Member since</span>
            <span>{user?.createdAt ? format(parseISO(user.createdAt), "MMMM d, yyyy") : "—"}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Role</span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${ROLE_COLORS[user?.role ?? "STUDENT"]}`}>{user?.role}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
