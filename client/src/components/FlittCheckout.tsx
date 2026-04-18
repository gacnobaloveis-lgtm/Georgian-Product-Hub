import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, CreditCard } from "lucide-react";

declare global {
  interface Window {
    fondy: (selectorOrOptions: any, options?: any) => void;
  }
}

const CHECKOUT_JS = "https://pay.fondy.eu/checkout.js";

function loadCheckoutScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window.fondy === "function") { resolve(); return; }
    const existing = document.querySelector(`script[src="${CHECKOUT_JS}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("script error")));
      return;
    }
    const s = document.createElement("script");
    s.src = CHECKOUT_JS;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("checkout.js failed to load"));
    document.head.appendChild(s);
  });
}

interface FlittCheckoutProps {
  open: boolean;
  onClose: () => void;
  amount: number;
  orderId: number;
  description: string;
}

export function FlittCheckout({ open, onClose, amount, orderId, description }: FlittCheckoutProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const didInit = useRef(false);

  useEffect(() => {
    if (!open || didInit.current) return;
    didInit.current = true;
    setStatus("loading");

    (async () => {
      try {
        await loadCheckoutScript();

        const res = await fetch("/api/flitt/embed-params", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ amount, orderId, description }),
        });
        if (!res.ok) throw new Error("embed-params failed");
        const params = await res.json();

        setStatus("ready");

        // Wait for the container div to render
        await new Promise(r => setTimeout(r, 120));

        const el = document.getElementById("flitt-checkout-container");
        if (el && typeof window.fondy === "function") {
          window.fondy("#flitt-checkout-container", {
            options: {
              methods: ["card"],
              methods_disabled: ["banks", "most_popular", "wallets"],
              full_screen: false,
              active_tab: "card",
              theme: { type: "light" },
            },
            params,
          });
        }
      } catch (e) {
        console.error("[FlittCheckout]", e);
        setStatus("error");
      }
    })();
  }, [open, amount, orderId, description]);

  useEffect(() => {
    if (!open) {
      didInit.current = false;
      setStatus("loading");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-muted">
          <DialogTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4 text-primary" />
            ბარათით გადახდა
          </DialogTitle>
        </DialogHeader>

        {status === "loading" && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">გადახდის სისტემა იტვირთება...</p>
          </div>
        )}

        {status === "error" && (
          <div className="py-10 px-6 text-center">
            <p className="text-sm text-destructive">
              გადახდის ფანჯარა ვერ გაიხსნა. გთხოვთ სცადოთ თავიდან.
            </p>
          </div>
        )}

        <div
          id="flitt-checkout-container"
          className={status !== "ready" ? "hidden" : "min-h-[360px]"}
        />
      </DialogContent>
    </Dialog>
  );
}
