import { Router } from "express";
import { db } from "@workspace/db";
import { loansTable, booksTable, usersTable, reviewsTable } from "@workspace/db";
import { eq, and, count, avg, gte, sql, desc } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../middlewares/authenticate.js";
import { computeFineAmount } from "./loans.js";

const router = Router();

function toCSV(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [headers.map(escape).join(","), ...rows.map(r => r.map(escape).join(","))].join("\n");
}

router.get("/reports/summary", authenticate as any, requireRole("LIBRARIAN", "ADMIN") as any, async (_req, res) => {
  const [{ totalBooks }] = await db.select({ totalBooks: count() }).from(booksTable);
  const [{ totalUsers }] = await db.select({ totalUsers: count() }).from(usersTable);

  const allActive = await db.select().from(loansTable).where(eq(loansTable.returnedAt, null as any));
  const now = new Date();
  const activeLoans = allActive.filter(l => l.dueDate >= now).length;
  const overdueLoans = allActive.filter(l => l.dueDate < now).length;

  const totalFines = allActive.reduce((sum, l) => sum + computeFineAmount(l), 0);

  const [{ totalReturned }] = await db
    .select({ totalReturned: count() })
    .from(loansTable)
    .where(sql`${loansTable.returnedAt} IS NOT NULL`);

  const popularRows = await db
    .select({ bookId: loansTable.bookId, borrowCount: count(loansTable.id) })
    .from(loansTable)
    .groupBy(loansTable.bookId)
    .orderBy(sql`count(${loansTable.id}) desc`)
    .limit(5);

  const popularBooks = await Promise.all(popularRows.map(async r => {
    const [book] = await db.select().from(booksTable).where(eq(booksTable.id, r.bookId)).limit(1);
    return { title: book?.title ?? "Unknown", borrowCount: Number(r.borrowCount) };
  }));

  res.json({
    totalBooks: Number(totalBooks),
    totalUsers: Number(totalUsers),
    activeLoans,
    overdueLoans,
    totalReturned: Number(totalReturned),
    totalOutstandingFines: parseFloat(totalFines.toFixed(2)),
    popularBooks,
  });
});

router.get("/reports/loans-csv", authenticate as any, requireRole("LIBRARIAN", "ADMIN") as any, async (_req, res) => {
  const all = await db.select().from(loansTable).orderBy(desc(loansTable.borrowedAt));
  const headers = ["ID", "User Name", "User Email", "Book Title", "ISBN", "Borrowed At", "Due Date", "Returned At", "Renewals", "Status", "Fine ($)"];

  const rows = await Promise.all(all.map(async (l) => {
    const [book] = await db.select().from(booksTable).where(eq(booksTable.id, l.bookId)).limit(1);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, l.userId)).limit(1);
    const status = l.returnedAt ? "RETURNED" : (new Date() > l.dueDate ? "OVERDUE" : "ACTIVE");
    const fine = computeFineAmount(l);
    return [
      String(l.id),
      user?.name ?? "",
      user?.email ?? "",
      book?.title ?? "",
      book?.isbn ?? "",
      l.borrowedAt.toISOString().slice(0, 10),
      l.dueDate.toISOString().slice(0, 10),
      l.returnedAt ? l.returnedAt.toISOString().slice(0, 10) : "",
      String(l.renewalsCount),
      status,
      fine.toFixed(2),
    ];
  }));

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=\"loans-report.csv\"");
  res.send(toCSV(headers, rows));
});

router.get("/reports/overdue-csv", authenticate as any, requireRole("LIBRARIAN", "ADMIN") as any, async (_req, res) => {
  const all = await db.select().from(loansTable).where(eq(loansTable.returnedAt, null as any));
  const now = new Date();
  const overdue = all.filter(l => l.dueDate < now);

  const headers = ["User Name", "User Email", "Book Title", "Due Date", "Days Overdue", "Fine ($)"];
  const rows = await Promise.all(overdue.map(async (l) => {
    const [book] = await db.select().from(booksTable).where(eq(booksTable.id, l.bookId)).limit(1);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, l.userId)).limit(1);
    const daysOverdue = Math.floor((now.getTime() - l.dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const fine = computeFineAmount(l);
    return [
      user?.name ?? "",
      user?.email ?? "",
      book?.title ?? "",
      l.dueDate.toISOString().slice(0, 10),
      String(daysOverdue),
      fine.toFixed(2),
    ];
  }));

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=\"overdue-report.csv\"");
  res.send(toCSV(headers, rows));
});

router.get("/reports/popular-books-csv", authenticate as any, requireRole("LIBRARIAN", "ADMIN") as any, async (_req, res) => {
  const rows = await db
    .select({ bookId: loansTable.bookId, borrowCount: count(loansTable.id), avgRating: avg(reviewsTable.rating) })
    .from(loansTable)
    .leftJoin(reviewsTable, eq(reviewsTable.bookId, loansTable.bookId))
    .groupBy(loansTable.bookId)
    .orderBy(sql`count(${loansTable.id}) desc`);

  const headers = ["Title", "Author", "Category", "Format", "Total Copies", "Available", "Borrow Count", "Avg Rating"];
  const data = await Promise.all(rows.map(async (r) => {
    const [book] = await db.select().from(booksTable).where(eq(booksTable.id, r.bookId)).limit(1);
    return [
      book?.title ?? "",
      book?.author ?? "",
      book?.category ?? "",
      book?.format ?? "",
      String(book?.totalCopies ?? 0),
      String(book?.availableCopies ?? 0),
      String(r.borrowCount),
      r.avgRating ? Number(r.avgRating).toFixed(1) : "N/A",
    ];
  }));

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=\"popular-books-report.csv\"");
  res.send(toCSV(headers, data));
});

export default router;
