import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { booksTable } from "./books";

export const wishlistsTable = pgTable("wishlists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  bookId: integer("book_id").notNull().references(() => booksTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  uniqueUserBook: unique().on(t.userId, t.bookId),
}));

export type Wishlist = typeof wishlistsTable.$inferSelect;
