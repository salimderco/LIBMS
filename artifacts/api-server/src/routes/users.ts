import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, like, or, count } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../middlewares/authenticate.js";

const router = Router();

function serializeUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    phone: user.phone,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

router.get("/users", authenticate as any, requireRole("ADMIN") as any, async (req: AuthRequest, res) => {
  const q = req.query.q as string | undefined;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
  const offset = (page - 1) * pageSize;

  const where = q ? or(like(usersTable.name, `%${q}%`), like(usersTable.email, `%${q}%`)) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(usersTable).where(where);
  const data = await db.select().from(usersTable).where(where).limit(pageSize).offset(offset).orderBy(usersTable.name);

  res.json({
    data: data.map(serializeUser),
    page,
    pageSize,
    totalRecords: Number(total),
    totalPages: Math.ceil(Number(total) / pageSize),
  });
});

router.get("/users/:userId", authenticate as any, requireRole("ADMIN") as any, async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parseInt(req.params.userId))).limit(1);
  if (!user) return res.status(404).json({ error: "NotFound", message: "User not found" });
  res.json(serializeUser(user));
});

router.patch("/users/:userId", authenticate as any, requireRole("ADMIN") as any, async (req, res) => {
  const { role, isActive } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (role !== undefined) updates.role = role;
  if (isActive !== undefined) updates.isActive = isActive;
  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, parseInt(req.params.userId))).returning();
  if (!updated) return res.status(404).json({ error: "NotFound", message: "User not found" });
  res.json(serializeUser(updated));
});

export default router;
