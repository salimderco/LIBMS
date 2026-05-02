import { useState } from "react";
import {
  useListBooks, getListBooksQueryKey,
  useCreateBook, useUpdateBook, useDeleteBook, useImportBooks,
  type Book, type CreateBookBody, type UpdateBookBody, CreateBookBodyFormat
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus, Search, Pencil, Trash2, Upload, Loader2, BookOpen,
  ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Eye, FileCode, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

const bookSchema = z.object({
  title: z.string().min(1, "Required"),
  author: z.string().min(1, "Required"),
  isbn: z.string().min(1, "Required"),
  publisher: z.string().optional(),
  publicationYear: z.coerce.number().optional(),
  edition: z.string().optional(),
  category: z.string().min(1, "Required"),
  tags: z.string().optional(),
  format: z.enum(["PHYSICAL", "DIGITAL"]),
  totalCopies: z.coerce.number().min(1),
  shelfLocation: z.string().optional(),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof bookSchema>;

interface ParsedRow {
  row: number;
  data: Record<string, unknown>;
  errors: string[];
}

const REQUIRED_FIELDS = ["title", "author", "isbn", "category", "format", "totalCopies"];

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const parseRow = (line: string) => {
    const result: string[] = [];
    let inQuote = false;
    let current = "";
    for (const char of line) {
      if (char === '"') { inQuote = !inQuote; continue; }
      if (char === "," && !inQuote) { result.push(current.trim()); current = ""; continue; }
      current += char;
    }
    result.push(current.trim());
    return result;
  };
  const headers = parseRow(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseRow(line);
    return Object.fromEntries(headers.map((h, i) => [h.trim(), values[i] ?? ""]));
  });
}

function validateRows(rows: Record<string, unknown>[]): ParsedRow[] {
  const isbnCounts: Record<string, number[]> = {};
  rows.forEach((row, i) => {
    const isbn = String(row.isbn ?? "").trim();
    if (isbn) {
      if (!isbnCounts[isbn]) isbnCounts[isbn] = [];
      isbnCounts[isbn].push(i + 1);
    }
  });
  return rows.map((row, i) => {
    const errors: string[] = [];
    for (const field of REQUIRED_FIELDS) {
      if (!row[field] || String(row[field]).trim() === "") errors.push(`Missing required field: "${field}"`);
    }
    if (row.format && !["PHYSICAL", "DIGITAL"].includes(String(row.format).toUpperCase())) {
      errors.push(`"format" must be PHYSICAL or DIGITAL`);
    }
    if (row.totalCopies && Number(row.totalCopies) < 1) errors.push(`"totalCopies" must be >= 1`);
    const isbn = String(row.isbn ?? "").trim();
    if (isbn && isbnCounts[isbn] && isbnCounts[isbn].length > 1) {
      errors.push(`Duplicate ISBN on rows ${isbnCounts[isbn].join(", ")}`);
    }
    return { row: i + 1, data: row, errors };
  });
}

const PAGE_SIZE = 15;

function BookForm({
  form,
  onSubmit,
  isPending,
  baseUrl,
  token,
}: {
  form: ReturnType<typeof useForm<FormValues>>;
  onSubmit: (v: FormValues) => void;
  isPending: boolean;
  baseUrl: string;
  token: string | null;
}) {
  const [enriching, setEnriching] = useState(false);

  const handleAutoFill = async () => {
    const title = form.getValues("title");
    const author = form.getValues("author");
    if (!title || !author) {
      toast.error("Auto-fill needs title & author", {
        description: "Fill in the title and author fields first, then click Auto-Fill.",
      });
      return;
    }
    setEnriching(true);
    try {
      const resp = await fetch(`${baseUrl}api/ai/enrich-book`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, author }),
      });
      if (!resp.ok) throw new Error((await resp.json()).message ?? "AI enrichment failed");
      const data = await resp.json();
      if (data.description) form.setValue("description", data.description);
      if (Array.isArray(data.tags)) form.setValue("tags", data.tags.join(", "));
      if (data.isbn) form.setValue("isbn", data.isbn);
      if (data.publisher) form.setValue("publisher", data.publisher);
      if (data.publicationYear) form.setValue("publicationYear", data.publicationYear);
      if (data.category) form.setValue("category", data.category);
      if (data._fallback) {
        toast.info("Auto-fill used fallback data", {
          description: "AI unavailable — basic metadata applied. Review and adjust as needed.",
        });
      } else {
        toast.success("Auto-filled with AI", {
          description: "Review the enriched metadata before saving.",
        });
      }
    } catch (err: any) {
      toast.error("Auto-fill failed", { description: err?.message });
    } finally {
      setEnriching(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label>Title *</Label>
          <Input {...form.register("title")} placeholder="Book title" data-testid="input-title" />
          {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Author *</Label>
          <div className="flex gap-2">
            <Input {...form.register("author")} placeholder="Author name" data-testid="input-author" className="flex-1" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAutoFill}
              disabled={enriching}
              data-testid="button-autofill"
              className="flex-shrink-0 gap-1.5 text-xs"
              title="Auto-fill metadata with AI"
            >
              {enriching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              )}
              {enriching ? "Filling…" : "Auto-Fill AI"}
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          <Label>ISBN *</Label>
          <div className="flex gap-2">
            <Input {...form.register("isbn")} placeholder="978-..." data-testid="input-isbn" className="flex-1" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={enriching}
              className="flex-shrink-0 gap-1.5 text-xs"
              title="Look up book details by ISBN"
              onClick={async () => {
                const isbn = form.getValues("isbn");
                if (!isbn) { toast.error("Enter an ISBN first"); return; }
                setEnriching(true);
                try {
                  const resp = await fetch(`${baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`}api/books/isbn-lookup?isbn=${encodeURIComponent(isbn)}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  if (!resp.ok) throw new Error((await resp.json()).message ?? "ISBN lookup failed");
                  const data = await resp.json();
                  if (data.title) form.setValue("title", data.title);
                  if (data.author) form.setValue("author", data.author);
                  if (data.publisher) form.setValue("publisher", data.publisher);
                  if (data.publicationYear) form.setValue("publicationYear", data.publicationYear);
                  if (data.description) form.setValue("description", data.description);
                  if (data.category) form.setValue("category", data.category);
                  if (Array.isArray(data.tags)) form.setValue("tags", data.tags.join(", "));
                  toast.success("ISBN lookup complete", { description: data.title ?? "Book details filled in." });
                } catch (err: any) {
                  toast.error("ISBN lookup failed", { description: err?.message });
                } finally {
                  setEnriching(false);
                }
              }}
            >
              {enriching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span className="text-xs">🔍</span>}
              {enriching ? "Looking up..." : "Lookup"}
            </Button>
          </div>
          {form.formState.errors.isbn && <p className="text-xs text-destructive">{form.formState.errors.isbn.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>Category *</Label>
          <Input {...form.register("category")} placeholder="e.g. Computer Science" />
          {form.formState.errors.category && <p className="text-xs text-destructive">{form.formState.errors.category.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>Format *</Label>
          <Select defaultValue={form.getValues("format")} onValueChange={(v: string) => form.setValue("format", v as "PHYSICAL" | "DIGITAL")}>
            <SelectTrigger data-testid="select-format"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PHYSICAL">Physical</SelectItem>
              <SelectItem value="DIGITAL">Digital</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Publisher</Label>
          <Input {...form.register("publisher")} placeholder="Publisher name" />
        </div>
        <div className="space-y-1">
          <Label>Year</Label>
          <Input {...form.register("publicationYear")} type="number" placeholder="2024" />
        </div>
        <div className="space-y-1">
          <Label>Edition</Label>
          <Input {...form.register("edition")} placeholder="e.g. 4th" />
        </div>
        <div className="space-y-1">
          <Label>Total Copies *</Label>
          <Input {...form.register("totalCopies")} type="number" min="1" data-testid="input-copies" />
          {form.formState.errors.totalCopies && <p className="text-xs text-destructive">{form.formState.errors.totalCopies.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>Shelf Location</Label>
          <Input {...form.register("shelfLocation")} placeholder="e.g. CS-A01" />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Tags</Label>
          <Input {...form.register("tags")} placeholder="algorithms, data structures (comma-separated)" />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Description</Label>
          <Textarea {...form.register("description")} placeholder="Brief description…" rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isPending} data-testid="button-submit-book">
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save book
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function CatalogManagementPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const baseUrl = import.meta.env.BASE_URL;
  const apiBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editBook, setEditBook] = useState<Book | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMode, setImportMode] = useState<"input" | "preview">("input");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);

  const params = { ...(search && { q: search }), limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };
  const { data, isLoading } = useListBooks(params, { query: { queryKey: getListBooksQueryKey(params) } });
  const totalPages = data?.totalPages ?? 0;

  const createMutation = useCreateBook();
  const updateMutation = useUpdateBook();
  const deleteMutation = useDeleteBook();
  const importMutation = useImportBooks();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListBooksQueryKey({}) });

  const addForm = useForm<FormValues>({ resolver: zodResolver(bookSchema), defaultValues: { format: "PHYSICAL", totalCopies: 1 } });
  const editForm = useForm<FormValues>({ resolver: zodResolver(bookSchema) });

  const openEdit = (book: Book) => {
    setEditBook(book);
    editForm.reset({
      title: book.title, author: book.author, isbn: book.isbn,
      publisher: book.publisher ?? "", publicationYear: book.publicationYear ?? undefined,
      edition: book.edition ?? "", category: book.category,
      tags: book.tags?.join(", ") ?? "",
      format: book.format as "PHYSICAL" | "DIGITAL",
      totalCopies: book.totalCopies, shelfLocation: book.shelfLocation ?? "",
      description: book.description ?? "",
    });
    setEditOpen(true);
  };

  const toBookBody = (values: FormValues): CreateBookBody => ({
    title: values.title, author: values.author, isbn: values.isbn,
    publisher: values.publisher ?? "", publicationYear: values.publicationYear ?? 0,
    category: values.category, format: values.format as CreateBookBodyFormat,
    totalCopies: values.totalCopies,
    tags: values.tags ? values.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    ...(values.edition && { edition: values.edition }),
    ...(values.shelfLocation && { shelfLocation: values.shelfLocation }),
    ...(values.description && { description: values.description }),
  });

  const handleAdd = (values: FormValues) => {
    createMutation.mutate({ data: toBookBody(values) }, {
      onSuccess: (book) => {
        toast.success("Book added", { description: `"${book.title}" is now in the catalog.` });
        addForm.reset({ format: "PHYSICAL", totalCopies: 1 });
        setAddOpen(false);
        invalidate();
      },
      onError: (err: any) => toast.error("Add failed", { description: err?.data?.message ?? err?.message }),
    });
  };

  const handleEdit = (values: FormValues) => {
    if (!editBook) return;
    updateMutation.mutate({ bookId: editBook.id, data: toBookBody(values) as UpdateBookBody }, {
      onSuccess: () => { toast.success("Book updated"); setEditOpen(false); invalidate(); },
      onError: (err: any) => toast.error("Update failed", { description: err?.data?.message ?? err?.message }),
    });
  };

  const handleDelete = (bookId: number, bookTitle: string) => {
    deleteMutation.mutate({ bookId }, {
      onSuccess: () => { toast.success("Book deleted", { description: `"${bookTitle}" removed from catalog.` }); invalidate(); },
      onError: (err: any) => toast.error("Delete failed", { description: err?.data?.message ?? err?.message }),
    });
  };

  const handlePreview = () => {
    if (!importText.trim()) return;
    let raw: Record<string, unknown>[] = [];
    const trimmed = importText.trim();
    if (trimmed.startsWith("[")) {
      try { raw = JSON.parse(trimmed); }
      catch { toast.error("Invalid JSON", { description: "Expected a JSON array of objects." }); return; }
    } else {
      const csvRows = parseCSV(trimmed);
      if (!csvRows.length) { toast.error("Invalid CSV", { description: "Check headers row." }); return; }
      raw = csvRows;
    }
    if (!Array.isArray(raw)) { toast.error("Invalid format", { description: "Expected an array." }); return; }
    setParsedRows(validateRows(raw));
    setImportMode("preview");
  };

  const handleImport = () => {
    const errorCount = parsedRows.filter(r => r.errors.length > 0).length;
    if (errorCount > 0) { toast.error(`${errorCount} row${errorCount > 1 ? "s have" : " has"} errors`); return; }
    const books = parsedRows.map(r => ({
      ...r.data, format: String(r.data.format ?? "").toUpperCase(),
      totalCopies: Number(r.data.totalCopies),
      publicationYear: r.data.publicationYear ? Number(r.data.publicationYear) : undefined,
      tags: r.data.tags ? String(r.data.tags).split(",").map(t => t.trim()).filter(Boolean) : [],
    }));
    importMutation.mutate({ data: { books: books as any } }, {
      onSuccess: (res) => {
        toast.success(`Imported ${res.imported} books`, { description: res.message });
        setImportText(""); setParsedRows([]); setImportMode("input"); invalidate();
      },
      onError: (err: any) => {
        const firstError = err?.data?.errors?.[0];
        toast.error("Import failed", { description: firstError ? `Row ${firstError.row}: ${firstError.reason}` : (err?.data?.message ?? err?.message) });
      },
    });
  };

  const errorCount = parsedRows.filter(r => r.errors.length > 0).length;
  const validCount = parsedRows.length - errorCount;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-light" data-testid="heading-catalog-management">{t.catalogMgmt.title}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t.catalogMgmt.subtitle}</p>
      </div>

      <Tabs defaultValue="books">
        <TabsList>
          <TabsTrigger value="books">{t.catalogMgmt.books}</TabsTrigger>
          <TabsTrigger value="import" data-testid="tab-import">{t.catalogMgmt.bulkImport}</TabsTrigger>
        </TabsList>

        <TabsContent value="books" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={t.catalogMgmt.searchBooks} className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} data-testid="input-search-books" />
            </div>
            <Button onClick={() => setAddOpen(true)} data-testid="button-add-book">
              <Plus className="w-4 h-4 mr-2" />{t.catalogMgmt.addBook}
            </Button>
          </div>

          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
          ) : !data?.data?.length ? (
            <div className="text-center py-12">
              <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground">{t.catalogMgmt.noBooks}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.data.map(book => (
                <Card key={book.id}>
                  <CardContent className="p-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" data-testid={`book-title-${book.id}`}>{book.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <p className="text-xs text-muted-foreground">{book.author}</p>
                        <span className="text-xs text-muted-foreground">{t.catalogMgmt.avail(book.availableCopies, book.totalCopies)}</span>
                        <Badge variant="outline" className="text-xs">{book.category}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(book)} data-testid={`button-edit-${book.id}`}><Pencil className="w-3.5 h-3.5" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" data-testid={`button-delete-${book.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t.catalogMgmt.deleteBookTitle}</AlertDialogTitle>
                            <AlertDialogDescription>{t.catalogMgmt.deleteBookDesc(book.title)}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t.catalogMgmt.cancel}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(book.id, book.title)} className="bg-destructive hover:bg-destructive/90" data-testid={`button-confirm-delete-${book.id}`}>{t.catalogMgmt.delete}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{t.common.pageOf(page, totalPages)}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="import" className="mt-4">
          <Card className="max-w-3xl">
            <CardHeader>
              <CardTitle className="font-serif text-base font-medium flex items-center gap-2">
                <FileCode className="w-4 h-4 text-primary" />
                Bulk Import Books
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {importMode === "input" ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Paste a <strong>JSON array</strong> or <strong>CSV</strong> (with headers). Required: <code className="text-xs bg-muted px-1 rounded">title, author, isbn, category, format, totalCopies</code>
                  </p>
                  <Textarea
                    placeholder={'JSON: [{"title":"...","author":"...","isbn":"...","category":"CS","format":"PHYSICAL","totalCopies":2}]\n\nCSV:\ntitle,author,isbn,category,format,totalCopies\nBook Name,Author,978-...,CS,PHYSICAL,2'}
                    rows={10} value={importText} onChange={(e) => setImportText(e.target.value)}
                    className="font-mono text-xs" data-testid="textarea-import"
                  />
                  <Button onClick={handlePreview} disabled={!importText.trim()} variant="outline" data-testid="button-preview-import">
                    <Eye className="w-4 h-4 mr-2" />{t.catalogMgmt.previewValidate}
                  </Button>
                </>
              ) : (
                <>
                  <div className={cn("flex items-center gap-3 p-3 rounded-lg border text-sm font-medium", errorCount > 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-green-50 border-green-200 text-green-800")}>
                    {errorCount > 0 ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                    <span>{parsedRows.length} rows — {validCount} valid{errorCount > 0 && `, ${errorCount} with errors`}</span>
                  </div>
                  <div className="rounded-lg border overflow-hidden">
                    <div className="grid grid-cols-[48px_1fr_2fr] gap-0 bg-muted/50 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <span>Row</span><span>Status</span><span>Details</span>
                    </div>
                    <div className="divide-y max-h-72 overflow-y-auto">
                      {parsedRows.map(row => (
                        <div key={row.row} className={cn("grid grid-cols-[48px_1fr_2fr] gap-2 px-4 py-2.5 text-xs items-start", row.errors.length > 0 ? "bg-red-50/50" : "bg-green-50/30")}>
                          <span className="font-mono text-muted-foreground">{row.row}</span>
                          <span className={cn("inline-flex items-center gap-1 font-medium", row.errors.length > 0 ? "text-red-600" : "text-green-600")}>
                            {row.errors.length > 0 ? <><AlertCircle className="w-3 h-3" />Error</> : <><CheckCircle2 className="w-3 h-3" />Valid</>}
                          </span>
                          <div>
                            {row.errors.length > 0
                              ? <ul className="space-y-0.5">{row.errors.map((e, ei) => <li key={ei} className="text-red-600">{e}</li>)}</ul>
                              : <span className="text-muted-foreground truncate block">{String(row.data.title ?? "")} — {String(row.data.author ?? "")}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button variant="outline" onClick={() => { setImportMode("input"); setParsedRows([]); }}>← Edit import</Button>
                    <Button onClick={handleImport} disabled={errorCount > 0 || importMutation.isPending} data-testid="button-import">
                      {importMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                      Import {validCount} {validCount === 1 ? "book" : "books"}
                    </Button>
                    {errorCount > 0 && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />Fix {errorCount} error{errorCount > 1 ? "s" : ""} to proceed
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-serif">{t.catalogMgmt.addBook}</DialogTitle></DialogHeader>
          <BookForm form={addForm} onSubmit={handleAdd} isPending={createMutation.isPending} baseUrl={apiBase} token={token} />
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-serif">{t.catalogMgmt.saveBook}</DialogTitle></DialogHeader>
          <BookForm form={editForm} onSubmit={handleEdit} isPending={updateMutation.isPending} baseUrl={apiBase} token={token} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
