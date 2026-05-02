import { useState } from "react";
import { Link } from "wouter";
import {
  useListBooks, getListBooksQueryKey,
  useListBookCategories, getListBookCategoriesQueryKey,
  ListBooksFormat,
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, BookOpen, ChevronLeft, ChevronRight,
  BookMarked, Wifi, LayoutGrid, List
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

const PAGE_SIZE = 12;

export default function CatalogPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [format, setFormat] = useState<string>("all");
  const [availability, setAvailability] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const debouncedQuery = useDebounce(query, 300);

  const params = {
    ...(debouncedQuery && { q: debouncedQuery }),
    ...(category !== "all" && { category }),
    ...(format !== "all" && { format: format as ListBooksFormat }),
    ...(availability === "available" && { available: true }),
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  const { data, isLoading } = useListBooks(params, {
    query: { queryKey: getListBooksQueryKey(params) }
  });

  const { data: categories } = useListBookCategories({
    query: { queryKey: getListBookCategoriesQueryKey() }
  });

  const totalPages = data?.totalPages ?? 0;
  const handleFilterChange = () => setPage(1);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl font-light" data-testid="heading-catalog">Book Catalog</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? "Loading..." : `${data?.totalRecords ?? 0} titles available`}
          </p>
        </div>
        <div className="flex items-center gap-1 border rounded-md overflow-hidden">
          <button
            onClick={() => setViewMode("grid")}
            className={cn("p-2 transition-colors", viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
            data-testid="button-grid-view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn("p-2 transition-colors", viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
            data-testid="button-list-view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, author, ISBN..."
            className="pl-9"
            value={query}
            onChange={(e) => { setQuery(e.target.value); handleFilterChange(); }}
            data-testid="input-search"
          />
        </div>

        <Select value={category} onValueChange={(v) => { setCategory(v); handleFilterChange(); }}>
          <SelectTrigger className="w-44" data-testid="select-category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories?.categories?.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={format} onValueChange={(v) => { setFormat(v); handleFilterChange(); }}>
          <SelectTrigger className="w-36" data-testid="select-format">
            <SelectValue placeholder="Format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All formats</SelectItem>
            <SelectItem value="PHYSICAL">Physical</SelectItem>
            <SelectItem value="DIGITAL">Digital</SelectItem>
          </SelectContent>
        </Select>

        <Select value={availability} onValueChange={(v) => { setAvailability(v); handleFilterChange(); }}>
          <SelectTrigger className="w-40" data-testid="select-availability">
            <SelectValue placeholder="Availability" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any availability</SelectItem>
            <SelectItem value="available">Available now</SelectItem>
          </SelectContent>
        </Select>

        {(query || category !== "all" || format !== "all" || availability !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setQuery(""); setCategory("all"); setFormat("all"); setAvailability("all"); setPage(1); }}
            data-testid="button-clear-filters"
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className={cn("grid gap-4", viewMode === "grid" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1")}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className={viewMode === "grid" ? "h-52" : "h-24"} />
          ))}
        </div>
      ) : !data?.data?.length ? (
        <div className="text-center py-16">
          <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No books found matching your criteria</p>
          <Button variant="link" onClick={() => { setQuery(""); setCategory("all"); setFormat("all"); setAvailability("all"); }}>
            Clear filters
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {data.data.map(book => (
            <Link
              key={book.id}
              href={`/catalog/${book.id}`}
              className="block"
              data-testid={`book-card-${book.id}`}
            >
              <Card className="hover-elevate h-full transition-shadow hover:shadow-md">
                <CardContent className="p-4 space-y-2">
                  <div className="aspect-[3/4] rounded-md bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-3">
                    <BookOpen className="w-8 h-8 text-primary/30" />
                  </div>
                  <div>
                    <p className="font-medium text-sm leading-tight line-clamp-2">{book.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{book.author}</p>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <Badge
                      variant={book.availableCopies > 0 ? "default" : "secondary"}
                      className="text-xs"
                      data-testid={`badge-availability-${book.id}`}
                    >
                      {book.availableCopies > 0 ? `${book.availableCopies} avail.` : "Unavailable"}
                    </Badge>
                    {book.format === "DIGITAL" ? (
                      <Wifi className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                      <BookMarked className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {data.data.map(book => (
            <Link
              key={book.id}
              href={`/catalog/${book.id}`}
              className="block"
              data-testid={`book-row-${book.id}`}
            >
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
                    {book.format === "DIGITAL" ? (
                      <Badge variant="secondary" className="text-xs">Digital</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">{book.shelfLocation}</Badge>
                    )}
                  </div>
                  <Badge
                    variant={book.availableCopies > 0 ? "default" : "secondary"}
                    className="text-xs whitespace-nowrap"
                  >
                    {book.availableCopies > 0 ? `${book.availableCopies}/${book.totalCopies}` : "Unavailable"}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              data-testid="button-next-page"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
