import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FlittPaymentDialogProps {
  open: boolean;
  amount: number;
  orderId: number | string;
  orderIds?: number[];
  description: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function FlittPaymentDialog({ open, amount, orderId, orderIds, description, onClose, onSuccess }: FlittPaymentDialogProps) {
  const initializedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      setError(null);
      return;
    }
    if (initializedRef.current) return;
    initializedRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/flitt/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ amount, orderId, orderIds, description }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "გადახდის ინიციალიზაცია ვერ მოხერხდა");
        }
        const { payUrl } = await res.json();
        if (cancelled) return;
        if (!payUrl) throw new Error("გადახდის ბმული ვერ მოვიპოვეთ");
        window.location.href = payUrl;
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "გადახდის შეცდომა");
        toast({ variant: "destructive", title: "შეცდომა", description: e?.message || "გადახდა ვერ დაიწყო" });
      }
    })();
    return () => { cancelled = true; };
  }, [open, amount, orderId, orderIds, description, toast]);

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      const data = e.data;
      if (!data || typeof data !== "object") return;
      if (
        data.type === "flitt-payment-success" ||
        data.event === "success" ||
        data.event === "payment_success" ||
        data.response_status === "success"
      ) {
        onSuccess();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onSuccess]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="p-0 overflow-hidden gap-0 max-w-[95vw] sm:max-w-[400px] sm:rounded-2xl bg-white"
        data-testid="dialog-flitt-payment"
      >
        <DialogTitle className="sr-only">ბარათით გადახდა</DialogTitle>
        <DialogDescription className="sr-only">გადახდის გვერდი იხსნება</DialogDescription>
        <div className="flex flex-col items-center justify-center gap-3 p-8 min-h-[180px]">
          {error ? (
            <div className="text-center text-sm text-destructive" data-testid="text-flitt-error">
              {error}
            </div>
          ) : (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-slate-600 text-center">გადახდის გვერდი იხსნება...</p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
