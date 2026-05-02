import { Router } from "express";
import { db } from "@workspace/db";
import { loansTable, booksTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../middlewares/authenticate.js";
import { getPolicy } from "./loan-policy.js";

const router = Router();

function computeFineAmount(loan: typeof loansTable.$inferSelect, fineRatePerDay: number): number {
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

function getDaysOverdue(loan: typeof loansTable.$inferSelect): number {
  if (loan.returnedAt) return 0;
  const now = new Date();
  const effectiveStart = loan.finePaidAt && loan.finePaidAt > loan.dueDate
    ? loan.finePaidAt
    : loan.dueDate;
  if (now <= effectiveStart) return 0;
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((now.getTime() - effectiveStart.getTime()) / msPerDay);
}

router.get("/fines/my", authenticate as any, async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const policy = await getPolicy();
  const loans = await db
    .select()
    .from(loansTable)
    .where(and(eq(loansTable.userId, userId), isNull(loansTable.returnedAt)));

  const items = await Promise.all(
    loans.map(async (loan) => {
      const fine = computeFineAmount(loan, policy.fineRatePerDay);
      if (fine <= 0) return null;
      const [book] = await db.select().from(booksTable).where(eq(booksTable.id, loan.bookId)).limit(1);
      return {
        loanId: loan.id,
        bookTitle: book?.title ?? "Unknown Book",
        dueDate: loan.dueDate,
        daysOverdue: getDaysOverdue(loan),
        fineAmount: fine,
      };
    })
  );

  const filtered = items.filter(Boolean) as NonNullable<(typeof items)[0]>[];
  const totalOutstanding = filtered.reduce((sum, item) => sum + item.fineAmount, 0);

  res.json({
    totalOutstanding: Math.round(totalOutstanding * 100) / 100,
    items: filtered,
    hasOutstanding: filtered.length > 0,
    fineRatePerDay: policy.fineRatePerDay,
  });
});

router.post("/fines/pay", authenticate as any, async (req: AuthRequest, res) => {
  const { cardLast4, cardholderName } = req.body;
  if (!cardLast4 || !cardholderName) {
    return res.status(400).json({ error: "Validation", message: "cardLast4 and cardholderName are required" });
  }

  const userId = req.user!.id;
  const policy = await getPolicy();
  const loans = await db
    .select()
    .from(loansTable)
    .where(and(eq(loansTable.userId, userId), isNull(loansTable.returnedAt)));

  let totalCleared = 0;
  let loansCleared = 0;
  const now = new Date();

  for (const loan of loans) {
    const fine = computeFineAmount(loan, policy.fineRatePerDay);
    if (fine > 0) {
      totalCleared += fine;
      loansCleared++;
      await db
        .update(loansTable)
        .set({ finePaidAt: now, updatedAt: now })
        .where(eq(loansTable.id, loan.id));
    }
  }

  res.json({
    amountCleared: Math.round(totalCleared * 100) / 100,
    message: `Payment of $${(Math.round(totalCleared * 100) / 100).toFixed(2)} processed successfully. Fines cleared for ${loansCleared} loan(s).`,
    loansCleared,
  });
});

export default router;
