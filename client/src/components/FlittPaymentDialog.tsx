import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    checkout?: (selector: string, options: any) => void;
  }
}

const SCRIPT_SRC = "https://pay.flitt.com/checkout.js";
let scriptPromise: Promise<void> | null = null;

function loadCheckoutScript(): Promise<void> {
  if (typeof window.checkout === "function") return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Flitt SDK")));
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { scriptPromise = null; reject(new Error("Failed to load Flitt SDK")); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

interface FlittPaymentDialogProps {
  open: boolean;
  amount: number;          // GEL
  orderId: number | string;
  description: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function FlittPaymentDialog({ open, amount, orderId, description, onClose, onSuccess }: FlittPaymentDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      return;
    }
    if (initializedRef.current) return;
    initializedRef.current = true;
    setLoading(true);
    setError(null);

    let cancelled = false;

    (async () => {
      try {
        const paramsRes = await fetch("/api/flitt/embed-params", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ amount, orderId, description }),
        });
        if (!paramsRes.ok) {
          const err = await paramsRes.json().catch(() => ({}));
          throw new Error(err.message || "გადახდის ინიციალიზაცია ვერ მოხერხდა");
        }
        const signedParams = await paramsRes.json();

        await loadCheckoutScript();

        if (cancelled || !containerRef.current) return;

        // Wait one tick so the empty container is in the DOM and visible
        await new Promise((r) => requestAnimationFrame(() => r(null)));

        const Options = {
          options: {
            methods_disabled: ["banks", "most_popular", "wallets"],
            full_screen: false,
            theme: { type: "light", layout: "plain" },
          },
          params: signedParams,
        };

        if (typeof window.checkout !== "function") {
          throw new Error("Flitt SDK არ ჩაიტვირთა");
        }
        window.checkout("#flitt-checkout-container", Options);
        setLoading(false);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "გადახდის შეცდომა");
        setLoading(false);
        toast({ variant: "destructive", title: "შეცდომა", description: e?.message || "გადახდის SDK ვერ ჩაიტვირთა" });
      }
    })();

    return () => { cancelled = true; };
  }, [open, amount, orderId, description, toast]);

  // Listen for success postMessage from Flitt SDK
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      const data = e.data;
      if (!data) return;
      // Flitt SDK posts events like { type: 'success' } / { event: 'payment_success' }
      if (
        data.type === "flitt-payment-success" ||
        data.type === "success" ||
        data.event === "success" ||
        data.event === "payment_success" ||
        (typeof data === "object" && data.response_status === "success")
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
        className="p-0 overflow-hidden gap-0 max-w-[95vw] sm:max-w-[420px] w-[420px] sm:rounded-2xl bg-white"
        data-testid="dialog-flitt-payment"
      >
        <DialogTitle className="sr-only">ბარათით გადახდა</DialogTitle>
        <DialogDescription className="sr-only">შეიყვანეთ ბარათის მონაცემები</DialogDescription>
        <div className="relative min-h-[420px] max-h-[80vh] overflow-auto">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {error && !loading && (
            <div className="p-6 text-center text-sm text-destructive">{error}</div>
          )}
          <div id="flitt-checkout-container" ref={containerRef} className="p-2" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
