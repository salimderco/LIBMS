import { useAuth } from "@/lib/auth";
import {
  useGetDashboardSummary, getGetDashboardSummaryQueryKey,
  useGetPopularBooks, getGetPopularBooksQueryKey,
  useGetRecentActivity, getGetRecentActivityQueryKey,
  useGetOverdueLoans, getGetOverdueLoansQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  BookOpen, Users, ClipboardList, AlertTriangle,
  BookMarked, TrendingUp, Activity, ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { useI18n } from "@/lib/i18n";

const ACTION_COLORS: Record<string, string> = {
  BORROWED: "bg-blue-100 text-blue-700",
  RETURNED: "bg-green-100 text-green-700",
  RENEWED: "bg-amber-100 text-amber-700",
  OVERDUE: "bg-red-100 text-red-700",
  OVERDUE_FLAGGED: "bg-red-100 text-red-700",
};

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.85)",
  "hsl(var(--primary) / 0.70)",
  "hsl(var(--primary) / 0.55)",
  "hsl(var(--primary) / 0.40)",
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const isStaff = user?.role === "LIBRARIAN" || user?.role === "ADMIN";

  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });
  const { data: popularBooks, isLoading: popularLoading } = useGetPopularBooks(
    { limit: 5 },
    { query: { queryKey: getGetPopularBooksQueryKey({ limit: 5 }) } }
  );
  const { data: recentActivity, isLoading: activityLoading } = useGetRecentActivity(
    { limit: 10 },
    { query: { enabled: isStaff, queryKey: getGetRecentActivityQueryKey({ limit: 10 }) } }
  );
  const { data: _overdueData } = useGetOverdueLoans({
    query: { enabled: !isStaff, queryKey: getGetOverdueLoansQueryKey() }
  });

  const statCards = isStaff
    ? [
        { label: t.dashboard.totalBooks, value: summary?.totalBooks, icon: BookOpen, color: "text-primary" },
        { label: t.dashboard.totalUsers, value: summary?.totalUsers, icon: Users, color: "text-purple-600" },
        { label: t.dashboard.activeLoans, value: summary?.activeLoans, icon: ClipboardList, color: "text-amber-600" },
        { label: t.dashboard.overdue, value: summary?.overdueLoans, icon: AlertTriangle, color: "text-destructive" },
      ]
    : [
        { label: t.dashboard.myActiveLoans, value: summary?.myActiveLoans, icon: BookMarked, color: "text-primary" },
        { label: t.dashboard.myOverdue, value: summary?.myOverdueLoans, icon: AlertTriangle, color: "text-destructive" },
        { label: t.dashboard.booksAvailable, value: summary?.availableBooks, icon: BookOpen, color: "text-green-600" },
        { label: t.dashboard.totalInCatalog, value: summary?.totalBooks, icon: TrendingUp, color: "text-muted-foreground" },
      ];

  const chartData = (popularBooks?.data ?? []).map(item => ({
    title: item.book?.title ? (item.book.title.length > 20 ? item.book.title.slice(0, 18) + "…" : item.book.title) : "Unknown",
    count: item.borrowCount,
  }));

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-light" data-testid="heading-dashboard">
          {t.dashboard.greeting(user?.name?.split(" ")[0] ?? "")}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t.dashboard.subtitle}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="hover-elevate" data-testid={`stat-${card.label.toLowerCase().replace(/ /g, "_")}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{card.label}</p>
                    {summaryLoading ? (
                      <Skeleton className="h-7 w-12 mt-1" />
                    ) : (
                      <p className="text-2xl font-semibold mt-1">{card.value ?? 0}</p>
                    )}
                  </div>
                  <Icon className={cn("w-5 h-5 mt-0.5", card.color)} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Borrowing chart — staff only */}
      {isStaff && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-serif text-base font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              {t.dashboard.mostBorrowed}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {popularLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">{t.dashboard.noBorrowingData}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
                >
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="title"
                    width={140}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted))" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-popover border border-border rounded-md px-3 py-2 shadow-md text-xs">
                          <p className="font-medium">{payload[0].payload.title}</p>
                          <p className="text-muted-foreground">{t.dashboard.borrows(payload[0].value as number)}</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Popular books */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-base font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                {t.dashboard.popularBooks}
              </CardTitle>
              <Link
                href="/catalog"
                className="text-xs text-primary hover:underline flex items-center gap-1"
                data-testid="link-view-catalog"
              >
                {t.dashboard.viewAll} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-1">
            {popularLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton className="w-8 h-8 rounded" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))
            ) : popularBooks?.data?.length ? (
              popularBooks.data.map((item, i) => (
                <Link
                  key={item.book?.id ?? i}
                  href={`/catalog/${item.book?.id}`}
                  className="flex items-center gap-3 py-2 rounded-md hover:bg-accent px-2 -mx-2 transition-colors"
                  data-testid={`popular-book-${i}`}
                >
                  <div className="w-7 h-7 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.book?.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.book?.author}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {item.borrowCount}×
                  </span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">{t.dashboard.noData}</p>
            )}
          </CardContent>
        </Card>

        {/* Recent activity (staff) / my loans status (student/faculty) */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-base font-medium flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                {isStaff ? t.dashboard.recentActivity : t.dashboard.myOutstandingLoans}
              </CardTitle>
              {!isStaff && (
                <Link
                  href="/my-loans"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                  data-testid="link-view-loans"
                >
                  {t.dashboard.viewAll} <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-1">
            {isStaff ? (
              activityLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))
              ) : recentActivity?.data?.length ? (
                recentActivity.data.slice(0, 8).map((item, i) => (
                  <div key={i} className="flex items-start gap-3 py-1.5" data-testid={`activity-item-${i}`}>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0 mt-0.5", ACTION_COLORS[item.action] ?? "bg-muted text-muted-foreground")}>
                      {item.action}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.loan?.book?.title ?? "Unknown book"}</p>
                      <p className="text-xs text-muted-foreground">{item.loan?.user?.name ?? "Unknown user"}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                      {format(parseISO(item.timestamp), "MMM d")}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">{t.dashboard.noActivity}</p>
              )
            ) : (
              (summary?.myActiveLoans ?? 0) === 0 ? (
                <div className="py-6 text-center">
                  <BookMarked className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{t.dashboard.noActiveLoans}</p>
                  <Link href="/catalog" className="text-xs text-primary hover:underline mt-1 inline-block">
                    {t.dashboard.browseCatalog}
                  </Link>
                </div>
              ) : (
                <div className="space-y-2 py-2">
                  {(summary?.myOverdueLoans ?? 0) > 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                      <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                      <p className="text-sm text-destructive font-medium">
                        {t.dashboard.overdueCount(summary?.myOverdueLoans ?? 0)}
                      </p>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {t.dashboard.activeCount(summary?.myActiveLoans ?? 0)}
                  </p>
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
