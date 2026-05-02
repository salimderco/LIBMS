import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const formatEnum = pgEnum("format", ["PHYSICAL", "DIGITAL"]);

export const booksTable = pgTable("books", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  isbn: text("isbn").notNull().unique(),
  publisher: text("publisher").notNull(),
  publicationYear: integer("publication_year").notNull(),
  edition: text("edition"),
  category: text("category").notNull(),
  tags: text("tags").array().notNull().default([]),
  format: formatEnum("format").notNull(),
  totalCopies: integer("total_copies").notNull().default(1),
  availableCopies: integer("available_copies").notNull().default(1),
  shelfLocation: text("shelf_location"),
  description: text("description"),
  coverImage: text("cover_image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBookSchema = createInsertSchema(booksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBook = z.infer<typeof insertBookSchema>;
export type Book = typeof booksTable.$inferSelect;
