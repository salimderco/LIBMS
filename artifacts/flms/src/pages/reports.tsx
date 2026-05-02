import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { BookOpen, Users, ClipboardList, AlertTriangle, Download, CheckCircle, TrendingUp, DollarSign } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Summary {
  totalBooks: number;
  totalUsers: number;
  activeLoans: number;
  overdueLoans: number;
  totalReturned: number;
  totalOutstandingFines: number;
  popularBooks: { title: string; borrowCount: number }[];
}

export default function ReportsPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const baseUrl = import.meta.env.BASE_URL;
  const apiBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${apiBase}api/reports/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setSummary({
        ...data,
        totalOutstandingFines: Number(data.totalOutstandingFines),
        totalBooks: Number(data.totalBooks),
        totalUsers: Number(data.totalUsers),
        activeLoans: Number(data.activeLoans),
        overdueLoans: Number(data.overdueLoans),
        totalReturned: Number(data.totalReturned),
      }))
      .catch(() => toast.error("Failed to load summary"))
      .finally(() => setLoading(false));
  }, []);

  const downloadCSV = async (endpoint: string, filename: string) => {
    setDownloading(endpoint);
    try {
      const resp = await fetch(`${apiBase}api/reports/${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("Export failed");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Download started", { description: filename });
    } catch {
      toast.error("Export failed");
    } finally {
      setDownloading(null);
    }
  };

  const stats = [
    { label: t.reports.totalBooks, value: summary?.totalBooks, icon: BookOpen, color: "text-primary" },
    { label: t.reports.totalUsers, value: summary?.totalUsers, icon: Users, color: "text-purple-600" },
    { label: t.reports.activeLoans, value: summary?.activeLoans, icon: ClipboardList, color: "text-amber-600" },
    { label: t.reports.overdueLoans, value: summary?.overdueLoans, icon: AlertTriangle, color: "text-destructive" },
    { label: t.reports.totalReturned, value: summary?.totalReturned, icon: CheckCircle, color: "text-green-600" },
    { label: t.reports.outstandingFines, value: summary ? `$${Number(summary.totalOutstandingFines).toFixed(2)}` : undefined, icon: DollarSign, color: "text-red-500" },
  ];

  const exports = [
    { label: t.reports.downloadLoans, endpoint: "loans-csv", filename: "loans-report.csv", color: "border-primary/30 hover:border-primary" },
    { label: t.reports.downloadOverdue, endpoint: "overdue-csv", filename: "overdue-report.csv", color: "border-destructive/30 hover:border-destructive" },
    { label: t.reports.downloadPopular, endpoint: "popular-books-csv", filename: "popular-books-report.csv", color: "border-amber-300 hover:border-amber-500" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-light">{t.reports.title}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t.reports.subtitle}</p>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t.reports.summary}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {stats.map(s => {
            const Icon = s.icon;
            return (
              <Card key={s.label}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
                      {loading ? <Skeleton className="h-7 w-16 mt-1" /> : (
                        <p className="text-2xl font-semibold mt-1">{s.value ?? 0}</p>
                      )}
                    </div>
                    <Icon className={cn("w-5 h-5 mt-0.5", s.color)} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {summary?.popularBooks && summary.popularBooks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              {t.reports.popularBooks}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {summary.popularBooks.map((b, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5">
                <div className="w-7 h-7 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{b.title}</p>
                </div>
                <span className="text-xs text-muted-foreground">{t.reports.borrows(b.borrowCount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">CSV Exports</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {exports.map(e => (
            <Card
              key={e.endpoint}
              className={cn("border-2 cursor-pointer transition-all hover:shadow-md", e.color)}
              onClick={() => downloadCSV(e.endpoint, e.filename)}
            >
              <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Download className={cn("w-5 h-5", downloading === e.endpoint && "animate-bounce")} />
                </div>
                <p className="text-sm font-medium leading-tight">{e.label}</p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={downloading === e.endpoint}
                  className="w-full gap-1.5"
                  onClick={ev => { ev.stopPropagation(); downloadCSV(e.endpoint, e.filename); }}
                >
                  <Download className="w-3.5 h-3.5" />
                  {downloading === e.endpoint ? "Downloading…" : "Download"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
