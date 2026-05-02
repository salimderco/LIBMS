import { pgTable, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { booksTable } from "./books";

export const activityActionEnum = pgEnum("activity_action", [
  "BORROWED",
  "RETURNED",
  "RENEWED",
  "OVERDUE_FLAGGED",
]);

export const activityLogsTable = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  bookId: integer("book_id").notNull().references(() => booksTable.id),
  loanId: integer("loan_id"),
  action: activityActionEnum("action").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ActivityLog = typeof activityLogsTable.$inferSelect;
export type InsertActivityLog = typeof activityLogsTable.$inferInsert;
