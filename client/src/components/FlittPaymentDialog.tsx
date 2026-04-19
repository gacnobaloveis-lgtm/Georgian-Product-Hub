import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FlittPaymentDialogProps {
  open: boolean;
  amount: number;          // GEL
  orderId: number | string;
  description: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function FlittPaymentDialog({ open, amount, orderId, description, onClose, onSuccess }: FlittPaymentDialogProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [payUrl, setPayUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      setPayUrl(null);
      return;
    }
    if (initializedRef.current) return;
    initializedRef.current = true;
    setLoading(true);
    setError(null);
    setPayUrl(null);

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/flitt/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ amount, orderId, description, cardOnly: true }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "გადახდის ინიციალიზაცია ვერ მოხერხდა");
        }
        const { payUrl: url } = await res.json();
        if (cancelled) return;
        if (!url) throw new Error("გადახდის ბმული ვერ მოვიპოვეთ");
        setPayUrl(url);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "გადახდის შეცდომა");
        setLoading(false);
        toast({ variant: "destructive", title: "შეცდომა", description: e?.message || "გადახდა ვერ დაიწყო" });
      }
    })();
    return () => { cancelled = true; };
  }, [open, amount, orderId, description, toast]);

  // Detect navigation to /payment/success inside the iframe
  function handleIframeLoad() {
    setLoading(false);
    try {
      const href = iframeRef.current?.contentWindow?.location.href;
      if (href && href.includes("/payment/success")) {
        onSuccess();
      }
    } catch {
      // cross-origin – iframe is on Flitt's domain, ignore
    }
  }

  // Listen for postMessage from /payment/success (same-origin) or Flitt SDK events
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
        className="p-0 overflow-hidden gap-0 max-w-[95vw] sm:max-w-[440px] w-[440px] h-[680px] sm:rounded-2xl bg-white"
        data-testid="dialog-flitt-payment"
      >
        <DialogTitle className="sr-only">ბარათით გადახდა</DialogTitle>
        <DialogDescription className="sr-only">შეიყვანეთ ბარათის მონაცემები</DialogDescription>
        <div className="relative w-full h-full">
          {(loading || !payUrl) && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {error && (
            <div className="p-6 text-center text-sm text-destructive">{error}</div>
          )}
          {payUrl && !error && (
            <iframe
              ref={iframeRef}
              src={payUrl}
              onLoad={handleIframeLoad}
              className="w-full h-full border-0"
              title="Flitt Payment"
              allow="payment *"
              data-testid="iframe-flitt-payment"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
