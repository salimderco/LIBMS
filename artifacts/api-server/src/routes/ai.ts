import { Router } from "express";
import { db } from "@workspace/db";
import { loansTable, booksTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../middlewares/authenticate.js";

const router = Router();

const GEMINI_BASE_URL = process.env["AI_INTEGRATIONS_GEMINI_BASE_URL"];
const GEMINI_API_KEY = process.env["AI_INTEGRATIONS_GEMINI_API_KEY"];
const GEMINI_MODEL = "gemini-2.5-flash";

async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_BASE_URL || !GEMINI_API_KEY) {
    throw new Error("AI_INTEGRATIONS_GEMINI env vars not set");
  }
  const url = `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 2048, responseMimeType: "application/json" },
  };
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gemini API error ${resp.status}: ${errText}`);
  }
  const data = await resp.json() as any;
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
}

router.post("/ai/enrich-book", authenticate as any, async (req: AuthRequest, res) => {
  const { title, author } = req.body;
  if (!title || !author) {
    return res.status(400).json({ error: "Validation", message: "title and author are required" });
  }

  const fallback = () => res.json({
    description: `${title} by ${author} is an essential academic resource covering key concepts in its field.`,
    tags: ["academic", "textbook", "reference"],
    isbn: "978-0-0000-0000-0",
    publisher: "Academic Press",
    publicationYear: new Date().getFullYear(),
    category: "Other",
    _fallback: true,
  });

  try {
    const prompt = `You are a librarian data entry assistant. Given a book title and author, return ONLY valid JSON (no markdown, no code fences) with these exact fields:
{
  "description": "professional 2-3 sentence description",
  "tags": ["tag1", "tag2", "tag3"],
  "isbn": "978-X-XXXX-XXXX-X",
  "publisher": "publisher name",
  "publicationYear": 2023,
  "category": "one of: Computer Science, Mathematics, Physics, Chemistry, Biology, Engineering, Literature, History, Philosophy, Economics, Medicine, Law, Psychology, Art, Other"
}

Title: "${title}"
Author: "${author}"`;

    const raw = await callGemini(prompt);
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    res.json({
      description: String(parsed.description ?? ""),
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
      isbn: String(parsed.isbn ?? ""),
      publisher: String(parsed.publisher ?? ""),
      publicationYear: Number(parsed.publicationYear ?? new Date().getFullYear()),
      category: String(parsed.category ?? "Other"),
    });
  } catch {
    fallback();
  }
});

router.get("/ai/suggestions", authenticate as any, async (req: AuthRequest, res) => {
  const userId = req.user!.id;

  try {
    const myLoans = await db.select().from(loansTable).where(eq(loansTable.userId, userId));
    const borrowedBookIds = new Set(myLoans.map(l => l.bookId));

    const allBooks = await db.select({
      id: booksTable.id,
      title: booksTable.title,
      author: booksTable.author,
      category: booksTable.category,
      availableCopies: booksTable.availableCopies,
    }).from(booksTable);

    const eligible = allBooks.filter(b => b.availableCopies > 0 && !borrowedBookIds.has(b.id));

    if (eligible.length === 0) {
      return res.json({ suggestions: [], _fallback: false });
    }

    const borrowedSample = [...borrowedBookIds].slice(-8);
    const borrowedBooks = (await Promise.all(
      borrowedSample.map(async id => {
        const [b] = await db.select().from(booksTable).where(eq(booksTable.id, id)).limit(1);
        return b ? { title: b.title, author: b.author, category: b.category } : null;
      })
    )).filter(Boolean);

    if (borrowedBooks.length === 0 || !GEMINI_BASE_URL || !GEMINI_API_KEY) {
      const picks = eligible.sort(() => Math.random() - 0.5).slice(0, 3);
      return res.json({
        suggestions: picks.map(b => ({ bookId: b.id, title: b.title, author: b.author, category: b.category, reason: "Popular in the library" })),
        _fallback: !GEMINI_BASE_URL,
      });
    }

    const prompt = `You are a library recommendation engine. Based on this user's borrowing history, recommend exactly 3 books from the available catalog.

Borrowing history:
${borrowedBooks.map(b => `- "${b!.title}" by ${b!.author} (${b!.category})`).join("\n")}

Available catalog (id | title | author | category):
${eligible.slice(0, 50).map(b => `${b.id} | "${b.title}" | ${b.author} | ${b.category}`).join("\n")}

Return ONLY valid JSON array (no markdown) exactly like:
[{"bookId":1,"reason":"one sentence why"},{"bookId":2,"reason":"one sentence why"},{"bookId":3,"reason":"one sentence why"}]

Only use bookIds from the catalog above. Pick exactly 3 different books.`;

    const raw = await callGemini(prompt);
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const picks: Array<{ bookId: number; reason: string }> = JSON.parse(cleaned);

    const enriched = picks.slice(0, 3).map(pick => {
      const book = eligible.find(b => b.id === Number(pick.bookId));
      if (!book) return null;
      return { bookId: book.id, title: book.title, author: book.author, category: book.category, reason: pick.reason };
    }).filter(Boolean);

    res.json({ suggestions: enriched, _fallback: false });
  } catch {
    const fallbackBooks = await db.select({
      id: booksTable.id, title: booksTable.title, author: booksTable.author, category: booksTable.category, availableCopies: booksTable.availableCopies,
    }).from(booksTable);
    const picks = fallbackBooks.filter(b => b.availableCopies > 0).sort(() => Math.random() - 0.5).slice(0, 3);
    res.json({
      suggestions: picks.map(b => ({ bookId: b.id, title: b.title, author: b.author, category: b.category, reason: "Recommended based on your library profile" })),
      _fallback: true,
    });
  }
});

export default router;
