import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Megaphone, Pin, Trash2, Pencil, Plus, Loader2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useI18n } from "@/lib/i18n";

interface Announcement {
  id: number;
  title: string;
  content: string;
  isPinned: boolean;
  expiresAt: string | null;
  createdAt: string;
  createdBy?: { id: number; name: string };
}

interface AnnouncementForm {
  title: string;
  content: string;
  isPinned: boolean;
  expiresAt: string;
}

const emptyForm: AnnouncementForm = { title: "", content: "", isPinned: false, expiresAt: "" };

export default function AnnouncementsAdminPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const baseUrl = import.meta.env.BASE_URL;
  const apiBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Announcement | null>(null);
  const [form, setForm] = useState<AnnouncementForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch(`${apiBase}api/announcements`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setItems(d.data ?? []))
      .catch(() => toast.error("Failed to load announcements"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew = () => { setEditTarget(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (a: Announcement) => {
    setEditTarget(a);
    setForm({
      title: a.title,
      content: a.content,
      isPinned: a.isPinned,
      expiresAt: a.expiresAt ? a.expiresAt.slice(0, 10) : "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    setSaving(true);
    try {
      const body = {
        title: form.title,
        content: form.content,
        isPinned: form.isPinned,
        expiresAt: form.expiresAt || null,
      };
      const method = editTarget ? "PATCH" : "POST";
      const url = editTarget
        ? `${apiBase}api/announcements/${editTarget.id}`
        : `${apiBase}api/announcements`;
      const resp = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!resp.ok) throw new Error("Save failed");
      setDialogOpen(false);
      load();
      toast.success(editTarget ? "Announcement updated" : "Announcement created", {
        description: editTarget ? undefined : "All users have been notified.",
      });
    } catch {
      toast.error("Failed to save announcement");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`${apiBase}api/announcements/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(prev => prev.filter(a => a.id !== id));
      toast.success("Announcement deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleTogglePin = async (a: Announcement) => {
    try {
      const resp = await fetch(`${apiBase}api/announcements/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isPinned: !a.isPinned }),
      });
      if (!resp.ok) throw new Error();
      load();
      toast.success(a.isPinned ? "Unpinned" : "Pinned");
    } catch {
      toast.error("Failed to update");
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-light flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            {t.announcements.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t.announcements.subtitle}</p>
        </div>
        <Button onClick={openNew} className="gap-1.5">
          <Plus className="w-4 h-4" />
          {t.announcements.newAnnouncement}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center rounded-lg border border-dashed">
          <Megaphone className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t.announcements.noAnnouncements}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(a => (
            <Card key={a.id} className={cn("transition-all", a.isPinned && "border-primary/30 bg-primary/5")}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {a.isPinned && (
                        <Badge variant="secondary" className="text-xs gap-1 bg-primary/10 text-primary">
                          <Pin className="w-3 h-3" /> {t.announcements.pinned}
                        </Badge>
                      )}
                      <h3 className="font-medium text-sm">{a.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{a.content}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{format(new Date(a.createdAt), "MMM d, yyyy")}</span>
                      {a.expiresAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {t.announcements.expires}: {format(new Date(a.expiresAt), "MMM d, yyyy")}
                        </span>
                      )}
                      {a.createdBy && <span>by {a.createdBy.name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title={a.isPinned ? t.announcements.unpin : t.announcements.pin}
                      onClick={() => handleTogglePin(a)}
                    >
                      <Pin className={cn("w-3.5 h-3.5", a.isPinned && "fill-primary text-primary")} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t.announcements.confirmDelete}</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(a.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            {t.announcements.delete}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? t.announcements.edit : t.announcements.newAnnouncement}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t.announcements.titleLabel} *</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Announcement title"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t.announcements.contentLabel} *</Label>
              <Textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Announcement content..."
                rows={4}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t.announcements.expiresAtLabel}</Label>
              <Input
                type="date"
                value={form.expiresAt}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isPinned}
                onCheckedChange={v => setForm(f => ({ ...f, isPinned: v }))}
                id="isPinned"
              />
              <Label htmlFor="isPinned" className="cursor-pointer">
                <span className="flex items-center gap-1.5">
                  <Pin className="w-3.5 h-3.5" />
                  Pin to top
                </span>
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t.announcements.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
