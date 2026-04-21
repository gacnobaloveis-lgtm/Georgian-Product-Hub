import { useLocation } from "wouter";
import { XCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentFail() {
  const [, setLocation] = useLocation();

  const params = new URLSearchParams(window.location.search);
  const reason = params.get("reason") || "";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-6">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            გადახდა ვერ მოხერხდა
          </h1>
          <p className="text-muted-foreground">
            სამწუხაროდ, გადახდა ჩაიშალა. გთხოვთ სცადოთ თავიდან.
          </p>
          {reason && (
            <p className="text-xs text-muted-foreground mt-1">
              მიზეზი: <span className="text-foreground">{reason}</span>
            </p>
          )}
        </div>

        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">
            თუ პრობლემა გრძელდება, დაგვიკავშირდით: <strong>595 00 00 00</strong>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => window.history.back()}
            className="gap-2 bg-red-600 hover:bg-red-700"
            data-testid="button-retry-payment"
          >
            <RefreshCw className="h-4 w-4" />
            თავიდან ცდა
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/")}
            className="gap-2"
            data-testid="button-go-home-fail"
          >
            <Home className="h-4 w-4" />
            მთავარი
          </Button>
        </div>
      </div>
    </div>
  );
}
