import { Router } from "express";
import { db } from "@workspace/db";
import { reviewsTable, usersTable, loansTable } from "@workspace/db";
import { eq, and, avg, count } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../middlewares/authenticate.js";

const router = Router();

router.get("/books/:bookId/reviews", authenticate as any, async (req, res) => {
  const bookId = parseInt(req.params.bookId);

  const reviews = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.bookId, bookId))
    .orderBy(reviewsTable.createdAt);

  const data = await Promise.all(reviews.map(async (r) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, r.userId)).limit(1);
    return {
      id: r.id,
      userId: r.userId,
      bookId: r.bookId,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      user: user ? { id: user.id, name: user.name, role: user.role } : undefined,
    };
  }));

  const [stats] = await db
    .select({ avgRating: avg(reviewsTable.rating), totalReviews: count() })
    .from(reviewsTable)
    .where(eq(reviewsTable.bookId, bookId));

  res.json({
    data,
    avgRating: stats.avgRating ? parseFloat(Number(stats.avgRating).toFixed(1)) : null,
    totalReviews: Number(stats.totalReviews),
  });
});

router.post("/books/:bookId/reviews", authenticate as any, async (req: AuthRequest, res) => {
  const bookId = parseInt(req.params.bookId);
  const userId = req.user!.id;
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Validation", message: "Rating must be between 1 and 5" });
  }

  if (!["STUDENT", "FACULTY"].includes(req.user!.role)) {
    return res.status(403).json({ error: "Forbidden", message: "Only students and faculty can write reviews" });
  }

  const borrowed = await db
    .select()
    .from(loansTable)
    .where(and(eq(loansTable.userId, userId), eq(loansTable.bookId, bookId)))
    .limit(1);

  if (borrowed.length === 0) {
    return res.status(403).json({ error: "Forbidden", message: "You must borrow this book before reviewing it" });
  }

  const existing = await db
    .select()
    .from(reviewsTable)
    .where(and(eq(reviewsTable.userId, userId), eq(reviewsTable.bookId, bookId)))
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(reviewsTable)
      .set({ rating: parseInt(rating), comment: comment || null, updatedAt: new Date() })
      .where(eq(reviewsTable.id, existing[0].id))
      .returning();
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    return res.json({ ...updated, user: user ? { id: user.id, name: user.name, role: user.role } : undefined });
  }

  const [newReview] = await db
    .insert(reviewsTable)
    .values({ userId, bookId, rating: parseInt(rating), comment: comment || null })
    .returning();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  res.status(201).json({ ...newReview, user: user ? { id: user.id, name: user.name, role: user.role } : undefined });
});

router.delete("/reviews/:reviewId", authenticate as any, async (req: AuthRequest, res) => {
  const reviewId = parseInt(req.params.reviewId);
  const [review] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, reviewId)).limit(1);
  if (!review) return res.status(404).json({ error: "NotFound", message: "Review not found" });

  const isOwner = review.userId === req.user!.id;
  const isStaff = ["LIBRARIAN", "ADMIN"].includes(req.user!.role);
  if (!isOwner && !isStaff) return res.status(403).json({ error: "Forbidden" });

  await db.delete(reviewsTable).where(eq(reviewsTable.id, reviewId));
  res.json({ message: "Review deleted" });
});

export default router;
