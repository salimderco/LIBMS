import { Link } from "wouter";
import {
  useGetBook, getGetBookQueryKey,
  useBorrowBook,
  getListBooksQueryKey, getGetDashboardSummaryQueryKey
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen, ArrowLeft, MapPin, Wifi, BookMarked,
  Calendar, Hash, Building, Layers, Loader2
} from "lucide-react";
import { useState } from "react";

interface Props { bookId: number }

export default function BookDetailPage({ bookId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [borrowError, setBorrowError] = useState("");

  const { data: book, isLoading } = useGetBook(bookId, {
    query: { queryKey: getGetBookQueryKey(bookId) }
  });

  const borrowMutation = useBorrowBook();
  const canBorrow = user?.role === "STUDENT" || user?.role === "FACULTY";

  const handleBorrow = () => {
    setBorrowError("");
    borrowMutation.mutate(
      { data: { bookId } },
      {
        onSuccess: () => {
          toast({ title: "Book borrowed!", description: `You have borrowed "${book?.title}". Due in 14 days.` });
          queryClient.invalidateQueries({ queryKey: getGetBookQueryKey(bookId) });
          queryClient.invalidateQueries({ queryKey: getListBooksQueryKey({}) });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        },
        onError: (err: any) => {
          const msg = err?.data?.message ?? err?.message ?? "Failed to borrow book";
          setBorrowError(msg);
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-4 w-24" />
        <div className="grid md:grid-cols-3 gap-8">
          <Skeleton className="aspect-[3/4] rounded-lg" />
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Book not found.</p>
        <Link href="/catalog" className="text-primary hover:underline text-sm mt-2 block">Back to catalog</Link>
      </div>
    );
  }

  const isAvailable = book.availableCopies > 0;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      <Link
        href="/catalog"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        data-testid="link-back-catalog"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to catalog
      </Link>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Cover */}
        <div className="space-y-4">
          <div className="aspect-[3/4] rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 border border-border flex items-center justify-center">
            <BookOpen className="w-16 h-16 text-primary/20" />
          </div>

          {/* Availability */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Availability</span>
              <Badge variant={isAvailable ? "default" : "secondary"} data-testid="badge-available">
                {isAvailable ? "Available" : "Unavailable"}
              </Badge>
            </div>
            {book.format === "PHYSICAL" && (
              <p className="text-xs text-muted-foreground">
                {book.availableCopies} of {book.totalCopies} copies available
              </p>
            )}
            {canBorrow && (
              <>
                {borrowError && (
                  <Alert variant="destructive" className="py-2">
                    <AlertDescription className="text-xs">{borrowError}</AlertDescription>
                  </Alert>
                )}
                <Button
                  className="w-full"
                  disabled={!isAvailable || borrowMutation.isPending}
                  onClick={handleBorrow}
                  data-testid="button-borrow"
                >
                  {borrowMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Borrowing...</>
                  ) : (
                    <><BookMarked className="w-4 h-4 mr-2" />Borrow this book</>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{book.category}</Badge>
              {book.format === "DIGITAL" ? (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Wifi className="w-3 h-3" /> Digital
                </Badge>
              ) : (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <BookMarked className="w-3 h-3" /> Physical
                </Badge>
              )}
            </div>
            <h1 className="font-serif text-2xl font-light leading-snug" data-testid="heading-book-title">{book.title}</h1>
            <p className="text-muted-foreground">{book.author}</p>
          </div>

          {book.description && (
            <p className="text-sm leading-relaxed text-muted-foreground border-l-2 border-primary/30 pl-4">
              {book.description}
            </p>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Hash, label: "ISBN", value: book.isbn },
              { icon: Building, label: "Publisher", value: book.publisher },
              { icon: Calendar, label: "Year", value: book.publicationYear?.toString() },
              { icon: Layers, label: "Edition", value: book.edition },
              ...(book.format === "PHYSICAL" && book.shelfLocation ? [
                { icon: MapPin, label: "Shelf", value: book.shelfLocation }
              ] : []),
            ].map(({ icon: Icon, label, value }) => value ? (
              <div key={label} className="flex items-start gap-2">
                <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm">{value}</p>
                </div>
              </div>
            ) : null)}
          </div>

          {book.tags?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {book.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
