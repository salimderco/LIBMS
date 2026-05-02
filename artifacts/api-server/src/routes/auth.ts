import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, comparePassword, signToken } from "../lib/auth.js";
import { authenticate, type AuthRequest } from "../middlewares/authenticate.js";
import crypto from "crypto";

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

router.post("/auth/register", async (req, res) => {
  const { name, email, password, role, department } = req.body;
  if (!name || !email || !password || !role || !department) {
    return res.status(400).json({ error: "Validation", message: "All fields are required" });
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    return res.status(409).json({ error: "Conflict", message: "Email already registered" });
  }
  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(usersTable).values({ name, email, passwordHash, role, department }).returning();
  const token = signToken({ userId: user.id, role: user.role, email: user.email });
  res.status(201).json({ user: serializeUser(user), token });
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Validation", message: "Email and password are required" });
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
  }
  if (!user.isActive) {
    return res.status(401).json({ error: "Unauthorized", message: "Account is deactivated" });
  }
  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
  }
  const token = signToken({ userId: user.id, role: user.role, email: user.email });
  res.json({ user: serializeUser(user), token });
});

router.post("/auth/logout", authenticate as any, async (_req, res) => {
  res.json({ message: "Logged out successfully" });
});

router.get("/auth/me", authenticate as any, async (req: AuthRequest, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
  if (!user) return res.status(404).json({ error: "NotFound", message: "User not found" });
  res.json(serializeUser(user));
});

router.patch("/auth/me", authenticate as any, async (req: AuthRequest, res) => {
  const { name, department, phone } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (department !== undefined) updates.department = department;
  if (phone !== undefined) updates.phone = phone;
  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, req.user!.id)).returning();
  res.json(serializeUser(updated));
});

router.post("/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Validation", message: "Email is required" });
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await db.update(usersTable).set({ resetToken: token, resetTokenExpiresAt: expiresAt }).where(eq(usersTable.id, user.id));
    console.log(`[DEV] Password reset token for ${email}: ${token}`);
  }
  res.json({ message: "If that email exists, a reset link has been sent" });
});

router.post("/auth/reset-password", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: "Validation", message: "Token and password are required" });
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.resetToken, token)).limit(1);
  if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
    return res.status(400).json({ error: "Invalid", message: "Token is invalid or has expired" });
  }
  const passwordHash = await hashPassword(password);
  await db.update(usersTable).set({ passwordHash, resetToken: null, resetTokenExpiresAt: null }).where(eq(usersTable.id, user.id));
  res.json({ message: "Password reset successfully" });
});

export default router;
