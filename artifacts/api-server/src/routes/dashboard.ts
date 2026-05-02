import { Router } from "express";
import { db } from "@workspace/db";
import { loansTable, booksTable, usersTable, activityLogsTable } from "@workspace/db";
import { eq, count, gte, sql, desc } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../middlewares/authenticate.js";

const router = Router();

function computeStatus(loan: typeof loansTable.$inferSelect) {
  if (loan.returnedAt) return "RETURNED";
  if (new Date() > loan.dueDate) return "OVERDUE";
  return "ACTIVE";
}

router.get("/dashboard/summary", authenticate as any, async (req: AuthRequest, res) => {
  const [{ totalBooks }] = await db.select({ totalBooks: count() }).from(booksTable);
  const [{ totalUsers }] = await db.select({ totalUsers: count() }).from(usersTable);

  const allActiveLoans = await db.select().from(loansTable).where(eq(loansTable.returnedAt, null as any));
  const now = new Date();
  const activeLoans = allActiveLoans.filter(l => l.dueDate >= now).length;
  const overdueLoans = allActiveLoans.filter(l => l.dueDate < now).length;

  const [{ availableBooks }] = await db.select({ availableBooks: count() }).from(booksTable).where(gte(booksTable.availableCopies, 1));

  const result: Record<string, unknown> = {
    totalBooks: Number(totalBooks),
    totalUsers: Number(totalUsers),
    activeLoans,
    overdueLoans,
    availableBooks: Number(availableBooks),
  };

  const role = req.user!.role;
  if (role === "STUDENT" || role === "FACULTY") {
    const myLoans = await db.select().from(loansTable).where(eq(loansTable.userId, req.user!.id));
    const myActive = myLoans.filter(l => !l.returnedAt);
    result.myActiveLoans = myActive.filter(l => l.dueDate >= now).length;
    result.myOverdueLoans = myActive.filter(l => l.dueDate < now).length;
  }

  res.json(result);
});

router.get("/dashboard/overdue", authenticate as any, requireRole("LIBRARIAN", "ADMIN") as any, async (_req, res) => {
  const all = await db.select().from(loansTable).where(eq(loansTable.returnedAt, null as any));
  const now = new Date();
  const overdue = all.filter(l => l.dueDate < now);

  const serialized = await Promise.all(overdue.map(async (loan) => {
    const [book] = await db.select().from(booksTable).where(eq(booksTable.id, loan.bookId)).limit(1);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, loan.userId)).limit(1);
    return {
      id: loan.id, userId: loan.userId, bookId: loan.bookId,
      book: book ? {
        id: book.id, title: book.title, author: book.author, isbn: book.isbn, publisher: book.publisher,
        publicationYear: book.publicationYear, edition: book.edition, category: book.category, tags: book.tags ?? [],
        format: book.format, totalCopies: book.totalCopies, availableCopies: book.availableCopies,
        shelfLocation: book.shelfLocation, description: book.description, coverImage: book.coverImage, createdAt: book.createdAt,
      } : undefined,
      user: user ? {
        id: user.id, name: user.name, email: user.email, role: user.role, department: user.department,
        phone: user.phone, isActive: user.isActive, createdAt: user.createdAt,
      } : undefined,
      borrowedAt: loan.borrowedAt, dueDate: loan.dueDate, returnedAt: loan.returnedAt,
      renewalsCount: loan.renewalsCount, status: "OVERDUE" as const,
    };
  }));

  res.json({ count: serialized.length, loans: serialized });
});

router.get("/dashboard/popular-books", authenticate as any, async (req, res) => {
  const limit = Math.min(20, parseInt(req.query.limit as string) || 5);
  const rows = await db
    .select({ bookId: loansTable.bookId, borrowCount: count(loansTable.id) })
    .from(loansTable)
    .groupBy(loansTable.bookId)
    .orderBy(sql`count(${loansTable.id}) desc`)
    .limit(limit);

  const data = await Promise.all(rows.map(async (row) => {
    const [book] = await db.select().from(booksTable).where(eq(booksTable.id, row.bookId)).limit(1);
    return {
      book: book ? {
        id: book.id, title: book.title, author: book.author, isbn: book.isbn, publisher: book.publisher,
        publicationYear: book.publicationYear, edition: book.edition, category: book.category, tags: book.tags ?? [],
        format: book.format, totalCopies: book.totalCopies, availableCopies: book.availableCopies,
        shelfLocation: book.shelfLocation, description: book.description, coverImage: book.coverImage, createdAt: book.createdAt,
      } : undefined,
      borrowCount: Number(row.borrowCount),
    };
  }));

  res.json({ data });
});

router.get("/dashboard/recent-activity", authenticate as any, requireRole("LIBRARIAN", "ADMIN") as any, async (req, res) => {
  const limit = Math.min(50, parseInt(req.query.limit as string) || 10);

  const logs = await db
    .select()
    .from(activityLogsTable)
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(limit);

  const data = await Promise.all(logs.map(async (log) => {
    const [book] = await db.select().from(booksTable).where(eq(booksTable.id, log.bookId)).limit(1);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, log.userId)).limit(1);

    let loanSerialized = null;
    if (log.loanId) {
      const [loan] = await db.select().from(loansTable).where(eq(loansTable.id, log.loanId)).limit(1);
      if (loan) {
        const status = loan.returnedAt ? "RETURNED" : (new Date() > loan.dueDate ? "OVERDUE" : "ACTIVE");
        loanSerialized = {
          id: loan.id, userId: loan.userId, bookId: loan.bookId,
          book: book ? {
            id: book.id, title: book.title, author: book.author, isbn: book.isbn, publisher: book.publisher,
            publicationYear: book.publicationYear, edition: book.edition, category: book.category, tags: book.tags ?? [],
            format: book.format, totalCopies: book.totalCopies, availableCopies: book.availableCopies,
            shelfLocation: book.shelfLocation, description: book.description, coverImage: book.coverImage, createdAt: book.createdAt,
          } : undefined,
          user: user ? {
            id: user.id, name: user.name, email: user.email, role: user.role, department: user.department,
            phone: user.phone, isActive: user.isActive, createdAt: user.createdAt,
          } : undefined,
          borrowedAt: loan.borrowedAt, dueDate: loan.dueDate, returnedAt: loan.returnedAt,
          renewalsCount: loan.renewalsCount, status,
        };
      }
    }

    if (!loanSerialized) {
      loanSerialized = {
        id: 0, userId: log.userId, bookId: log.bookId,
        book: book ? {
          id: book.id, title: book.title, author: book.author, isbn: book.isbn, publisher: book.publisher,
          publicationYear: book.publicationYear, edition: book.edition, category: book.category, tags: book.tags ?? [],
          format: book.format, totalCopies: book.totalCopies, availableCopies: book.availableCopies,
          shelfLocation: book.shelfLocation, description: book.description, coverImage: book.coverImage, createdAt: book.createdAt,
        } : undefined,
        user: user ? {
          id: user.id, name: user.name, email: user.email, role: user.role, department: user.department,
          phone: user.phone, isActive: user.isActive, createdAt: user.createdAt,
        } : undefined,
        borrowedAt: log.createdAt, dueDate: log.createdAt, returnedAt: null,
        renewalsCount: 0, status: "ACTIVE" as const,
      };
    }

    return {
      loan: loanSerialized,
      action: log.action as "BORROWED" | "RETURNED" | "RENEWED" | "OVERDUE",
      timestamp: log.createdAt,
    };
  }));

  res.json({ data });
});

router.get("/dashboard/trends", authenticate as any, requireRole("LIBRARIAN", "ADMIN") as any, async (req, res) => {
  const days = Math.min(90, Math.max(7, parseInt(req.query.days as string) || 14));
  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  since.setHours(0, 0, 0, 0);

  const logs = await db
    .select()
    .from(activityLogsTable)
    .where(gte(activityLogsTable.createdAt, since))
    .orderBy(activityLogsTable.createdAt);

  const byDate: Record<string, { date: string; borrowed: number; returned: number; renewed: number }> = {};

  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    byDate[key] = { date: key, borrowed: 0, returned: 0, renewed: 0 };
  }

  for (const log of logs) {
    const key = log.createdAt.toISOString().slice(0, 10);
    if (!byDate[key]) continue;
    if (log.action === "BORROWED") byDate[key].borrowed++;
    else if (log.action === "RETURNED") byDate[key].returned++;
    else if (log.action === "RENEWED") byDate[key].renewed++;
  }

  res.json({ data: Object.values(byDate), days });
});

export default router;
