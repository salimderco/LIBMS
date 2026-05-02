import {
  useGetMyLoans, getGetMyLoansQueryKey,
  useRenewLoan,
  getGetDashboardSummaryQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  BookMarked, AlertTriangle, Clock, RotateCcw, CheckCircle,
  BookOpen, ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, differenceInDays, isPast } from "date-fns";

export default function MyLoansPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useGetMyLoans({
    query: { queryKey: getGetMyLoansQueryKey() }
  });

  const renewMutation = useRenewLoan();

  const handleRenew = (loanId: number) => {
    renewMutation.mutate(
      { loanId },
      {
        onSuccess: () => {
          toast({ title: "Loan renewed", description: "Your loan has been extended by 14 days." });
          queryClient.invalidateQueries({ queryKey: getGetMyLoansQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        },
        onError: (err: any) => {
          const msg = err?.data?.message ?? err?.message ?? "Could not renew loan";
          toast({ title: "Renewal failed", description: msg, variant: "destructive" });
        }
      }
    );
  };

  const activeLoan = data?.active ?? [];
  const historyLoans = data?.history ?? [];

  const getDueStatus = (dueDate: string) => {
    const due = parseISO(dueDate);
    const daysLeft = differenceInDays(due, new Date());
    if (isPast(due)) return { label: "Overdue", color: "bg-red-100 text-red-700", icon: AlertTriangle };
    if (daysLeft <= 3) return { label: `Due in ${daysLeft}d`, color: "bg-amber-100 text-amber-700", icon: Clock };
    return { label: `Due ${format(due, "MMM d")}`, color: "bg-green-100 text-green-700", icon: Clock };
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-light" data-testid="heading-my-loans">My Loans</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track your borrowed books and renewal history</p>
      </div>

      {/* Active loans */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BookMarked className="w-4 h-4 text-primary" />
          <h2 className="font-medium">Active Loans</h2>
          <Badge variant="secondary" className="text-xs">{activeLoan.length}</Badge>
        </div>

        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)
        ) : activeLoan.length === 0 ? (
          <div className="py-10 text-center rounded-lg border border-dashed">
            <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No active loans</p>
            <Link
              href="/catalog"
              className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1"
              data-testid="link-browse-catalog"
            >
              Browse the catalog <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {activeLoan.map(loan => {
              const dueStatus = getDueStatus(loan.dueDate);
              const StatusIcon = dueStatus.icon;
              const canRenew = loan.renewalsCount < 2;
              return (
                <Card key={loan.id} className={cn("transition-all", dueStatus.label === "Overdue" && "border-red-200 bg-red-50/30")}>
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="w-10 h-12 rounded bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-4 h-4 text-primary/40" />
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
                      <div className="flex items-center gap-3 mt-2">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1", dueStatus.color)}>
                          <StatusIcon className="w-3 h-3" />
                          {dueStatus.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Borrowed {format(parseISO(loan.borrowedAt), "MMM d, yyyy")}
                        </span>
                        {loan.renewalsCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {loan.renewalsCount} renewal{loan.renewalsCount > 1 ? "s" : ""} used
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canRenew || renewMutation.isPending}
                        onClick={() => handleRenew(loan.id)}
                        data-testid={`button-renew-${loan.id}`}
                        title={!canRenew ? "Maximum renewals reached" : "Renew for 14 more days"}
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                        Renew {canRenew ? `(${2 - loan.renewalsCount} left)` : "(max)"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Separator />

      {/* History */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-medium">Borrowing History</h2>
          <Badge variant="secondary" className="text-xs">{historyLoans.length}</Badge>
        </div>

        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
        ) : historyLoans.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No borrowing history yet.</p>
        ) : (
          <div className="space-y-2">
            {historyLoans.map(loan => (
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
                    <p>Borrowed {format(parseISO(loan.borrowedAt), "MMM d")}</p>
                    {loan.returnedAt && <p>Returned {format(parseISO(loan.returnedAt), "MMM d, yyyy")}</p>}
                  </div>
                  <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                    Returned
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
