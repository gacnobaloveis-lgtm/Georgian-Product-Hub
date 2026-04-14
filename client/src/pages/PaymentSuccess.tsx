import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle, ShoppingBag, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const [countdown, setCountdown] = useState(10);

  const params = new URLSearchParams(window.location.search);
  const payId = params.get("payId") || params.get("transactionId") || "";

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          setLocation("/profile");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-6">
            <CheckCircle className="h-16 w-16 text-emerald-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            გადახდა წარმატებულია!
          </h1>
          <p className="text-muted-foreground">
            თქვენი შეკვეთა მიღებულია. მადლობა შეძენისთვის!
          </p>
          {payId && (
            <p className="text-xs text-muted-foreground mt-1">
              გადახდის ID: <span className="font-mono text-foreground">{payId}</span>
            </p>
          )}
        </div>

        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4">
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            შეგიძლიათ თვალყური ადევნოთ შეკვეთის სტატუსს პროფილის გვერდიდან.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => setLocation("/profile")}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            data-testid="button-view-orders"
          >
            <ShoppingBag className="h-4 w-4" />
            ჩემი შეკვეთები
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/")}
            className="gap-2"
            data-testid="button-go-home-success"
          >
            <Home className="h-4 w-4" />
            მთავარი
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          ავტომატურად გადახვალთ პროფილზე {countdown} წამში...
        </p>
      </div>
    </div>
  );
}
