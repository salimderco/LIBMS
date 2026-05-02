import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Heart, BookOpen, ArrowRight, BookMarked, Wifi } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface WishlistItem {
  id: number;
  bookId: number;
  addedAt: string;
  book?: {
    id: number;
    title: string;
    author: string;
    category: string;
    format: string;
    availableCopies: number;
    totalCopies: number;
    coverImage?: string | null;
    shelfLocation?: string | null;
  };
}

export default function WishlistPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const baseUrl = import.meta.env.BASE_URL;
  const apiBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);

  const load = () => {
    fetch(`${apiBase}api/wishlist`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setItems(d.data ?? []))
      .catch(() => toast.error("Failed to load wishlist"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleRemove = async (bookId: number) => {
    setRemoving(bookId);
    try {
      await fetch(`${apiBase}api/wishlist/${bookId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(prev => prev.filter(i => i.bookId !== bookId));
      toast.success(t.wishlist.removedFromWishlist);
    } catch {
      toast.error("Failed to remove");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-light flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
          {t.wishlist.title}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t.wishlist.subtitle}</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center rounded-lg border border-dashed">
          <Heart className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t.wishlist.noWishlist}</p>
          <Link href="/catalog" className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1">
            {t.wishlist.browseMore} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <Card key={item.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-12 rounded bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-4 h-4 text-primary/40" />
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/catalog/${item.book?.id}`}
                    className="font-medium hover:text-primary transition-colors line-clamp-1"
                  >
                    {item.book?.title}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.book?.author}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge
                      variant={item.book && item.book.availableCopies > 0 ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {item.book && item.book.availableCopies > 0
                        ? `${item.book.availableCopies} available`
                        : "Unavailable"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">{item.book?.category}</Badge>
                    {item.book?.format === "DIGITAL"
                      ? <Wifi className="w-3.5 h-3.5 text-muted-foreground" />
                      : <BookMarked className="w-3.5 h-3.5 text-muted-foreground" />}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link href={`/catalog/${item.book?.id}`}>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      View
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                    onClick={() => item.book && handleRemove(item.book.id)}
                    disabled={removing === item.bookId}
                  >
                    <Heart className="w-4 h-4 fill-rose-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
