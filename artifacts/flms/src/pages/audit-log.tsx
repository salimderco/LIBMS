import { useState } from "react";
import { useGetRecentActivity, getGetRecentActivityQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { useI18n } from "@/lib/i18n";

const ACTION_COLORS: Record<string, string> = {
  BORROWED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  RETURNED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  RENEWED: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  OVERDUE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  OVERDUE_FLAGGED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function AuditLogPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const { data, isLoading } = useGetRecentActivity(
    { limit: 200 },
    { query: { queryKey: getGetRecentActivityQueryKey({ limit: 200 }) } }
  );

  const allItems = data?.data ?? [];

  const filtered = allItems.filter(item => {
    const matchesAction = actionFilter === "all" || item.action === actionFilter;
    const matchesSearch = !search || (
      (item.loan?.book?.title ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (item.loan?.user?.name ?? "").toLowerCase().includes(search.toLowerCase())
    );
    return matchesAction && matchesSearch;
  });

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-light flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          {t.auditLog.title}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t.auditLog.subtitle}</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by book or user..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="BORROWED">Borrowed</SelectItem>
            <SelectItem value="RETURNED">Returned</SelectItem>
            <SelectItem value="RENEWED">Renewed</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
          </SelectContent>
        </Select>
        {filtered.length > 0 && (
          <span className="text-sm text-muted-foreground self-center">{filtered.length} entries</span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center rounded-lg border border-dashed">
          <Activity className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t.auditLog.noActivity}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((item, i) => (
            <Card key={i} className="hover:bg-muted/30 transition-colors">
              <CardContent className="p-3 flex items-center gap-3">
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0 w-20 text-center",
                  ACTION_COLORS[item.action] ?? "bg-muted text-muted-foreground"
                )}>
                  {item.action}
                </span>
                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-0.5">
                  <p className="text-sm font-medium truncate">{item.loan?.book?.title ?? "—"}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.loan?.user?.name ?? "—"}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                  {format(parseISO(item.timestamp), "MMM d, yyyy HH:mm")}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
