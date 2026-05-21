import { useLocation } from "wouter";
import { XCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import mountainSceneBg from "@assets/mountain-scene-bg.webp";

const PAGE_BG_STYLE: React.CSSProperties = {
  backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.55), rgba(2, 6, 23, 0.65)), url(${mountainSceneBg})`,
  backgroundSize: "cover",
  backgroundPosition: "right center",
  backgroundAttachment: typeof window !== "undefined" && window.innerWidth >= 768 ? "fixed" : "scroll",
};

export default function PaymentFail() {
  const [, setLocation] = useLocation();

  const params = new URLSearchParams(window.location.search);
  const reason = params.get("reason") || "";

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={PAGE_BG_STYLE}>
      <div className="max-w-md w-full text-center space-y-6 rounded-2xl border border-white/20 bg-white/25 backdrop-blur-md shadow-2xl p-6 sm:p-8">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-500/25 ring-1 ring-red-400/50 p-6 backdrop-blur-md">
            <XCircle className="h-16 w-16 text-red-300 drop-shadow" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">
            გადახდა ვერ მოხერხდა
          </h1>
          <p className="text-emerald-50 [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">
            სამწუხაროდ, გადახდა ჩაიშალა. გთხოვთ სცადოთ თავიდან.
          </p>
          {reason && (
            <p className="text-xs text-emerald-100/80 mt-1">
              მიზეზი: <span className="text-white">{reason}</span>
            </p>
          )}
        </div>

        <div className="rounded-xl border border-red-400/40 bg-red-500/15 p-4 backdrop-blur-md">
          <p className="text-sm text-red-100 [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">
            თუ პრობლემა გრძელდება, დაგვიკავშირდით: <strong className="text-white">595 00 00 00</strong>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => window.history.back()}
            className="gap-2 bg-red-600 hover:bg-red-700 text-white"
            data-testid="button-retry-payment"
          >
            <RefreshCw className="h-4 w-4" />
            თავიდან ცდა
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/")}
            className="gap-2 bg-white/25 border-white/30 text-white hover:bg-white/35 hover:text-white backdrop-blur-md"
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
