import { Router } from "express";
import { db } from "@workspace/db";
import { loansTable, booksTable, usersTable, activityLogsTable, notificationsTable } from "@workspace/db";
import { eq, and, count, sql } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../middlewares/authenticate.js";
import { getPolicy } from "./loan-policy.js";
import { fulfillNextReservation } from "./reservations.js";

const router = Router();

function computeStatus(loan: typeof loansTable.$inferSelect): "ACTIVE" | "RETURNED" | "OVERDUE" {
  if (loan.returnedAt) return "RETURNED";
  if (new Date() > loan.dueDate) return "OVERDUE";
  return "ACTIVE";
}

export function computeFineAmount(loan: typeof loansTable.$inferSelect, fineRatePerDay = 0.50): number {
  if (loan.returnedAt) return 0;
  const now = new Date();
  const effectiveStart = loan.finePaidAt && loan.finePaidAt > loan.dueDate
    ? loan.finePaidAt
    : loan.dueDate;
  if (now <= effectiveStart) return 0;
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysOverdue = Math.floor((now.getTime() - effectiveStart.getTime()) / msPerDay);
  return Math.max(0, daysOverdue * fineRatePerDay);
}

async function serializeLoan(loan: typeof loansTable.$inferSelect) {
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, loan.bookId)).limit(1);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, loan.userId)).limit(1);
  const policy = await getPolicy();
  const status = computeStatus(loan);
  const fineAccrued = computeFineAmount(loan, policy.fineRatePerDay);
  return {
    id: loan.id,
    userId: loan.userId,
    bookId: loan.bookId,
    book: book ? {
      id: book.id, title: book.title, author: book.author, isbn: book.isbn, publisher: book.publisher,
      publicationYear: book.publicationYear, edition: book.edition, category: book.category,
      tags: book.tags ?? [], format: book.format, totalCopies: book.totalCopies, availableCopies: book.availableCopies,
      shelfLocation: book.shelfLocation, description: book.description, coverImage: book.coverImage, createdAt: book.createdAt,
    } : undefined,
    user: user ? {
      id: user.id, name: user.name, email: user.email, role: user.role, department: user.department,
      phone: user.phone, isActive: user.isActive, createdAt: user.createdAt,
    } : undefined,
    borrowedAt: loan.borrowedAt,
    dueDate: loan.dueDate,
    returnedAt: loan.returnedAt,
    renewalsCount: loan.renewalsCount,
    status,
    fineAccrued,
    finePaidAt: loan.finePaidAt ?? null,
  };
}

async function ensureDueSoonNotifications(userId: number, loans: (typeof loansTable.$inferSelect)[]) {
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  for (const loan of loans) {
    if (loan.returnedAt) continue;
    const dueDate = new Date(loan.dueDate);
    if (dueDate > now && dueDate <= in48h) {
      const existing = await db
        .select()
        .from(notificationsTable)
        .where(
          and(
            eq(notificationsTable.userId, userId),
            eq(notificationsTable.type, "DUE_SOON"),
            eq(notificationsTable.relatedLoanId as any, loan.id)
          )
        )
        .limit(1);
      if (existing.length === 0) {
        const [book] = await db.select().from(booksTable).where(eq(booksTable.id, loan.bookId)).limit(1);
        const hoursLeft = Math.round((dueDate.getTime() - now.getTime()) / (60 * 60 * 1000));
        await db.insert(notificationsTable).values({
          userId,
          type: "DUE_SOON",
          title: "Book Due Soon",
          message: `"${book?.title ?? "A book"}" is due in ${hoursLeft} hour${hoursLeft !== 1 ? "s" : ""}. Return or renew before it's overdue.`,
          relatedLoanId: loan.id,
        });
      }
    }
    if (dueDate < now) {
      const policy = await getPolicy();
      const fine = computeFineAmount(loan, policy.fineRatePerDay);
      if (fine > 0) {
        const existing = await db
          .select()
          .from(notificationsTable)
          .where(
            and(
              eq(notificationsTable.userId, userId),
              eq(notificationsTable.type, "OVERDUE_FINE"),
              eq(notificationsTable.relatedLoanId as any, loan.id)
            )
          )
          .limit(1);
        if (existing.length === 0) {
          const [book] = await db.select().from(booksTable).where(eq(booksTable.id, loan.bookId)).limit(1);
          await db.insert(notificationsTable).values({
            userId,
            type: "OVERDUE_FINE",
            title: "Overdue Fine Accruing",
            message: `"${book?.title ?? "A book"}" is overdue. A fine of $${fine.toFixed(2)} has accrued at $${policy.fineRatePerDay.toFixed(2)}/day.`,
            relatedLoanId: loan.id,
          });
        }
      }
    }
  }
}

router.get("/loans/my", authenticate as any, async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const allLoans = await db.select().from(loansTable).where(eq(loansTable.userId, userId)).orderBy(loansTable.borrowedAt);
  await ensureDueSoonNotifications(userId, allLoans);
  const serialized = await Promise.all(allLoans.map(serializeLoan));
  const active = serialized.filter(l => l.status === "ACTIVE" || l.status === "OVERDUE");
  const history = serialized.filter(l => l.status === "RETURNED");
  res.json({ active, history });
});

router.get("/loans", authenticate as any, requireRole("LIBRARIAN", "ADMIN") as any, async (req: AuthRequest, res) => {
  const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
  const bookId = req.query.bookId ? parseInt(req.query.bookId as string) : undefined;
  const statusFilter = req.query.status as string | undefined;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
  const offset = (page - 1) * pageSize;

  let allLoans = await db.select().from(loansTable).orderBy(loansTable.borrowedAt);
  let filtered = allLoans.map(l => ({ ...l, computedStatus: computeStatus(l) }));
  if (userId) filtered = filtered.filter(l => l.userId === userId);
  if (bookId) filtered = filtered.filter(l => l.bookId === bookId);
  if (statusFilter) filtered = filtered.filter(l => l.computedStatus === statusFilter);

  const total = filtered.length;
  const page_data = filtered.slice(offset, offset + pageSize);
  const serialized = await Promise.all(page_data.map(l => serializeLoan(l)));

  res.json({
    data: serialized,
    page,
    pageSize,
    totalRecords: total,
    totalPages: Math.ceil(total / pageSize),
  });
});

router.post("/loans/borrow", authenticate as any, async (req: AuthRequest, res) => {
  const { bookId } = req.body;
  if (!bookId) return res.status(400).json({ error: "Validation", message: "bookId is required" });

  const userId = req.user!.id;
  const role = req.user!.role;

  if (!["STUDENT", "FACULTY"].includes(role)) {
    return res.status(403).json({ error: "Forbidden", message: "Only students and faculty can borrow books" });
  }

  const policy = await getPolicy();

  const getQuota = (r: string) => r === "FACULTY" ? policy.facultyQuota : policy.studentQuota;
  const getLoanDays = (r: string) => r === "FACULTY" ? policy.facultyLoanDays : policy.studentLoanDays;

  try {
    const loan = await db.transaction(async (tx) => {
      const [book] = await tx.select().from(booksTable).where(eq(booksTable.id, bookId)).limit(1);
      if (!book) throw Object.assign(new Error("Book not found"), { status: 404 });

      if (book.availableCopies < 1)
        throw Object.assign(new Error("No copies available"), { status: 400 });

      const [{ activeCount }] = await tx
        .select({ activeCount: count() })
        .from(loansTable)
        .where(and(eq(loansTable.userId, userId), eq(loansTable.status, "ACTIVE")));

      if (Number(activeCount) >= getQuota(role))
        throw Object.assign(new Error(`Quota reached (max ${getQuota(role)} active loans)`), { status: 400 });

      const duplicate = await tx
        .select()
        .from(loansTable)
        .where(and(eq(loansTable.userId, userId), eq(loansTable.bookId, bookId), eq(loansTable.status, "ACTIVE")))
        .limit(1);
      if (duplicate.length > 0)
        throw Object.assign(new Error("You already have this book on loan"), { status: 400 });

      const newAvailable = book.availableCopies - 1;
      if (newAvailable < 0)
        throw Object.assign(new Error("Concurrent borrow conflict — no copies available"), { status: 409 });

      await tx
        .update(booksTable)
        .set({ availableCopies: newAvailable, updatedAt: new Date() })
        .where(eq(booksTable.id, bookId));

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + getLoanDays(role));

      const [newLoan] = await tx
        .insert(loansTable)
        .values({ userId, bookId, dueDate, status: "ACTIVE" })
        .returning();

      await tx.insert(activityLogsTable).values({
        userId,
        bookId,
        loanId: newLoan.id,
        action: "BORROWED",
      });

      return newLoan;
    });

    const serialized = await serializeLoan(loan);
    res.status(201).json(serialized);
  } catch (err: any) {
    const status = err.status ?? 500;
    res.status(status).json({ error: "BorrowError", message: err.message });
  }
});

router.post("/loans/:loanId/return", authenticate as any, requireRole("LIBRARIAN", "ADMIN") as any, async (req: AuthRequest, res) => {
  const loanId = parseInt(req.params.loanId);
  const [loan] = await db.select().from(loansTable).where(eq(loansTable.id, loanId)).limit(1);
  if (!loan) return res.status(404).json({ error: "NotFound", message: "Loan not found" });
  if (loan.returnedAt) return res.status(400).json({ error: "AlreadyReturned", message: "Loan already returned" });

  await db.transaction(async (tx) => {
    const now = new Date();
    await tx
      .update(loansTable)
      .set({ returnedAt: now, status: "RETURNED", updatedAt: now })
      .where(eq(loansTable.id, loanId));

    await tx
      .update(booksTable)
      .set({
        availableCopies: sql`LEAST(${booksTable.availableCopies} + 1, ${booksTable.totalCopies})`,
        updatedAt: now,
      })
      .where(eq(booksTable.id, loan.bookId));

    await tx.insert(activityLogsTable).values({
      userId: loan.userId,
      bookId: loan.bookId,
      loanId: loan.id,
      action: "RETURNED",
    });
  });

  await fulfillNextReservation(loan.bookId);

  const [updated] = await db.select().from(loansTable).where(eq(loansTable.id, loanId)).limit(1);
  const serialized = await serializeLoan(updated);
  res.json(serialized);
});

router.post("/loans/:loanId/renew", authenticate as any, async (req: AuthRequest, res) => {
  const loanId = parseInt(req.params.loanId);
  const [loan] = await db.select().from(loansTable).where(eq(loansTable.id, loanId)).limit(1);
  if (!loan) return res.status(404).json({ error: "NotFound", message: "Loan not found" });
  if (loan.userId !== req.user!.id) return res.status(403).json({ error: "Forbidden", message: "Cannot renew another user's loan" });
  if (loan.returnedAt) return res.status(400).json({ error: "Invalid", message: "Cannot renew a returned loan" });

  const policy = await getPolicy();
  if (loan.renewalsCount >= policy.maxRenewals) {
    return res.status(400).json({ error: "MaxRenewals", message: `Maximum ${policy.maxRenewals} renewals reached` });
  }

  const role = req.user!.role;
  const loanDays = role === "FACULTY" ? policy.facultyLoanDays : policy.studentLoanDays;
  const newDue = new Date(loan.dueDate);
  newDue.setDate(newDue.getDate() + loanDays);

  const [updated] = await db
    .update(loansTable)
    .set({ dueDate: newDue, renewalsCount: loan.renewalsCount + 1, updatedAt: new Date() })
    .where(eq(loansTable.id, loanId))
    .returning();

  await db.insert(activityLogsTable).values({
    userId: loan.userId,
    bookId: loan.bookId,
    loanId: loan.id,
    action: "RENEWED",
  });

  const serialized = await serializeLoan(updated);
  res.json(serialized);
});

export default router;
