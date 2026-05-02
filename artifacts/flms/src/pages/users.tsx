import { useState } from "react";
import {
  useListUsers, getListUsersQueryKey,
  useUpdateUser, UpdateUserBodyRole
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Search, Users, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

const PAGE_SIZE = 20;

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const params = { ...(search && { q: search }), limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };
  const { data, isLoading } = useListUsers(params, {
    query: { queryKey: getListUsersQueryKey(params) }
  });

  const updateMutation = useUpdateUser();
  const totalPages = data?.totalPages ?? 0;

  const handleUpdate = (userId: number, userName: string, updates: { role?: UpdateUserBodyRole; isActive?: boolean }) => {
    setUpdatingId(userId);
    updateMutation.mutate(
      { userId, data: updates },
      {
        onSuccess: () => {
          if (updates.role) {
            toast.success("Role updated", { description: `${userName} is now a ${updates.role.toLowerCase()}.` });
          } else {
            toast.success(updates.isActive ? "User activated" : "User deactivated", {
              description: `${userName}'s account has been ${updates.isActive ? "activated" : "deactivated"}.`,
            });
          }
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey({}) });
          setUpdatingId(null);
        },
        onError: (err: any) => {
          toast.error("Update failed", { description: err?.data?.message ?? err?.message });
          setUpdatingId(null);
        }
      }
    );
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-light" data-testid="heading-users">User Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isLoading ? "Loading..." : `${data?.totalRecords ?? 0} registered users`}
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          className="pl-9"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          data-testid="input-search-users"
        />
      </div>

      {isLoading ? (
        Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)
      ) : !data?.data?.length ? (
        <div className="text-center py-16">
          <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No users found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.data.map(user => {
            const initials = user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
            const isUpdating = updatingId === user.id;
            return (
              <Card key={user.id} className={cn(!user.isActive && "opacity-60")}>
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="w-9 h-9 flex-shrink-0">
                      <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate" data-testid={`user-name-${user.id}`}>{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      {user.department && (
                        <p className="text-xs text-muted-foreground">{user.department}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0 flex-wrap">
                    <span className="text-xs text-muted-foreground hidden lg:block">
                      Joined {format(parseISO(user.createdAt), "MMM d, yyyy")}
                    </span>

                    <Select
                      defaultValue={user.role}
                      onValueChange={(v) => handleUpdate(user.id, user.name, { role: v as UpdateUserBodyRole })}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs" data-testid={`select-role-${user.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STUDENT">Student</SelectItem>
                        <SelectItem value="FACULTY">Faculty</SelectItem>
                        <SelectItem value="LIBRARIAN">Librarian</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2">
                      {isUpdating ? (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      ) : (
                        <Switch
                          checked={user.isActive}
                          onCheckedChange={(checked) => handleUpdate(user.id, user.name, { isActive: checked })}
                          data-testid={`switch-active-${user.id}`}
                        />
                      )}
                      <span className="text-xs text-muted-foreground">{user.isActive ? "Active" : "Inactive"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
