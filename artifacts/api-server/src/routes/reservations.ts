import { Router } from "express";
import { db } from "@workspace/db";
import { reservationsTable, booksTable, usersTable, notificationsTable } from "@workspace/db";
import { eq, and, count, asc } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../middlewares/authenticate.js";

const router = Router();

async function serializeReservation(res: typeof reservationsTable.$inferSelect) {
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, res.bookId)).limit(1);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, res.userId)).limit(1);
  return {
    id: res.id,
    userId: res.userId,
    bookId: res.bookId,
    status: res.status,
    queuePosition: res.queuePosition,
    notifiedAt: res.notifiedAt,
    createdAt: res.createdAt,
    book: book ? {
      id: book.id, title: book.title, author: book.author, isbn: book.isbn,
      category: book.category, format: book.format, availableCopies: book.availableCopies,
      totalCopies: book.totalCopies, coverImage: book.coverImage,
    } : undefined,
    user: user ? {
      id: user.id, name: user.name, email: user.email, role: user.role,
    } : undefined,
  };
}

router.get("/reservations/my", authenticate as any, async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const rows = await db
    .select()
    .from(reservationsTable)
    .where(and(eq(reservationsTable.userId, userId), eq(reservationsTable.status, "PENDING")))
    .orderBy(asc(reservationsTable.createdAt));
  const data = await Promise.all(rows.map(serializeReservation));
  res.json({ data });
});

router.get("/reservations", authenticate as any, requireRole("LIBRARIAN", "ADMIN") as any, async (_req, res) => {
  const rows = await db
    .select()
    .from(reservationsTable)
    .where(eq(reservationsTable.status, "PENDING"))
    .orderBy(asc(reservationsTable.createdAt));
  const data = await Promise.all(rows.map(serializeReservation));
  res.json({ data });
});

router.post("/reservations", authenticate as any, async (req: AuthRequest, res) => {
  const { bookId } = req.body;
  if (!bookId) return res.status(400).json({ error: "Validation", message: "bookId is required" });

  const userId = req.user!.id;
  const role = req.user!.role;

  if (!["STUDENT", "FACULTY"].includes(role)) {
    return res.status(403).json({ error: "Forbidden", message: "Only students and faculty can reserve books" });
  }

  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, bookId)).limit(1);
  if (!book) return res.status(404).json({ error: "NotFound", message: "Book not found" });

  if (book.availableCopies > 0) {
    return res.status(400).json({ error: "Available", message: "Book is available — you can borrow it directly" });
  }

  const existing = await db
    .select()
    .from(reservationsTable)
    .where(and(eq(reservationsTable.userId, userId), eq(reservationsTable.bookId, bookId), eq(reservationsTable.status, "PENDING")))
    .limit(1);
  if (existing.length > 0) {
    return res.status(409).json({ error: "Conflict", message: "You already have a pending reservation for this book" });
  }

  const [{ queueCount }] = await db
    .select({ queueCount: count() })
    .from(reservationsTable)
    .where(and(eq(reservationsTable.bookId, bookId), eq(reservationsTable.status, "PENDING")));

  const queuePosition = Number(queueCount) + 1;

  const [newRes] = await db
    .insert(reservationsTable)
    .values({ userId, bookId, queuePosition })
    .returning();

  const serialized = await serializeReservation(newRes);
  res.status(201).json(serialized);
});

router.delete("/reservations/:id", authenticate as any, async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  const [resRow] = await db.select().from(reservationsTable).where(eq(reservationsTable.id, id)).limit(1);
  if (!resRow) return res.status(404).json({ error: "NotFound", message: "Reservation not found" });

  const isOwner = resRow.userId === req.user!.id;
  const isStaff = ["LIBRARIAN", "ADMIN"].includes(req.user!.role);
  if (!isOwner && !isStaff) return res.status(403).json({ error: "Forbidden" });

  await db
    .update(reservationsTable)
    .set({ status: "CANCELLED", updatedAt: new Date() })
    .where(eq(reservationsTable.id, id));

  res.json({ message: "Reservation cancelled" });
});

export async function fulfillNextReservation(bookId: number) {
  const [next] = await db
    .select()
    .from(reservationsTable)
    .where(and(eq(reservationsTable.bookId, bookId), eq(reservationsTable.status, "PENDING")))
    .orderBy(asc(reservationsTable.queuePosition))
    .limit(1);

  if (!next) return;

  await db
    .update(reservationsTable)
    .set({ status: "FULFILLED", notifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(reservationsTable.id, next.id));

  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, bookId)).limit(1);
  await db.insert(notificationsTable).values({
    userId: next.userId,
    type: "RESERVATION_READY",
    title: "Book Available",
    message: `"${book?.title ?? "A book"}" you reserved is now available. Visit the library to borrow it.`,
    relatedBookId: bookId,
  });
}

export default router;
