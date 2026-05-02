import { Router } from "express";
import { db } from "@workspace/db";
import { booksTable, loansTable } from "@workspace/db";
import { eq, like, or, and, gte, lte, sql, count, inArray } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../middlewares/authenticate.js";

const router = Router();

function buildBookWhere(q?: string, category?: string, format?: string, available?: string, yearFrom?: number, yearTo?: number) {
  const conditions = [];
  if (q) {
    conditions.push(
      or(
        like(booksTable.title, `%${q}%`),
        like(booksTable.author, `%${q}%`),
        like(booksTable.isbn, `%${q}%`)
      )
    );
  }
  if (category) conditions.push(eq(booksTable.category, category));
  if (format) conditions.push(eq(booksTable.format, format as "PHYSICAL" | "DIGITAL"));
  if (available === "true") conditions.push(gte(booksTable.availableCopies, 1));
  if (yearFrom) conditions.push(gte(booksTable.publicationYear, yearFrom));
  if (yearTo) conditions.push(lte(booksTable.publicationYear, yearTo));
  return conditions.length > 0 ? and(...conditions) : undefined;
}

router.get("/books", authenticate as any, async (req: AuthRequest, res) => {
  const { q, category, format, available, yearFrom, yearTo } = req.query as Record<string, string>;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
  const offset = (page - 1) * pageSize;

  const where = buildBookWhere(q, category, format, available, yearFrom ? parseInt(yearFrom) : undefined, yearTo ? parseInt(yearTo) : undefined);

  const [{ total }] = await db.select({ total: count() }).from(booksTable).where(where);
  const data = await db.select().from(booksTable).where(where).limit(pageSize).offset(offset).orderBy(booksTable.title);

  res.json({
    data: data.map(serializeBook),
    page,
    pageSize,
    totalRecords: Number(total),
    totalPages: Math.ceil(Number(total) / pageSize),
  });
});

router.get("/books/categories", authenticate as any, async (_req, res) => {
  const rows = await db.selectDistinct({ category: booksTable.category }).from(booksTable).orderBy(booksTable.category);
  res.json({ categories: rows.map(r => r.category) });
});

router.post("/books", authenticate as any, requireRole("LIBRARIAN", "ADMIN") as any, async (req: AuthRequest, res) => {
  const { title, author, isbn, publisher, publicationYear, edition, category, tags, format, totalCopies, shelfLocation, description, coverImage } = req.body;
  if (!title || !author || !isbn || !publisher || !publicationYear || !category || !format || !totalCopies) {
    return res.status(400).json({ error: "Validation", message: "Required fields missing" });
  }
  const copies = parseInt(totalCopies);
  const [book] = await db.insert(booksTable).values({
    title, author, isbn, publisher, publicationYear: parseInt(publicationYear), edition, category,
    tags: tags ?? [], format, totalCopies: copies, availableCopies: copies,
    shelfLocation, description, coverImage,
  }).returning();
  res.status(201).json(serializeBook(book));
});

router.post("/books/import", authenticate as any, requireRole("LIBRARIAN", "ADMIN") as any, async (req: AuthRequest, res) => {
  const { books } = req.body;
  if (!Array.isArray(books) || books.length === 0) {
    return res.status(400).json({ error: "Validation", message: "books array is required" });
  }

  const errors: { row: number; field: string; reason: string }[] = [];

  books.forEach((b: Record<string, unknown>, i: number) => {
    const row = i + 1;
    if (!b.title) errors.push({ row, field: "title", reason: "required" });
    if (!b.author) errors.push({ row, field: "author", reason: "required" });
    if (!b.isbn) errors.push({ row, field: "isbn", reason: "required" });
    if (!b.publisher) errors.push({ row, field: "publisher", reason: "required" });
    if (!b.publicationYear) errors.push({ row, field: "publicationYear", reason: "required" });
    if (!b.category) errors.push({ row, field: "category", reason: "required" });
    if (!b.format || !["PHYSICAL", "DIGITAL"].includes(b.format as string))
      errors.push({ row, field: "format", reason: "must be PHYSICAL or DIGITAL" });
    if (!b.totalCopies || Number(b.totalCopies) < 1)
      errors.push({ row, field: "totalCopies", reason: "must be >= 1" });
  });

  const isbnMap: Record<string, number[]> = {};
  books.forEach((b: Record<string, unknown>, i: number) => {
    if (b.isbn) {
      const isbn = String(b.isbn);
      if (!isbnMap[isbn]) isbnMap[isbn] = [];
      isbnMap[isbn].push(i + 1);
    }
  });
  for (const [isbn, rows] of Object.entries(isbnMap)) {
    if (rows.length > 1) {
      rows.forEach(row => errors.push({ row, field: "isbn", reason: `Duplicate ISBN "${isbn}" appears on rows ${rows.join(", ")}` }));
    }
  }

  const incomingIsbns = books.map((b: Record<string, unknown>) => String(b.isbn)).filter(Boolean);
  if (incomingIsbns.length > 0) {
    const existing = await db
      .select({ isbn: booksTable.isbn })
      .from(booksTable)
      .where(inArray(booksTable.isbn, incomingIsbns));
    const existingSet = new Set(existing.map(r => r.isbn));
    books.forEach((b: Record<string, unknown>, i: number) => {
      if (b.isbn && existingSet.has(String(b.isbn))) {
        errors.push({ row: i + 1, field: "isbn", reason: `ISBN "${b.isbn}" already exists in the database` });
      }
    });
  }

  if (errors.length > 0) {
    return res.status(422).json({ errors, message: "Validation failed — no records were imported" });
  }

  await db.transaction(async (tx) => {
    for (const b of books) {
      const copies = parseInt(String(b.totalCopies));
      await tx.insert(booksTable).values({
        title: b.title as string,
        author: b.author as string,
        isbn: b.isbn as string,
        publisher: (b.publisher as string) || "",
        publicationYear: parseInt(String(b.publicationYear)) || 0,
        edition: b.edition as string | undefined,
        category: b.category as string,
        tags: (b.tags as string[]) ?? [],
        format: b.format as "PHYSICAL" | "DIGITAL",
        totalCopies: copies,
        availableCopies: copies,
        shelfLocation: b.shelfLocation as string | undefined,
        description: b.description as string | undefined,
        coverImage: b.coverImage as string | undefined,
      });
    }
  });

  res.status(201).json({ imported: books.length, message: `Successfully imported ${books.length} books` });
});

router.get("/books/:bookId", authenticate as any, async (req, res) => {
  const bookId = parseInt(req.params.bookId);
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, bookId)).limit(1);
  if (!book) return res.status(404).json({ error: "NotFound", message: "Book not found" });
  res.json(serializeBook(book));
});

router.patch("/books/:bookId", authenticate as any, requireRole("LIBRARIAN", "ADMIN") as any, async (req, res) => {
  const bookId = parseInt(req.params.bookId);
  const { availableCopies: _ignored, ...rest } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const allowed = ["title", "author", "isbn", "publisher", "publicationYear", "edition", "category", "tags", "format", "totalCopies", "shelfLocation", "description", "coverImage"];
  for (const key of allowed) {
    if (rest[key] !== undefined) updates[key] = rest[key];
  }
  const [book] = await db.update(booksTable).set(updates).where(eq(booksTable.id, bookId)).returning();
  if (!book) return res.status(404).json({ error: "NotFound", message: "Book not found" });
  res.json(serializeBook(book));
});

router.delete("/books/:bookId", authenticate as any, requireRole("LIBRARIAN", "ADMIN") as any, async (req, res) => {
  const bookId = parseInt(req.params.bookId);
  const [{ activeCount }] = await db.select({ activeCount: count() }).from(loansTable)
    .where(and(eq(loansTable.bookId, bookId), eq(loansTable.status, "ACTIVE")));
  if (Number(activeCount) > 0) {
    return res.status(409).json({ error: "Conflict", message: "Cannot delete book with active loans" });
  }
  await db.delete(booksTable).where(eq(booksTable.id, bookId));
  res.json({ message: "Book deleted successfully" });
});

function serializeBook(book: typeof booksTable.$inferSelect) {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    publisher: book.publisher,
    publicationYear: book.publicationYear,
    edition: book.edition,
    category: book.category,
    tags: book.tags ?? [],
    format: book.format,
    totalCopies: book.totalCopies,
    availableCopies: book.availableCopies,
    shelfLocation: book.shelfLocation,
    description: book.description,
    coverImage: book.coverImage,
    createdAt: book.createdAt,
  };
}

export default router;
