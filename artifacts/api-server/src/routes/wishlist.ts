import { Router } from "express";
import { db } from "@workspace/db";
import { wishlistsTable, booksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../middlewares/authenticate.js";

const router = Router();

router.get("/wishlist", authenticate as any, async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const rows = await db
    .select()
    .from(wishlistsTable)
    .where(eq(wishlistsTable.userId, userId))
    .orderBy(wishlistsTable.createdAt);

  const data = await Promise.all(rows.map(async (w) => {
    const [book] = await db.select().from(booksTable).where(eq(booksTable.id, w.bookId)).limit(1);
    return {
      id: w.id,
      bookId: w.bookId,
      addedAt: w.createdAt,
      book: book ? {
        id: book.id, title: book.title, author: book.author, isbn: book.isbn,
        category: book.category, format: book.format, availableCopies: book.availableCopies,
        totalCopies: book.totalCopies, coverImage: book.coverImage, shelfLocation: book.shelfLocation,
      } : undefined,
    };
  }));

  res.json({ data });
});

router.post("/wishlist/:bookId", authenticate as any, async (req: AuthRequest, res) => {
  const bookId = parseInt(req.params.bookId);
  const userId = req.user!.id;

  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, bookId)).limit(1);
  if (!book) return res.status(404).json({ error: "NotFound", message: "Book not found" });

  const existing = await db
    .select()
    .from(wishlistsTable)
    .where(and(eq(wishlistsTable.userId, userId), eq(wishlistsTable.bookId, bookId)))
    .limit(1);

  if (existing.length > 0) {
    await db.delete(wishlistsTable).where(eq(wishlistsTable.id, existing[0].id));
    return res.json({ saved: false, message: "Removed from wishlist" });
  }

  await db.insert(wishlistsTable).values({ userId, bookId });
  res.status(201).json({ saved: true, message: "Added to wishlist" });
});

router.delete("/wishlist/:bookId", authenticate as any, async (req: AuthRequest, res) => {
  const bookId = parseInt(req.params.bookId);
  const userId = req.user!.id;
  await db
    .delete(wishlistsTable)
    .where(and(eq(wishlistsTable.userId, userId), eq(wishlistsTable.bookId, bookId)));
  res.json({ message: "Removed from wishlist" });
});

export default router;
