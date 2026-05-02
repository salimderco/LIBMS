import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../middlewares/authenticate.js";

const router = Router();

router.get("/notifications", authenticate as any, async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const unreadOnly = req.query.unreadOnly === "true";

  const where = unreadOnly
    ? and(eq(notificationsTable.userId, userId), eq(notificationsTable.read, false))
    : eq(notificationsTable.userId, userId);

  const data = await db
    .select()
    .from(notificationsTable)
    .where(where)
    .orderBy(notificationsTable.createdAt);

  const [{ unreadCount }] = await db
    .select({ unreadCount: count() })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.read, false)));

  res.json({
    data: data.map(n => ({
      id: n.id,
      userId: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      relatedLoanId: n.relatedLoanId ?? null,
      createdAt: n.createdAt,
    })).reverse(),
    unreadCount: Number(unreadCount),
  });
});

router.post("/notifications/read-all", authenticate as any, async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(eq(notificationsTable.userId, userId));
  res.json({ message: "All notifications marked as read" });
});

router.post("/notifications/:notificationId/read", authenticate as any, async (req: AuthRequest, res) => {
  const notificationId = parseInt(req.params.notificationId);
  const userId = req.user!.id;

  const [updated] = await db
    .update(notificationsTable)
    .set({ read: true })
    .where(and(eq(notificationsTable.id, notificationId), eq(notificationsTable.userId, userId)))
    .returning();

  if (!updated) return res.status(404).json({ error: "NotFound", message: "Notification not found" });

  res.json({
    id: updated.id,
    userId: updated.userId,
    type: updated.type,
    title: updated.title,
    message: updated.message,
    read: updated.read,
    relatedLoanId: updated.relatedLoanId ?? null,
    createdAt: updated.createdAt,
  });
});

export default router;
