import { AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import mountainSceneBg from "@assets/mountain-scene-bg.webp";

const PAGE_BG_STYLE: React.CSSProperties = {
  backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.55), rgba(2, 6, 23, 0.65)), url(${mountainSceneBg})`,
  backgroundSize: "cover",
  backgroundPosition: "right center",
  backgroundAttachment: typeof window !== "undefined" && window.innerWidth >= 768 ? "fixed" : "scroll",
};

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4" style={PAGE_BG_STYLE}>
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/25 backdrop-blur-md shadow-2xl p-6">
        <div className="flex mb-4 gap-2 items-center">
          <AlertCircle className="h-8 w-8 text-red-300 drop-shadow" />
          <h1 className="text-2xl font-bold text-white [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">გვერდი ვერ მოიძებნა</h1>
        </div>

        <p className="mt-4 text-sm text-emerald-50 [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">
          მოთხოვნილი გვერდი არ არსებობს.
        </p>

        <div className="mt-4">
          <Link href="/">
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-300 hover:text-emerald-200 [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]" data-testid="link-back-home">
              <ArrowLeft className="h-4 w-4" />
              მთავარზე დაბრუნება
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
