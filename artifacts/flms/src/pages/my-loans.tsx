import {
  useGetMyLoans, getGetMyLoansQueryKey,
  useRenewLoan,
  useGetMyFines, getGetMyFinesQueryKey,
  usePayFines,
  getGetDashboardSummaryQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  BookMarked, AlertTriangle, Clock, RotateCcw, CheckCircle,
  BookOpen, ArrowRight, DollarSign, CreditCard, ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInDays, isPast } from "date-fns";
import { useI18n, formatLocalDate } from "@/lib/i18n";
import PaymentModal from "@/components/payment-modal";
import { useState } from "react";

export default function MyLoansPage() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [payModalOpen, setPayModalOpen] = useState(false);

  const { data, isLoading } = useGetMyLoans({
    query: { queryKey: getGetMyLoansQueryKey() }
  });

  const { data: finesData, isLoading: finesLoading } = useGetMyFines({
    query: { queryKey: getGetMyFinesQueryKey(), refetchInterval: 60_000 }
  });

  const renewMutation = useRenewLoan();

  const handleRenew = (loanId: number, bookTitle?: string) => {
    renewMutation.mutate(
      { loanId },
      {
        onSuccess: (updated) => {
          toast.success("Loan renewed", {
            description: `"${bookTitle ?? "Book"}" extended — new due date: ${formatLocalDate(updated.dueDate)}`,
          });
          queryClient.invalidateQueries({ queryKey: getGetMyLoansQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        },
        onError: (err: any) => {
          const msg = err?.data?.message ?? err?.message ?? "Could not renew loan";
          toast.error("Renewal failed", { description: msg });
        }
      }
    );
  };

  const handlePaySuccess = () => {
    toast.success("Payment successful", { description: "Your fines have been cleared." });
    queryClient.invalidateQueries({ queryKey: getGetMyFinesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMyLoansQueryKey() });
  };

  const activeLoan = data?.active ?? [];
  const historyLoans = data?.history ?? [];

  const getDueStatus = (dueDate: string) => {
    const due = new Date(dueDate);
    const daysLeft = differenceInDays(due, new Date());
    if (isPast(due)) return { label: "Overdue", color: "bg-red-100 text-red-700", icon: AlertTriangle, urgent: true };
    if (daysLeft === 0) return { label: "Due today", color: "bg-red-100 text-red-700", icon: AlertTriangle, urgent: true };
    if (daysLeft <= 2) return { label: `Due in ${daysLeft}d`, color: "bg-amber-100 text-amber-700", icon: AlertTriangle, urgent: true };
    if (daysLeft <= 5) return { label: `Due in ${daysLeft}d`, color: "bg-amber-100 text-amber-700", icon: Clock, urgent: false };
    return { label: formatLocalDate(dueDate, { month: "short", day: "numeric" }), color: "bg-green-100 text-green-700", icon: Clock, urgent: false };
  };

  const overdueCount = activeLoan.filter(l => isPast(new Date(l.dueDate))).length;
  const totalFine = finesData?.totalOutstanding ?? 0;
  const fineItemCount = finesData?.items?.length ?? 0;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-light" data-testid="heading-my-loans">{t.myLoans.title}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t.myLoans.subtitle}</p>
      </div>

      {overdueCount > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">{t.myLoans.overdueAlert(overdueCount)}</p>
            <p className="text-xs text-red-600 mt-0.5">{t.myLoans.overdueMessage}</p>
          </div>
          {totalFine > 0 && (
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-red-600 font-medium">Fine: ${totalFine.toFixed(2)}</p>
            </div>
          )}
        </div>
      )}

      <Tabs defaultValue="active">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="active" className="gap-1.5">
            {t.myLoans.activeLoans}
            {activeLoan.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1">{activeLoan.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            {t.myLoans.history}
            {historyLoans.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1">{historyLoans.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="fines" className="gap-1.5 relative">
            {t.myLoans.finesBilling}
            {totalFine > 0 && (
              <Badge className="text-[10px] h-4 px-1 bg-red-500 text-white border-0">${totalFine.toFixed(2)}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Active Loans ─────────────────────────────────────────── */}
        <TabsContent value="active" className="mt-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)
          ) : activeLoan.length === 0 ? (
            <div className="py-12 text-center rounded-lg border border-dashed">
              <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t.myLoans.noActiveLoans}</p>
              <Link
                href="/catalog"
                className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1"
                data-testid="link-browse-catalog"
              >
                {t.myLoans.browseCatalog} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            activeLoan.map(loan => {
              const dueStatus = getDueStatus(loan.dueDate);
              const StatusIcon = dueStatus.icon;
              const canRenew = (loan.renewalsCount ?? 0) < 2;
              const isOverdue = isPast(new Date(loan.dueDate));
              const hasFine = (loan.fineAccrued ?? 0) > 0;
              return (
                <Card
                  key={loan.id}
                  className={cn(
                    "transition-all",
                    isOverdue && "border-red-300 bg-red-50/40 shadow-sm shadow-red-100"
                  )}
                >
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                    <div className={cn(
                      "w-10 h-12 rounded flex items-center justify-center flex-shrink-0",
                      isOverdue ? "bg-red-100" : "bg-gradient-to-br from-primary/10 to-primary/5"
                    )}>
                      <BookOpen className={cn("w-4 h-4", isOverdue ? "text-red-400" : "text-primary/40")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/catalog/${loan.book?.id}`}
                        className="font-medium hover:text-primary transition-colors line-clamp-1"
                        data-testid={`loan-title-${loan.id}`}
                      >
                        {loan.book?.title}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5">{loan.book?.author}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1", dueStatus.color)}>
                          <StatusIcon className="w-3 h-3" />
                          {dueStatus.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t.myLoans.borrowed} {formatLocalDate(loan.borrowedAt)}
                        </span>
                        {(loan.renewalsCount ?? 0) > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {t.myLoans.renewals(loan.renewalsCount ?? 0)}
                          </span>
                        )}
                        {hasFine && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 inline-flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            Fine: ${(loan.fineAccrued ?? 0).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant={canRenew ? "outline" : "ghost"}
                        size="sm"
                        disabled={!canRenew || renewMutation.isPending}
                        onClick={() => handleRenew(loan.id, loan.book?.title)}
                        data-testid={`button-renew-${loan.id}`}
                        title={!canRenew ? "Maximum renewals reached" : "Extend due date"}
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                        {canRenew ? `Renew (${2 - (loan.renewalsCount ?? 0)} left)` : t.myLoans.maxRenewals}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* ── Borrowing History ─────────────────────────────────────── */}
        <TabsContent value="history" className="mt-4 space-y-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
          ) : historyLoans.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t.myLoans.noHistory}</p>
          ) : (
            historyLoans.map(loan => (
              <Card key={loan.id} className="bg-muted/30">
                <CardContent className="p-3 flex items-center gap-4">
                  <div className="w-8 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-3.5 h-3.5 text-muted-foreground/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" data-testid={`history-title-${loan.id}`}>{loan.book?.title}</p>
                    <p className="text-xs text-muted-foreground">{loan.book?.author}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground flex-shrink-0">
                    <p>{t.myLoans.borrowed} {formatLocalDate(loan.borrowedAt, { month: "short", day: "numeric" })}</p>
                    {loan.returnedAt && (
                      <p>{t.myLoans.returned} {formatLocalDate(loan.returnedAt, { month: "short", day: "numeric", year: "numeric" })}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                    Returned
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ── Fines & Billing ───────────────────────────────────────── */}
        <TabsContent value="fines" className="mt-4 space-y-4">
          {finesLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ) : totalFine === 0 ? (
            <div className="py-12 text-center rounded-xl border border-dashed">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-7 h-7 text-green-600" />
              </div>
              <p className="text-sm font-semibold text-green-700">{t.fines.noFines}</p>
              <p className="text-xs text-muted-foreground mt-1">{t.fines.noFinesDesc}</p>
            </div>
          ) : (
            <>
              <div className="p-5 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-red-600 uppercase tracking-wide">{t.fines.outstandingBalance}</p>
                  <p className="text-3xl font-bold text-red-700 mt-0.5">${totalFine.toFixed(2)}</p>
                  <p className="text-xs text-red-500 mt-1">{t.fines.fineRate}</p>
                </div>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white gap-2"
                  onClick={() => setPayModalOpen(true)}
                >
                  <CreditCard className="w-4 h-4" />
                  {t.fines.payNow}
                </Button>
              </div>

              <div className="space-y-2">
                {finesData?.items?.map(item => (
                  <Card key={item.loanId} className="border-red-200">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                        <DollarSign className="w-4 h-4 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.bookTitle}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Due {formatLocalDate(item.dueDate)} · {t.fines.daysOverdue(item.daysOverdue)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-red-600">${item.fineAmount.toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground">{item.daysOverdue} × $0.50</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Separator />

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-semibold">{t.fines.total}</p>
                <p className="text-lg font-bold">${totalFine.toFixed(2)}</p>
              </div>

              <Button
                className="w-full gap-2 bg-primary"
                size="lg"
                onClick={() => setPayModalOpen(true)}
              >
                <CreditCard className="w-4 h-4" />
                {t.fines.clearFines} — ${totalFine.toFixed(2)}
              </Button>
            </>
          )}
        </TabsContent>
      </Tabs>

      <PaymentModal
        open={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        totalAmount={totalFine}
        onSuccess={handlePaySuccess}
      />
    </div>
  );
}
