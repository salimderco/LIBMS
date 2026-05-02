import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Settings, Loader2, BookOpen, Users, RotateCcw, DollarSign, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Policy {
  id: number;
  studentLoanDays: number;
  facultyLoanDays: number;
  studentQuota: number;
  facultyQuota: number;
  maxRenewals: number;
  fineRatePerDay: number;
}

export default function LoanPolicyPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const baseUrl = import.meta.env.BASE_URL;
  const apiBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [form, setForm] = useState<Partial<Policy>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${apiBase}api/admin/loan-policy`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { setPolicy(data); setForm(data); })
      .catch(() => toast.error("Failed to load policy"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const resp = await fetch(`${apiBase}api/admin/loan-policy`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!resp.ok) throw new Error("Save failed");
      const updated = await resp.json();
      setPolicy(updated);
      setForm(updated);
      toast.success(t.loanPolicy.saved, { description: "Loan policy updated successfully." });
    } catch {
      toast.error("Failed to save policy");
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    {
      key: "studentLoanDays" as const,
      label: t.loanPolicy.studentLoanDays,
      desc: "Days a student can keep a book",
      icon: Clock,
    },
    {
      key: "facultyLoanDays" as const,
      label: t.loanPolicy.facultyLoanDays,
      desc: "Days a faculty member can keep a book",
      icon: Clock,
    },
    {
      key: "studentQuota" as const,
      label: t.loanPolicy.studentQuota,
      desc: "Max simultaneous loans for students",
      icon: BookOpen,
    },
    {
      key: "facultyQuota" as const,
      label: t.loanPolicy.facultyQuota,
      desc: "Max simultaneous loans for faculty",
      icon: BookOpen,
    },
    {
      key: "maxRenewals" as const,
      label: t.loanPolicy.maxRenewals,
      desc: "Max times a loan can be renewed",
      icon: RotateCcw,
    },
    {
      key: "fineRatePerDay" as const,
      label: t.loanPolicy.fineRate,
      desc: "Fine amount charged per overdue day (USD)",
      icon: DollarSign,
      step: "0.01",
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-light flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          {t.loanPolicy.title}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t.loanPolicy.subtitle}</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Borrowing Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              {fields.map(({ key, label, desc, icon: Icon, step }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-sm">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    {label}
                  </Label>
                  <Input
                    type="number"
                    step={step ?? "1"}
                    min="0"
                    value={form[key] ?? ""}
                    onChange={e => setForm(f => ({
                      ...f,
                      [key]: key === "fineRatePerDay" ? parseFloat(e.target.value) : parseInt(e.target.value),
                    }))}
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>

            {policy && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Current: Students borrow up to {policy.studentQuota} books for {policy.studentLoanDays} days · Faculty up to {policy.facultyQuota} for {policy.facultyLoanDays} days · Max {policy.maxRenewals} renewals · ${policy.fineRatePerDay.toFixed(2)}/day fine
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || loading} className="gap-2 min-w-32">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Settings className="w-4 h-4" /> {t.loanPolicy.save}</>}
        </Button>
      </div>
    </div>
  );
}
