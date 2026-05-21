import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ScrollText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TermsSection } from "@shared/schema";
import RichTextDisplay from "@/components/RichTextDisplay";
import mountainSceneBg from "@assets/ChatGPT_Image_May_21,_2026,_07_23_57_PM_1779377134814.png";

const PAGE_BG_STYLE: React.CSSProperties = {
  backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.55), rgba(2, 6, 23, 0.65)), url(${mountainSceneBg})`,
  backgroundSize: "cover",
  backgroundPosition: "right center",
  backgroundAttachment: "fixed",
};

export default function TermsPage() {
  const [, setLocation] = useLocation();
  const { data: sections = [], isLoading } = useQuery<TermsSection[]>({
    queryKey: ["/api/terms-sections"],
  });

  return (
    <div className="min-h-screen" style={PAGE_BG_STYLE}>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <button
          onClick={() => setLocation("/")}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-emerald-100/80 hover:text-white transition-colors"
          data-testid="button-back-terms"
        >
          <ArrowLeft className="h-4 w-4" />
          მთავარი
        </button>

        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-full bg-emerald-500/20 p-3 ring-1 ring-emerald-400/40 backdrop-blur-md">
            <ScrollText className="h-6 w-6 text-emerald-300" />
          </div>
          <h1 className="text-2xl font-bold text-white [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">წესები და პირობები</h1>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/10 backdrop-blur-md" />
            ))}
          </div>
        ) : sections.length > 0 ? (
          <div className="space-y-6">
            {sections.map((section) => (
              <div key={section.id} className="rounded-2xl border border-white/20 bg-white/25 p-6 shadow-xl backdrop-blur-md">
                <h2 className="mb-3 text-base font-bold text-white [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">{section.title}</h2>
                <RichTextDisplay
                  html={section.content}
                  className="prose prose-sm sm:prose-base max-w-none text-[15px] leading-7 text-emerald-50 [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)] prose-headings:text-white prose-strong:text-white prose-a:text-emerald-300"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/20 bg-white/25 p-8 text-center text-emerald-50 backdrop-blur-md [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">
            წესები და პირობები მალე განახლდება
          </div>
        )}

        <div className="mt-8 text-center">
          <Button variant="outline" onClick={() => setLocation("/")} className="gap-2 bg-white/25 border-white/30 text-white hover:bg-white/35 hover:text-white backdrop-blur-md">
            <ArrowLeft className="h-4 w-4" />
            მთავარ გვერდზე დაბრუნება
          </Button>
        </div>
      </div>
    </div>
  );
}
