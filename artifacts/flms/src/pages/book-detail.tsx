import { Link } from "wouter";
import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  BookOpen, ArrowLeft, MapPin, Wifi, BookMarked,
  Calendar, Hash, Building, Layers, Loader2,
  Heart, Clock, Star, Trash2, BookmarkPlus
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Props { bookId: number }

interface Review {
  id: number;
  userId: number;
  rating: number;
  comment?: string | null;
  createdAt: string;
  user?: { id: number; name: string; role: string };
}

interface Reservation {
  id: number;
  status: string;
  queuePosition: number;
}

function StarRating({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={cn("transition-colors", !readonly && "hover:text-amber-400 cursor-pointer")}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          onClick={() => !readonly && onChange?.(star)}
        >
          <Star
            className={cn(
              "w-5 h-5",
              star <= (hover || value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
            )}
          />
        </button>
      ))}
    </div>
  );
}

export default function BookDetailPage({ bookId }: Props) {
  const { user, token } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const baseUrl = import.meta.env.BASE_URL;
  const apiBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

  const { data: book, isLoading } = useGetBook(bookId, {
    query: { queryKey: getGetBookQueryKey(bookId) }
  });

  const borrowMutation = useBorrowBook();
  const canBorrow = user?.role === "STUDENT" || user?.role === "FACULTY";

  const [wishlistSaved, setWishlistSaved] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [reserving, setReserving] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [totalReviews, setTotalReviews] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${apiBase}api/books/${bookId}/reviews`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        setReviews(d.data ?? []);
        setAvgRating(d.avgRating ?? null);
        setTotalReviews(d.totalReviews ?? 0);
        const mine = (d.data ?? []).find((r: Review) => r.user?.id === user?.id);
        if (mine) { setMyReview(mine); setMyRating(mine.rating); setMyComment(mine.comment ?? ""); }
      })
      .finally(() => setReviewsLoading(false));

    fetch(`${apiBase}api/wishlist`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setWishlistSaved((d.data ?? []).some((w: any) => w.bookId === bookId)); });

    if (canBorrow) {
      fetch(`${apiBase}api/reservations/my`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => {
          const mine = (d.data ?? []).find((r: any) => r.bookId === bookId);
          if (mine) setReservation(mine);
        });
    }
  }, [bookId, token]);

  const handleBorrow = () => {
    borrowMutation.mutate(
      { data: { bookId } },
      {
        onSuccess: () => {
          toast.success("Book borrowed!", { description: `"${book?.title}" is now in your loans.` });
          queryClient.invalidateQueries({ queryKey: getGetBookQueryKey(bookId) });
          queryClient.invalidateQueries({ queryKey: getListBooksQueryKey({}) });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        },
        onError: (err: any) => toast.error("Could not borrow book", { description: err?.data?.message ?? err?.message }),
      }
    );
  };

  const handleWishlist = async () => {
    setWishlistLoading(true);
    try {
      const resp = await fetch(`${apiBase}api/wishlist/${bookId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      setWishlistSaved(data.saved);
      toast.success(data.saved ? t.wishlist.addedToWishlist : t.wishlist.removedFromWishlist);
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleReserve = async () => {
    if (reservation) {
      setReserving(true);
      try {
        await fetch(`${apiBase}api/reservations/${reservation.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        setReservation(null);
        toast.success("Reservation cancelled");
      } finally { setReserving(false); }
      return;
    }
    setReserving(true);
    try {
      const resp = await fetch(`${apiBase}api/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookId }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error("Reservation failed", { description: data.message });
      } else {
        setReservation(data);
        toast.success(t.reservations.reserve, { description: t.reservations.notifyWhenAvailable });
      }
    } finally { setReserving(false); }
  };

  const handleSubmitReview = async () => {
    if (myRating === 0) { toast.error("Please select a rating"); return; }
    setSubmittingReview(true);
    try {
      const resp = await fetch(`${apiBase}api/books/${bookId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating: myRating, comment: myComment }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        toast.error(err.message ?? "Review failed");
        return;
      }
      const updated = await resp.json();
      setMyReview(updated);
      setShowReviewForm(false);
      const reviewsResp = await fetch(`${apiBase}api/books/${bookId}/reviews`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await reviewsResp.json();
      setReviews(d.data ?? []); setAvgRating(d.avgRating); setTotalReviews(d.totalReviews);
      toast.success("Review submitted!");
    } finally { setSubmittingReview(false); }
  };

  const handleDeleteReview = async (reviewId: number) => {
    await fetch(`${apiBase}api/reviews/${reviewId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setMyReview(null); setMyRating(0); setMyComment("");
    const resp = await fetch(`${apiBase}api/books/${bookId}/reviews`, { headers: { Authorization: `Bearer ${token}` } });
    const d = await resp.json();
    setReviews(d.data ?? []); setAvgRating(d.avgRating); setTotalReviews(d.totalReviews);
    toast.success("Review deleted");
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-4 w-24" />
        <div className="grid md:grid-cols-3 gap-8">
          <Skeleton className="aspect-[3/4] rounded-lg" />
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-8 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">{t.bookDetail.bookNotFound}</p>
        <Link href="/catalog" className="text-primary hover:underline text-sm mt-2 block">{t.bookDetail.backLink}</Link>
      </div>
    );
  }

  const isAvailable = book.availableCopies > 0;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      <Link href="/catalog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-back-catalog">
        <ArrowLeft className="w-4 h-4" /> {t.bookDetail.backToCatalog}
      </Link>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="space-y-4">
          <div className="aspect-[3/4] rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 border border-border flex items-center justify-center relative overflow-hidden">
            {book.coverImage
              ? <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
              : <BookOpen className="w-16 h-16 text-primary/20" />}
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t.bookDetail.availability}</span>
              <Badge variant={isAvailable ? "default" : "secondary"} data-testid="badge-available">
                {isAvailable ? t.bookDetail.available : t.bookDetail.unavailable}
              </Badge>
            </div>
            {book.format === "PHYSICAL" && (
              <p className="text-xs text-muted-foreground">{t.bookDetail.copiesAvailable(book.availableCopies, book.totalCopies)}</p>
            )}

            {canBorrow && (
              <div className="space-y-2">
                {isAvailable ? (
                  <Button
                    className="w-full"
                    disabled={borrowMutation.isPending}
                    onClick={handleBorrow}
                    data-testid="button-borrow"
                  >
                    {borrowMutation.isPending
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t.bookDetail.borrowing}</>
                      : <><BookMarked className="w-4 h-4 mr-2" />{t.bookDetail.borrowBook}</>}
                  </Button>
                ) : (
                  <Button
                    variant={reservation ? "secondary" : "outline"}
                    className="w-full gap-2"
                    disabled={reserving}
                    onClick={handleReserve}
                  >
                    {reserving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                    {reservation ? t.reservations.cancelReservation : t.reservations.reserve}
                  </Button>
                )}

                {reservation && (
                  <p className="text-xs text-center text-muted-foreground">
                    {t.reservations.queuePosition(reservation.queuePosition)}
                  </p>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("w-full gap-2", wishlistSaved ? "text-rose-500 hover:text-rose-600" : "text-muted-foreground")}
                  onClick={handleWishlist}
                  disabled={wishlistLoading}
                >
                  <Heart className={cn("w-4 h-4", wishlistSaved && "fill-rose-500")} />
                  {wishlistSaved ? t.wishlist.remove : t.wishlist.add}
                </Button>
              </div>
            )}

            {avgRating !== null && (
              <div className="flex items-center gap-2 pt-1 border-t">
                <StarRating value={Math.round(avgRating)} readonly />
                <span className="text-xs text-muted-foreground">{t.reviews.avgRating(avgRating)} · {t.reviews.reviewCount(totalReviews)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{book.category}</Badge>
              {book.format === "DIGITAL"
                ? <Badge variant="secondary" className="flex items-center gap-1"><Wifi className="w-3 h-3" /> {t.bookDetail.digital}</Badge>
                : <Badge variant="secondary" className="flex items-center gap-1"><BookMarked className="w-3 h-3" /> {t.bookDetail.physical}</Badge>}
            </div>
            <h1 className="font-serif text-2xl font-light leading-snug" data-testid="heading-book-title">{book.title}</h1>
            <p className="text-muted-foreground">{book.author}</p>
          </div>

          {book.description && (
            <p className="text-sm leading-relaxed text-muted-foreground border-l-2 border-primary/30 pl-4">{book.description}</p>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Hash, label: t.bookDetail.isbn, value: book.isbn },
              { icon: Building, label: t.bookDetail.publisher, value: book.publisher },
              { icon: Calendar, label: t.bookDetail.year, value: book.publicationYear?.toString() },
              { icon: Layers, label: t.bookDetail.edition, value: book.edition },
              ...(book.format === "PHYSICAL" && book.shelfLocation ? [{ icon: MapPin, label: t.bookDetail.shelf, value: book.shelfLocation }] : []),
            ].map(({ icon: Icon, label, value }) => value ? (
              <div key={label} className="flex items-start gap-2">
                <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm">{value}</p></div>
              </div>
            ) : null)}
          </div>

          {(book.tags?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{t.bookDetail.tags}</p>
              <div className="flex flex-wrap gap-1.5">
                {book.tags.map(tag => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <Separator />
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-medium flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" />
            {t.reviews.title}
            {totalReviews > 0 && <span className="text-sm font-normal text-muted-foreground">({t.reviews.reviewCount(totalReviews)})</span>}
          </h2>
          {canBorrow && !showReviewForm && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowReviewForm(true)}>
              <BookmarkPlus className="w-3.5 h-3.5" />
              {myReview ? t.reviews.editReview : t.reviews.writeReview}
            </Button>
          )}
        </div>

        {showReviewForm && canBorrow && (
          <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">{t.reviews.rating}</p>
              <StarRating value={myRating} onChange={setMyRating} />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">{t.reviews.comment}</p>
              <Textarea
                value={myComment}
                onChange={e => setMyComment(e.target.value)}
                placeholder="Share your thoughts..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubmitReview} disabled={submittingReview || myRating === 0} className="gap-1.5">
                {submittingReview && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {t.reviews.submitReview}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowReviewForm(false)}>{t.common.cancel}</Button>
            </div>
          </div>
        )}

        {reviewsLoading ? (
          <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-lg">
            <Star className="w-6 h-6 mx-auto mb-2 text-muted-foreground/30" />
            {t.reviews.noReviews}
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map(review => (
              <div key={review.id} className={cn("border rounded-lg p-4 space-y-2", review.user?.id === user?.id && "border-primary/20 bg-primary/5")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <StarRating value={review.rating} readonly />
                      <span className="text-xs font-medium">{review.user?.name}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(review.createdAt), "MMM d, yyyy")}</span>
                    </div>
                    {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                  </div>
                  {review.user?.id === user?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteReview(review.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
