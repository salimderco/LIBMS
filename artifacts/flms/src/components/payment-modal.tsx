import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { CreditCard, Lock, CheckCircle, Loader2, ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  totalAmount: number;
  onSuccess: () => void;
}

function formatCard(val: string) {
  return val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(val: string) {
  return val.replace(/\D/g, "").slice(0, 4).replace(/^(.{2})(.+)/, "$1/$2");
}

export default function PaymentModal({ open, onClose, totalAmount, onSuccess }: PaymentModalProps) {
  const { t } = useI18n();
  const { token } = useAuth();
  const qc = useQueryClient();
  const pm = t.fines.paymentModal;

  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    const rawCard = cardNumber.replace(/\s/g, "");
    if (rawCard.length !== 16) e.cardNumber = "Enter a valid 16-digit card number";
    if (!cardholderName.trim()) e.cardholderName = "Name is required";
    if (expiry.length < 5) e.expiry = "Enter MM/YY";
    if (cvc.length < 3) e.cvc = "Enter 3-digit CVC";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePay = async () => {
    if (!validate()) return;
    setIsPaying(true);
    try {
      await new Promise(r => setTimeout(r, 1800));
      const resp = await fetch(`${import.meta.env.BASE_URL}api/fines/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cardLast4: cardNumber.replace(/\s/g, "").slice(-4), cardholderName }),
      });
      if (!resp.ok) throw new Error("Payment failed");
      setPaid(true);
      qc.invalidateQueries();
      setTimeout(() => {
        onSuccess();
        onClose();
        setPaid(false);
        setCardNumber(""); setCardholderName(""); setExpiry(""); setCvc("");
      }, 2000);
    } catch {
      toast.error("Payment failed", { description: "Please try again." });
    } finally {
      setIsPaying(false);
    }
  };

  const handleClose = () => {
    if (isPaying) return;
    onClose();
    setPaid(false);
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            {pm.title}
          </DialogTitle>
          <DialogDescription>{pm.subtitle}</DialogDescription>
        </DialogHeader>

        {paid ? (
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <p className="font-semibold text-green-700">{pm.success}</p>
            <p className="text-sm text-muted-foreground">Charged ${totalAmount.toFixed(2)} to card ending in {cardNumber.replace(/\s/g,"").slice(-4)}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
              <span className="text-sm font-medium">{pm.amount}</span>
              <span className="text-xl font-bold text-primary">${totalAmount.toFixed(2)}</span>
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
              {pm.testCard}
            </p>

            <div className="space-y-3">
              <div>
                <Label htmlFor="cardNumber" className="text-xs">{pm.cardNumber}</Label>
                <div className="relative mt-1">
                  <Input
                    id="cardNumber"
                    placeholder="4242 4242 4242 4242"
                    value={cardNumber}
                    onChange={e => setCardNumber(formatCard(e.target.value))}
                    className={`pl-9 font-mono ${errors.cardNumber ? "border-red-400" : ""}`}
                  />
                  <CreditCard className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
                {errors.cardNumber && <p className="text-xs text-red-500 mt-0.5">{errors.cardNumber}</p>}
              </div>

              <div>
                <Label htmlFor="cardName" className="text-xs">{pm.cardholderName}</Label>
                <Input
                  id="cardName"
                  placeholder="Jane Smith"
                  value={cardholderName}
                  onChange={e => setCardholderName(e.target.value)}
                  className={`mt-1 ${errors.cardholderName ? "border-red-400" : ""}`}
                />
                {errors.cardholderName && <p className="text-xs text-red-500 mt-0.5">{errors.cardholderName}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="expiry" className="text-xs">{pm.expiry}</Label>
                  <Input
                    id="expiry"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={e => setExpiry(formatExpiry(e.target.value))}
                    className={`mt-1 font-mono ${errors.expiry ? "border-red-400" : ""}`}
                  />
                  {errors.expiry && <p className="text-xs text-red-500 mt-0.5">{errors.expiry}</p>}
                </div>
                <div>
                  <Label htmlFor="cvc" className="text-xs">{pm.cvc}</Label>
                  <div className="relative mt-1">
                    <Input
                      id="cvc"
                      placeholder="123"
                      value={cvc}
                      maxLength={4}
                      onChange={e => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      className={`pr-8 font-mono ${errors.cvc ? "border-red-400" : ""}`}
                    />
                    <Lock className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  {errors.cvc && <p className="text-xs text-red-500 mt-0.5">{errors.cvc}</p>}
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose} disabled={isPaying}>
                {pm.cancel}
              </Button>
              <Button className="flex-1" onClick={handlePay} disabled={isPaying}>
                {isPaying ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{pm.processing}</>
                ) : (
                  <><Lock className="w-4 h-4 mr-1.5" />{pm.payButton} ${totalAmount.toFixed(2)}</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
