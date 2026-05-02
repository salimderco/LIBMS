import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, notificationsTable } from "@workspace/db";
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
  const targetId = parseInt(req.params.userId);

  const [before] = await db.select().from(usersTable).where(eq(usersTable.id, targetId)).limit(1);
  if (!before) return res.status(404).json({ error: "NotFound", message: "User not found" });

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (role !== undefined) updates.role = role;
  if (isActive !== undefined) updates.isActive = isActive;

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, targetId)).returning();
  if (!updated) return res.status(404).json({ error: "NotFound", message: "User not found" });

  if (role !== undefined && role !== before.role) {
    await db.insert(notificationsTable).values({
      userId: targetId,
      type: "ROLE_CHANGED",
      title: "Your role has been updated",
      message: `Your account role has been changed from ${before.role} to ${role} by an administrator.`,
    });
  }

  res.json(serializeUser(updated));
});

export default router;
