import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    checkout?: (container: string | HTMLElement, options: any) => any;
  }
}

const FLITT_SCRIPT_URL = "https://pay.flitt.com/static/checkout/v2/checkout.js";

function loadFlittScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window.checkout === "function") return resolve();
    const existing = document.querySelector(`script[src="${FLITT_SCRIPT_URL}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (typeof window.checkout === "function") return resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("script load failed")), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = FLITT_SCRIPT_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("script load failed"));
    document.head.appendChild(s);
  });
}

interface FlittPaymentDialogProps {
  open: boolean;
  amount: number; // GEL
  orderId: number | string;
  description: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function FlittPaymentDialog({ open, amount, orderId, description, onClose, onSuccess }: FlittPaymentDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const widgetRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      widgetRef.current = null;
      setLoading(true);
      setError(null);
      if (containerRef.current) containerRef.current.innerHTML = "";
      return;
    }
    if (initializedRef.current) return;
    initializedRef.current = true;
    setLoading(true);
    setError(null);

    let cancelled = false;
    (async () => {
      try {
        // 1. Get checkout token from our server (uses Flitt SDK)
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
        const { payUrl } = await res.json();
        if (cancelled) return;
        if (!payUrl) throw new Error("გადახდის ბმული ვერ მოვიპოვეთ");

        // Extract token from checkout URL (Flitt embeds it as ?token=...)
        let token: string | null = null;
        try {
          const u = new URL(payUrl);
          token = u.searchParams.get("token");
        } catch {
          token = null;
        }
        if (!token) throw new Error("ტოკენის მიღება ვერ მოხერხდა");

        // 2. Load Flitt inline checkout SDK
        await loadFlittScript();
        if (cancelled || typeof window.checkout !== "function") return;

        // Wait for container to be in DOM (Radix portal)
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        if (cancelled || !containerRef.current) return;

        // 3. Mount inline checkout widget with custom theme
        const widget = window.checkout(containerRef.current, {
          options: {
            methods: ["card"],
            methods_disabled: [],
            card_icons: ["mastercard", "visa"],
            full_screen: false,
            show_pay_button: true,
            show_title: false,
            show_link: false,
            show_email: false,
            theme: { type: "light", preset: "reset" },
          },
          params: { token },
          css_variable: {
            main: "#7d8ff8",
            card_bg: "#353535",
            card_shadow: "#9ADBE8",
          },
        });
        widgetRef.current = widget;
        setLoading(false);

        if (widget && typeof widget.$on === "function") {
          widget.$on("success", () => { if (!cancelled) onSuccess(); });
          widget.$on("response", (data: any) => {
            if (cancelled) return;
            if (data?.response_status === "success" || data?.order_status === "approved") {
              onSuccess();
            } else if (data?.response_status === "failure" || data?.order_status === "declined") {
              const msg = data?.error_message || "გადახდა ვერ მოხერხდა";
              toast({ variant: "destructive", title: "შეცდომა", description: msg });
            }
          });
          widget.$on("fail", (data: any) => {
            if (cancelled) return;
            const msg = data?.error_message || data?.message || "გადახდა ვერ მოხერხდა";
            toast({ variant: "destructive", title: "შეცდომა", description: msg });
          });
        }
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "გადახდის შეცდომა");
        setLoading(false);
        toast({ variant: "destructive", title: "შეცდომა", description: e?.message || "გადახდა ვერ დაიწყო" });
      }
    })();
    return () => { cancelled = true; };
  }, [open, amount, orderId, description, toast, onSuccess]);

  // Cross-origin success fallback (postMessage from /payment/success)
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
        className="p-0 overflow-hidden gap-0 max-w-[95vw] sm:max-w-[440px] w-[440px] sm:rounded-2xl bg-white"
        data-testid="dialog-flitt-payment"
      >
        <DialogTitle className="sr-only">ბარათით გადახდა</DialogTitle>
        <DialogDescription className="sr-only">შეიყვანეთ ბარათის მონაცემები</DialogDescription>
        <div className="relative w-full min-h-[480px] p-3 sm:p-4">
          {loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {error && (
            <div className="p-6 text-center text-sm text-destructive" data-testid="text-flitt-error">
              {error}
            </div>
          )}
          <div
            id="flitt-checkout-container"
            ref={containerRef}
            className="w-full"
            data-testid="container-flitt-checkout"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
