import { pgTable, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { booksTable } from "./books";

export const reservationStatusEnum = pgEnum("reservation_status", [
  "PENDING",
  "FULFILLED",
  "CANCELLED",
  "EXPIRED",
]);

export const reservationsTable = pgTable("reservations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  bookId: integer("book_id").notNull().references(() => booksTable.id),
  status: reservationStatusEnum("status").notNull().default("PENDING"),
  queuePosition: integer("queue_position").notNull().default(1),
  notifiedAt: timestamp("notified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Reservation = typeof reservationsTable.$inferSelect;
export type InsertReservation = typeof reservationsTable.$inferInsert;
