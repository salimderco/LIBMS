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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, Pencil, Trash2, Upload, Loader2, BookOpen,
  ChevronLeft, ChevronRight, AlertCircle, CheckCircle
} from "lucide-react";

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

const PAGE_SIZE = 15;

export default function CatalogManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editBook, setEditBook] = useState<Book | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");

  const params = { ...(search && { q: search }), limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };
  const { data, isLoading } = useListBooks(params, { query: { queryKey: getListBooksQueryKey(params) } });
  const totalPages = data?.totalPages ?? 0;

  const createMutation = useCreateBook();
  const updateMutation = useUpdateBook();
  const deleteMutation = useDeleteBook();
  const importMutation = useImportBooks();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListBooksQueryKey({}) });
  };

  const addForm = useForm<FormValues>({
    resolver: zodResolver(bookSchema),
    defaultValues: { format: "PHYSICAL", totalCopies: 1 },
  });

  const editForm = useForm<FormValues>({
    resolver: zodResolver(bookSchema),
  });

  const openEdit = (book: Book) => {
    setEditBook(book);
    editForm.reset({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      publisher: book.publisher ?? "",
      publicationYear: book.publicationYear ?? undefined,
      edition: book.edition ?? "",
      category: book.category,
      tags: book.tags?.join(", ") ?? "",
      format: book.format as "PHYSICAL" | "DIGITAL",
      totalCopies: book.totalCopies,
      shelfLocation: book.shelfLocation ?? "",
      description: book.description ?? "",
    });
    setEditOpen(true);
  };

  const toBookBody = (values: FormValues): CreateBookBody => ({
    title: values.title,
    author: values.author,
    isbn: values.isbn,
    category: values.category,
    format: values.format as CreateBookBodyFormat,
    totalCopies: values.totalCopies,
    publisher: values.publisher ?? "",
    publicationYear: values.publicationYear ?? 0,
    tags: values.tags ? values.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
    ...(values.edition && { edition: values.edition }),
    ...(values.shelfLocation && { shelfLocation: values.shelfLocation }),
    ...(values.description && { description: values.description }),
  });

  const handleAdd = (values: FormValues) => {
    createMutation.mutate(
      { data: toBookBody(values) },
      {
        onSuccess: () => {
          toast({ title: "Book added" });
          addForm.reset({ format: "PHYSICAL", totalCopies: 1 });
          setAddOpen(false);
          invalidate();
        },
        onError: (err: any) => toast({ title: "Error", description: err?.data?.message ?? err?.message, variant: "destructive" }),
      }
    );
  };

  const handleEdit = (values: FormValues) => {
    if (!editBook) return;
    const body: UpdateBookBody = {
      ...(toBookBody(values) as UpdateBookBody),
      format: values.format as any,
    };
    updateMutation.mutate(
      { bookId: editBook.id, data: body },
      {
        onSuccess: () => {
          toast({ title: "Book updated" });
          setEditOpen(false);
          invalidate();
        },
        onError: (err: any) => toast({ title: "Error", description: err?.data?.message ?? err?.message, variant: "destructive" }),
      }
    );
  };

  const handleDelete = (bookId: number) => {
    deleteMutation.mutate(
      { bookId },
      {
        onSuccess: () => {
          toast({ title: "Book deleted" });
          invalidate();
        },
        onError: (err: any) => toast({ title: "Error", description: err?.data?.message ?? err?.message, variant: "destructive" }),
      }
    );
  };

  const handleImport = () => {
    setImportError("");
    setImportSuccess("");
    let parsed: CreateBookBody[];
    try {
      parsed = JSON.parse(importJson);
      if (!Array.isArray(parsed)) throw new Error("Expected a JSON array");
    } catch (_e) {
      setImportError("Invalid JSON. Expected an array of book objects.");
      return;
    }
    importMutation.mutate(
      { data: { books: parsed } },
      {
        onSuccess: (res) => {
          setImportSuccess(`Successfully imported ${res.imported} books.`);
          setImportJson("");
          invalidate();
        },
        onError: (err: any) => {
          const msg = err?.data?.errors?.[0]?.reason ?? err?.data?.message ?? err?.message ?? "Import failed";
          setImportError(msg);
        }
      }
    );
  };

  const BookForm = ({ form, onSubmit, isPending }: { form: any; onSubmit: (v: FormValues) => void; isPending: boolean }) => (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label>Title *</Label>
          <Input {...form.register("title")} placeholder="Book title" data-testid="input-title" />
          {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>Author *</Label>
          <Input {...form.register("author")} placeholder="Author name" data-testid="input-author" />
          {form.formState.errors.author && <p className="text-xs text-destructive">{form.formState.errors.author.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>ISBN *</Label>
          <Input {...form.register("isbn")} placeholder="978-..." data-testid="input-isbn" />
          {form.formState.errors.isbn && <p className="text-xs text-destructive">{form.formState.errors.isbn.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>Category *</Label>
          <Input {...form.register("category")} placeholder="e.g. Computer Science" data-testid="input-category" />
        </div>
        <div className="space-y-1">
          <Label>Format *</Label>
          <Select defaultValue={form.getValues("format")} onValueChange={(v: string) => form.setValue("format", v)}>
            <SelectTrigger data-testid="select-format">
              <SelectValue />
            </SelectTrigger>
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
          <Textarea {...form.register("description")} placeholder="Brief description..." rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isPending} data-testid="button-submit-book">
          {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Save book
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-light" data-testid="heading-catalog-management">Catalog Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Add, edit, and manage the library book catalog</p>
      </div>

      <Tabs defaultValue="books">
        <TabsList>
          <TabsTrigger value="books">Books</TabsTrigger>
          <TabsTrigger value="import" data-testid="tab-import">Bulk Import</TabsTrigger>
        </TabsList>

        <TabsContent value="books" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search books..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                data-testid="input-search-books"
              />
            </div>
            <Button onClick={() => setAddOpen(true)} data-testid="button-add-book">
              <Plus className="w-4 h-4 mr-2" />Add Book
            </Button>
          </div>

          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
          ) : !data?.data?.length ? (
            <div className="text-center py-12">
              <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground">No books in catalog</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.data.map(book => (
                <Card key={book.id} className="hover-elevate">
                  <CardContent className="p-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" data-testid={`book-title-${book.id}`}>{book.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <p className="text-xs text-muted-foreground">{book.author}</p>
                        <span className="text-xs text-muted-foreground">{book.availableCopies}/{book.totalCopies} avail.</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(book)}
                        data-testid={`button-edit-${book.id}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            data-testid={`button-delete-${book.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete book?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove "{book.title}" from the catalog.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(book.id)}
                              className="bg-destructive hover:bg-destructive/90"
                              data-testid={`button-confirm-delete-${book.id}`}
                            >
                              Delete
                            </AlertDialogAction>
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
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="import" className="mt-4">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="font-serif text-base">Bulk Import Books</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Paste a JSON array of book objects. Each book requires: title, author, isbn, category, format, totalCopies.
              </p>
              <Textarea
                placeholder='[{"title":"Book Name","author":"Author","isbn":"978-...","category":"CS","format":"PHYSICAL","totalCopies":3}]'
                rows={10}
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                className="font-mono text-xs"
                data-testid="textarea-import"
              />
              {importError && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription className="text-xs">{importError}</AlertDescription>
                </Alert>
              )}
              {importSuccess && (
                <Alert className="border-green-200 bg-green-50 text-green-800">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-xs">{importSuccess}</AlertDescription>
                </Alert>
              )}
              <Button
                onClick={handleImport}
                disabled={!importJson.trim() || importMutation.isPending}
                data-testid="button-import"
              >
                {importMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Import Books
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">Add New Book</DialogTitle>
          </DialogHeader>
          <BookForm form={addForm} onSubmit={handleAdd} isPending={createMutation.isPending} />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">Edit Book</DialogTitle>
          </DialogHeader>
          <BookForm form={editForm} onSubmit={handleEdit} isPending={updateMutation.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
