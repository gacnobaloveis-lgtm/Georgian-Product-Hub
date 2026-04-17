import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle, ShoppingBag, Home, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LastOrder {
  id: number;
  productId: number;
  productName: string;
  productPrice: string;
  quantity: number;
}

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const [countdown, setCountdown] = useState(10);
  const [lastOrder, setLastOrder] = useState<LastOrder | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);

  const params = new URLSearchParams(window.location.search);
  const payId = params.get("payId") || params.get("transactionId") || "";

  useEffect(() => {
    fetch("/api/orders/my", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((orders: LastOrder[]) => {
        if (orders && orders.length > 0) {
          setLastOrder(orders[orders.length - 1]);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingOrder(false));
  }, []);

  useEffect(() => {
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

        {loadingOrder ? (
          <div className="flex justify-center py-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : lastOrder ? (
          <div
            className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
            onClick={() => setLocation(`/product/${lastOrder.productId}`)}
            data-testid="card-last-order"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-left">
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                  {lastOrder.productName}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {lastOrder.quantity} ც. — ₾{parseFloat(lastOrder.productPrice).toFixed(2)}
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 text-left">
              დააჭირეთ პროდუქტის სანახავად →
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4">
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              შეგიძლიათ თვალყური ადევნოთ შეკვეთის სტატუსს პროფილის გვერდიდან.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {lastOrder && (
            <Button
              onClick={() => setLocation(`/product/${lastOrder.productId}`)}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              data-testid="button-view-product"
            >
              <ShoppingBag className="h-4 w-4" />
              შეძენილი ნივთი
            </Button>
          )}
          <Button
            onClick={() => setLocation("/profile?orders=open")}
            variant={lastOrder ? "outline" : "default"}
            className={`gap-2 ${!lastOrder ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
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
