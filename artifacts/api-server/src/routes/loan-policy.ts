import { Router } from "express";
import { db } from "@workspace/db";
import { loanPolicyTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../middlewares/authenticate.js";

const router = Router();

export async function getPolicy() {
  const [policy] = await db.select().from(loanPolicyTable).limit(1);
  if (policy) return policy;
  const [created] = await db.insert(loanPolicyTable).values({}).returning();
  return created;
}

router.get("/admin/loan-policy", authenticate as any, requireRole("ADMIN") as any, async (_req, res) => {
  const policy = await getPolicy();
  res.json(policy);
});

router.patch("/admin/loan-policy", authenticate as any, requireRole("ADMIN") as any, async (req: AuthRequest, res) => {
  const { studentLoanDays, facultyLoanDays, studentQuota, facultyQuota, maxRenewals, fineRatePerDay } = req.body;
  const policy = await getPolicy();

  const updates: Record<string, unknown> = { updatedAt: new Date(), updatedBy: req.user!.id };
  if (studentLoanDays !== undefined) updates.studentLoanDays = parseInt(studentLoanDays);
  if (facultyLoanDays !== undefined) updates.facultyLoanDays = parseInt(facultyLoanDays);
  if (studentQuota !== undefined) updates.studentQuota = parseInt(studentQuota);
  if (facultyQuota !== undefined) updates.facultyQuota = parseInt(facultyQuota);
  if (maxRenewals !== undefined) updates.maxRenewals = parseInt(maxRenewals);
  if (fineRatePerDay !== undefined) updates.fineRatePerDay = parseFloat(fineRatePerDay);

  const [updated] = await db
    .update(loanPolicyTable)
    .set(updates)
    .where(eq(loanPolicyTable.id, policy.id))
    .returning();

  res.json(updated);
});

export default router;
