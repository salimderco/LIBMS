import { Router } from "express";
import { db } from "@workspace/db";
import { announcementsTable, usersTable, notificationsTable } from "@workspace/db";
import { eq, gte, or, isNull, desc } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../middlewares/authenticate.js";

const router = Router();

async function serializeAnnouncement(a: typeof announcementsTable.$inferSelect) {
  const [creator] = await db.select().from(usersTable).where(eq(usersTable.id, a.createdBy)).limit(1);
  return {
    id: a.id,
    title: a.title,
    content: a.content,
    isPinned: a.isPinned,
    expiresAt: a.expiresAt,
    createdAt: a.createdAt,
    createdBy: creator ? { id: creator.id, name: creator.name } : undefined,
  };
}

router.get("/announcements", authenticate as any, async (_req, res) => {
  const now = new Date();
  const rows = await db
    .select()
    .from(announcementsTable)
    .where(or(isNull(announcementsTable.expiresAt), gte(announcementsTable.expiresAt, now)))
    .orderBy(desc(announcementsTable.isPinned), desc(announcementsTable.createdAt));

  const data = await Promise.all(rows.map(serializeAnnouncement));
  res.json({ data });
});

router.post("/announcements", authenticate as any, requireRole("LIBRARIAN", "ADMIN") as any, async (req: AuthRequest, res) => {
  const { title, content, isPinned, expiresAt } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "Validation", message: "title and content are required" });
  }

  const [ann] = await db
    .insert(announcementsTable)
    .values({
      title,
      content,
      createdBy: req.user!.id,
      isPinned: isPinned ?? false,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    })
    .returning();

  const allUsers = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.isActive, true));
  for (const u of allUsers) {
    await db.insert(notificationsTable).values({
      userId: u.id,
      type: "ANNOUNCEMENT",
      title: `📢 ${title}`,
      message: content.slice(0, 200),
    });
  }

  const serialized = await serializeAnnouncement(ann);
  res.status(201).json(serialized);
});

router.patch("/announcements/:id", authenticate as any, requireRole("LIBRARIAN", "ADMIN") as any, async (req, res) => {
  const id = parseInt(req.params.id);
  const { title, content, isPinned, expiresAt } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (title !== undefined) updates.title = title;
  if (content !== undefined) updates.content = content;
  if (isPinned !== undefined) updates.isPinned = isPinned;
  if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;

  const [updated] = await db.update(announcementsTable).set(updates).where(eq(announcementsTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "NotFound" });

  const serialized = await serializeAnnouncement(updated);
  res.json(serialized);
});

router.delete("/announcements/:id", authenticate as any, requireRole("LIBRARIAN", "ADMIN") as any, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(announcementsTable).where(eq(announcementsTable.id, id));
  res.json({ message: "Announcement deleted" });
});

export default router;
