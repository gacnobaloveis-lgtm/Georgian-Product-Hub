import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle, ShoppingBag, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BonusCelebration } from "@/components/BonusCelebration";
import mountainSceneBg from "@assets/mountain-scene-bg.webp";

const PAGE_BG_STYLE: React.CSSProperties = {
  backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.55), rgba(2, 6, 23, 0.65)), url(${mountainSceneBg})`,
  backgroundSize: "cover",
  backgroundPosition: "right center",
  backgroundAttachment: typeof window !== "undefined" && window.innerWidth >= 768 ? "fixed" : "scroll",
};

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const [countdown, setCountdown] = useState(10);
  const [bonusPoints, setBonusPoints] = useState(0);
  const [bonusOpen, setBonusOpen] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const payId = params.get("payId") || params.get("transactionId") || "";
  const oid = params.get("oid") || "";

  useEffect(() => {
    // Authoritatively confirm the payment with the server (which asks Flitt's API)
    // so the order is marked paid even if Flitt's server callback is delayed.
    if (!oid) return;
    fetch("/api/flitt/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ orderId: oid }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const bonus = Number(data?.bonusAwarded || 0);
        // Show the celebration once per order (guard against page revisits).
        const seenKey = `bonus_shown_${oid}`;
        if (bonus > 0 && !sessionStorage.getItem(seenKey)) {
          sessionStorage.setItem(seenKey, "1");
          setBonusPoints(bonus);
          setBonusOpen(true);
        }
      })
      .catch(() => {});
  }, [oid]);

  useEffect(() => {
    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({ type: "flitt-payment-success", payId }, window.location.origin);
        return;
      } catch {
        // fall through
      }
    }
    if (bonusOpen) return; // pause the auto-redirect while the bonus popup is open
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          setLocation("/profile?orders=open");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [setLocation, payId, bonusOpen]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={PAGE_BG_STYLE}>
      <BonusCelebration
        points={bonusPoints}
        open={bonusOpen}
        onClose={() => setBonusOpen(false)}
      />
      <div className="max-w-md w-full text-center space-y-6 rounded-2xl border border-white/20 bg-white/25 backdrop-blur-md shadow-2xl p-6 sm:p-8">
        <div className="flex justify-center">
          <div className="rounded-full bg-emerald-500/25 ring-1 ring-emerald-400/50 p-6 backdrop-blur-md">
            <CheckCircle className="h-16 w-16 text-emerald-300 drop-shadow" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">
            გადახდა წარმატებულია!
          </h1>
          <p className="text-emerald-50 [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">
            თქვენი შეკვეთა მიღებულია. მადლობა შეძენისთვის!
          </p>
          {payId && (
            <p className="text-xs text-emerald-100/80 mt-1">
              გადახდის ID: <span className="font-mono text-white">{payId}</span>
            </p>
          )}
        </div>

        <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 p-4 backdrop-blur-md">
          <p className="text-sm text-emerald-100 [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">
            შეგიძლიათ ნახოთ ყველა შენაძენი — „ჩემი შეკვეთები" განყოფილებაში.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => setLocation("/profile?orders=open")}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            data-testid="button-view-orders"
          >
            <ShoppingBag className="h-4 w-4" />
            ჩემი შეკვეთები
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/")}
            className="gap-2 bg-white/25 border-white/30 text-white hover:bg-white/35 hover:text-white backdrop-blur-md"
            data-testid="button-go-home-success"
          >
            <Home className="h-4 w-4" />
            მთავარი
          </Button>
        </div>

        <p className="text-xs text-emerald-100/80">
          ავტომატურად გადახვალთ შეკვეთებზე {countdown} წამში...
        </p>
      </div>
    </div>
  );
}
