import { useState } from "react";
import {
  useListAllLoans, getListAllLoansQueryKey,
  useReturnLoan, ListAllLoansStatus,
  getGetDashboardSummaryQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Search, BookMarked, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, isPast } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-blue-100 text-blue-700",
  RETURNED: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
};
const PAGE_SIZE = 20;

export default function AllLoansPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [returningId, setReturningId] = useState<number | null>(null);
  const returnMutation = useReturnLoan();

  const params = {
    ...(search && { q: search }),
    ...(status !== "all" && { status: status as ListAllLoansStatus }),
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  const { data, isLoading } = useListAllLoans(params, {
    query: { queryKey: getListAllLoansQueryKey(params) }
  });

  const totalPages = data?.totalPages ?? 0;

  const getComputedStatus = (loan: { dueDate: string; returnedAt?: string | null }) => {
    if (loan.returnedAt) return "RETURNED";
    if (isPast(parseISO(loan.dueDate))) return "OVERDUE";
    return "ACTIVE";
  };

  const handleReturn = (loanId: number, bookTitle?: string) => {
    setReturningId(loanId);
    returnMutation.mutate(
      { loanId },
      {
        onSuccess: () => {
          toast.success("Book returned", {
            description: `"${bookTitle ?? "Book"}" has been checked in successfully.`,
          });
          queryClient.invalidateQueries({ queryKey: getListAllLoansQueryKey({}) });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          setReturningId(null);
        },
        onError: (err: any) => {
          const msg = err?.data?.message ?? err?.message ?? "Failed to process return";
          toast.error("Return failed", { description: msg });
          setReturningId(null);
        }
      }
    );
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-light" data-testid="heading-all-loans">All Loans</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isLoading ? "Loading..." : `${data?.totalRecords ?? 0} total loans`}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by user or book title..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            data-testid="input-search-loans"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-36" data-testid="select-loan-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
            <SelectItem value="RETURNED">Returned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
      ) : !data?.data?.length ? (
        <div className="text-center py-16">
          <BookMarked className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No loans found</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="hidden md:grid grid-cols-[1fr_1fr_120px_100px_80px_130px] gap-4 px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span>Book</span>
            <span>Borrower</span>
            <span>Borrowed</span>
            <span>Due</span>
            <span>Status</span>
            <span>Action</span>
          </div>

          {data.data.map(loan => {
            const computedStatus = getComputedStatus({ dueDate: loan.dueDate, returnedAt: loan.returnedAt });
            return (
              <Card key={loan.id} className={cn(
                "transition-colors",
                computedStatus === "OVERDUE" && "border-red-200 bg-red-50/30"
              )}>
                <CardContent className="p-4 grid md:grid-cols-[1fr_1fr_120px_100px_80px_130px] gap-3 md:gap-4 items-center">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate" data-testid={`loan-book-${loan.id}`}>{loan.book?.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{loan.book?.author}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm truncate">{loan.user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{loan.user?.email}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{format(parseISO(loan.borrowedAt), "MMM d, yyyy")}</p>
                  <p className={cn("text-sm", computedStatus === "OVERDUE" && "text-red-600 font-medium")}>
                    {format(parseISO(loan.dueDate), "MMM d")}
                  </p>
                  <span className={cn("text-xs px-2 py-1 rounded-full font-medium inline-block text-center", STATUS_COLORS[computedStatus])}>
                    {computedStatus}
                  </span>
                  {computedStatus !== "RETURNED" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={returningId === loan.id}
                      onClick={() => handleReturn(loan.id, loan.book?.title)}
                      data-testid={`button-return-${loan.id}`}
                    >
                      {returningId === loan.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        "Process Return"
                      )}
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {loan.returnedAt ? format(parseISO(loan.returnedAt), "MMM d") : "—"}
                    </span>
                  )}
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
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} data-testid="button-prev-page">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} data-testid="button-next-page">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
