import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { PackageX, Bell, Loader2, Check } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: number;
  productName: string;
  selectedColor?: string | null;
}

export function OutOfStockDialog({ open, onOpenChange, productId, productName, selectedColor }: Props) {
  const { toast } = useToast();
  const { isRealUser } = useAuth();
  const [subscribe, setSubscribe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      setSubscribe(true);
      setDone(false);
    }
  }, [open]);

  async function handleSubmit() {
    if (!subscribe) {
      onOpenChange(false);
      return;
    }
    if (!isRealUser) {
      toast({ variant: "destructive", title: "შეტყობინებისთვის გაიარეთ ავტორიზაცია" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/stock-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productId, selectedColor: selectedColor || null }),
      });
      if (res.ok) {
        setDone(true);
        toast({ title: "გამოწერა შესრულდა", description: "შეტყობინება მოვა ნივთის შემოსვლისას" });
        setTimeout(() => onOpenChange(false), 1500);
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ variant: "destructive", title: "შეცდომა", description: data.message || "ვერ მოხერხდა" });
      }
    } catch {
      toast({ variant: "destructive", title: "შეცდომა", description: "კავშირის შეცდომა" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md border-white/20 text-white"
        data-testid="dialog-out-of-stock"
        style={{
          background: "rgba(15, 23, 42, 0.55)",
          backdropFilter: "blur(24px) saturate(160%)",
          WebkitBackdropFilter: "blur(24px) saturate(160%)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <PackageX className="h-5 w-5 text-amber-300" />
            ბოდიშს გიხდით
          </DialogTitle>
          <DialogDescription className="sr-only">ნივთის მარაგი ამოწურულია</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-white/90">
            ნივთის <strong>"{productName}"</strong> მარაგი ამოწურულია, მალე შეივსება.
          </p>

          <div className="rounded-lg border border-white/20 bg-white/10 p-3">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <Checkbox
                checked={subscribe}
                onCheckedChange={(v) => setSubscribe(!!v)}
                className="mt-0.5 border-white/40 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                data-testid="checkbox-subscribe-stock"
              />
              <span className="text-sm text-white/95 flex items-center gap-1.5">
                <Bell className="h-4 w-4 text-emerald-300" />
                მინდა შეტყობინება ნივთის შემოსვლისას
              </span>
            </label>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-white/30 bg-white/10 text-white hover:bg-white/20"
              disabled={submitting}
              data-testid="button-stock-cancel"
            >
              გათიშვა
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || done}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              data-testid="button-stock-confirm"
            >
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> იგზავნება...</>
              ) : done ? (
                <><Check className="mr-2 h-4 w-4" /> შესრულდა</>
              ) : subscribe ? (
                "გამოწერა"
              ) : (
                "კარგი"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
