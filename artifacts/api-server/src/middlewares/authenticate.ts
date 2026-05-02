import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/auth.js";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    role: string;
    email: string;
    name: string;
  };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized", message: "No token provided" });
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Unauthorized", message: "Invalid or expired token" });
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
  if (!user || !user.isActive) {
    return res.status(401).json({ error: "Unauthorized", message: "Account is deactivated or not found" });
  }
  req.user = { id: user.id, role: user.role, email: user.email, name: user.name };
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden", message: "Insufficient permissions" });
    }
    next();
  };
}
