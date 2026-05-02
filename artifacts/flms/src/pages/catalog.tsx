import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  useListBooks, getListBooksQueryKey,
  useListBookCategories, getListBookCategoriesQueryKey,
  ListBooksFormat,
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Search, BookOpen, ChevronLeft, ChevronRight,
  BookMarked, Wifi, LayoutGrid, List, Sparkles, RefreshCw, X, Heart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useI18n } from "@/lib/i18n";

const PAGE_SIZE = 12;

interface AISuggestion {
  bookId: number;
  title: string;
  author: string;
  category?: string;
  reason: string;
}

export default function CatalogPage() {
  const { token, user } = useAuth();
  const { t } = useI18n();
  const baseUrl = import.meta.env.BASE_URL;
  const apiBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [format, setFormat] = useState<string>("all");
  const [availability, setAvailability] = useState<string>("all");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set());
  const [wishlistLoading, setWishlistLoading] = useState<Set<number>>(new Set());

  const canBorrow = user?.role === "STUDENT" || user?.role === "FACULTY";
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!token || !canBorrow) return;
    fetch(`${apiBase}api/wishlist`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setWishlistIds(new Set((d.data ?? []).map((w: any) => w.bookId as number))))
      .catch(() => {});
  }, [token, canBorrow]);

  const toggleWishlist = async (e: React.MouseEvent, bookId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (wishlistLoading.has(bookId)) return;
    setWishlistLoading(prev => new Set([...prev, bookId]));
    try {
      const resp = await fetch(`${apiBase}api/wishlist/${bookId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      setWishlistIds(prev => {
        const next = new Set(prev);
        if (data.saved) { next.add(bookId); toast.success(t.wishlist.addedToWishlist); }
        else { next.delete(bookId); toast.success(t.wishlist.removedFromWishlist); }
        return next;
      });
    } catch {
      toast.error("Wishlist update failed");
    } finally {
      setWishlistLoading(prev => { const n = new Set(prev); n.delete(bookId); return n; });
    }
  };

  const params = {
    ...(debouncedQuery && { q: debouncedQuery }),
    ...(category !== "all" && { category }),
    ...(format !== "all" && { format: format as ListBooksFormat }),
    ...(availability === "available" && { available: true }),
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  const { data, isLoading } = useListBooks(params, { query: { queryKey: getListBooksQueryKey(params) } });
  const { data: categories } = useListBookCategories({ query: { queryKey: getListBookCategoriesQueryKey() } });

  const { data: suggestionsData, isFetching: suggestionsLoading, refetch: fetchSuggestions } = useQuery<{ suggestions: AISuggestion[]; _fallback?: boolean }>({
    queryKey: ["ai-suggestions"],
    queryFn: async () => {
      const resp = await fetch(`${apiBase}api/ai/suggestions`, { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) throw new Error("Suggestions unavailable");
      return resp.json();
    },
    enabled: false,
    staleTime: 5 * 60 * 1000,
  });

  const handleSuggest = async () => {
    setShowSuggestions(true);
    const result = await fetchSuggestions();
    if (result.data?._fallback) {
      toast.info("Using library recommendations", { description: "Personalized AI suggestions are unavailable — showing popular picks instead." });
    } else if (result.data?.suggestions?.length) {
      toast.success("AI suggestions ready", { description: "Based on your borrowing history." });
    }
  };

  const totalPages = data?.totalPages ?? 0;
  const handleFilterChange = () => setPage(1);
  const hasFilters = query || category !== "all" || format !== "all" || availability !== "all" || yearFrom || yearTo;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-light" data-testid="heading-catalog">{t.catalog.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? t.common.loading : t.catalog.titlesAvailable(data?.totalRecords ?? 0)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canBorrow && (
            <Button variant="outline" size="sm" onClick={handleSuggest} disabled={suggestionsLoading} className="gap-1.5 text-xs" data-testid="button-ai-suggestions">
              {suggestionsLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
              {suggestionsLoading ? t.catalog.thinking : t.catalog.aiSuggestions}
            </Button>
          )}
          <div className="flex items-center gap-1 border rounded-md overflow-hidden">
            <button onClick={() => setViewMode("grid")} className={cn("p-2 transition-colors", viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted")} data-testid="button-grid-view">
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode("list")} className={cn("p-2 transition-colors", viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted")} data-testid="button-list-view">
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* AI Suggestions panel */}
      {showSuggestions && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-sm font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                {t.catalog.aiSmartSuggestions}
                <span className="text-xs font-normal text-muted-foreground">{t.catalog.basedOnHistory}</span>
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowSuggestions(false)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {suggestionsLoading ? (
              <div className="grid sm:grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
              </div>
            ) : !suggestionsData?.suggestions?.length ? (
              <p className="text-sm text-muted-foreground py-2">{t.catalog.noSuggestions}</p>
            ) : (
              <div className="grid sm:grid-cols-3 gap-3">
                {suggestionsData.suggestions.map((s) => (
                  <Link key={s.bookId} href={`/catalog/${s.bookId}`} className="block" data-testid={`suggestion-${s.bookId}`}>
                    <div className="rounded-lg border border-amber-200 bg-white p-3 hover:shadow-sm transition-shadow h-full">
                      <div className="flex items-start gap-2 mb-1.5">
                        <div className="w-7 h-7 rounded bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold line-clamp-2 leading-tight">{s.title}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{s.author}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{s.reason}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t.catalog.searchPlaceholder} className="pl-9" value={query} onChange={(e) => { setQuery(e.target.value); handleFilterChange(); }} data-testid="input-search" />
        </div>
        <Select value={category} onValueChange={(v) => { setCategory(v); handleFilterChange(); }}>
          <SelectTrigger className="w-44" data-testid="select-category"><SelectValue placeholder={t.catalog.allCategories} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.catalog.allCategories}</SelectItem>
            {categories?.categories?.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={format} onValueChange={(v) => { setFormat(v); handleFilterChange(); }}>
          <SelectTrigger className="w-36" data-testid="select-format"><SelectValue placeholder={t.catalog.allFormats} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.catalog.allFormats}</SelectItem>
            <SelectItem value="PHYSICAL">{t.catalog.physical}</SelectItem>
            <SelectItem value="DIGITAL">{t.catalog.digital}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={availability} onValueChange={(v) => { setAvailability(v); handleFilterChange(); }}>
          <SelectTrigger className="w-40" data-testid="select-availability"><SelectValue placeholder={t.catalog.anyAvailability} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.catalog.anyAvailability}</SelectItem>
            <SelectItem value="available">{t.catalog.availableNow}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Input type="number" placeholder={t.catalog.fromYear} className="w-24 text-sm" value={yearFrom} onChange={(e) => { setYearFrom(e.target.value); handleFilterChange(); }} data-testid="input-year-from" />
          <span className="text-muted-foreground text-xs">–</span>
          <Input type="number" placeholder={t.catalog.toYear} className="w-24 text-sm" value={yearTo} onChange={(e) => { setYearTo(e.target.value); handleFilterChange(); }} data-testid="input-year-to" />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setQuery(""); setCategory("all"); setFormat("all"); setAvailability("all"); setYearFrom(""); setYearTo(""); setPage(1); }} data-testid="button-clear-filters">
            {t.catalog.clearFilters}
          </Button>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className={cn("grid gap-4", viewMode === "grid" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1")}>
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className={viewMode === "grid" ? "h-52" : "h-24"} />)}
        </div>
      ) : !data?.data?.length ? (
        <div className="text-center py-16">
          <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">{t.catalog.noBooksFound}</p>
          <Button variant="link" onClick={() => { setQuery(""); setCategory("all"); setFormat("all"); setAvailability("all"); setYearFrom(""); setYearTo(""); }}>
            {t.catalog.clearFilters}
          </Button>
        </div>
      ) : (() => {
        const yearFromNum = yearFrom ? parseInt(yearFrom) : null;
        const yearToNum = yearTo ? parseInt(yearTo) : null;
        const filtered = data.data.filter(book => {
          if (yearFromNum && (book.publicationYear ?? 0) < yearFromNum) return false;
          if (yearToNum && (book.publicationYear ?? 9999) > yearToNum) return false;
          return true;
        });

        if (!filtered.length) {
          return (
            <div className="text-center py-16">
              <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">{t.catalog.noBooksInRange}</p>
            </div>
          );
        }

        return viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(book => (
              <Link key={book.id} href={`/catalog/${book.id}`} className="block" data-testid={`book-card-${book.id}`}>
                <Card className="hover-elevate h-full transition-shadow hover:shadow-md relative group">
                  <CardContent className="p-4 space-y-2">
                    <div className="aspect-[3/4] rounded-md bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-3 relative">
                      <BookOpen className="w-8 h-8 text-primary/30" />
                      {canBorrow && (
                        <button
                          onClick={(e) => toggleWishlist(e, book.id)}
                          className={cn(
                            "absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center transition-all",
                            "bg-white/80 hover:bg-white shadow-sm",
                            "opacity-0 group-hover:opacity-100",
                            wishlistIds.has(book.id) && "opacity-100"
                          )}
                          title={wishlistIds.has(book.id) ? t.wishlist.remove : t.wishlist.add}
                        >
                          <Heart className={cn("w-3.5 h-3.5 transition-colors", wishlistIds.has(book.id) ? "fill-rose-500 text-rose-500" : "text-muted-foreground")} />
                        </button>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm leading-tight line-clamp-2">{book.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{book.author}</p>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <Badge variant={book.availableCopies > 0 ? "default" : "secondary"} className="text-xs" data-testid={`badge-availability-${book.id}`}>
                        {book.availableCopies > 0 ? t.catalog.avail(book.availableCopies) : t.catalog.unavailable}
                      </Badge>
                      {book.format === "DIGITAL"
                        ? <Wifi className="w-3.5 h-3.5 text-muted-foreground" />
                        : <BookMarked className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(book => (
              <Link key={book.id} href={`/catalog/${book.id}`} className="block" data-testid={`book-row-${book.id}`}>
                <Card className="hover-elevate">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-12 rounded bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-4 h-4 text-primary/40" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{book.title}</p>
                      <p className="text-xs text-muted-foreground">{book.author} · {book.publicationYear}</p>
                    </div>
                    <div className="hidden md:flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">{book.category}</Badge>
                      {book.format === "DIGITAL"
                        ? <Badge variant="secondary" className="text-xs">{t.catalog.digital}</Badge>
                        : <Badge variant="outline" className="text-xs">{book.shelfLocation}</Badge>}
                    </div>
                    <Badge variant={book.availableCopies > 0 ? "default" : "secondary"} className="text-xs whitespace-nowrap">
                      {book.availableCopies > 0 ? `${book.availableCopies}/${book.totalCopies}` : t.catalog.unavailable}
                    </Badge>
                    {canBorrow && (
                      <button
                        onClick={(e) => toggleWishlist(e, book.id)}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                        title={wishlistIds.has(book.id) ? t.wishlist.remove : t.wishlist.add}
                      >
                        <Heart className={cn("w-4 h-4", wishlistIds.has(book.id) ? "fill-rose-500 text-rose-500" : "text-muted-foreground")} />
                      </button>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        );
      })()}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">{t.common.pageOf(page, totalPages)}</p>
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
