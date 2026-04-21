import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ScrollText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TermsSection } from "@shared/schema";

export default function TermsPage() {
  const [, setLocation] = useLocation();
  const { data: sections = [], isLoading } = useQuery<TermsSection[]>({
    queryKey: ["/api/terms-sections"],
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <button
          onClick={() => setLocation("/")}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-back-terms"
        >
          <ArrowLeft className="h-4 w-4" />
          მთავარი
        </button>

        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-3">
            <ScrollText className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">წესები და პირობები</h1>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : sections.length > 0 ? (
          <div className="space-y-6">
            {sections.map((section) => (
              <div key={section.id} className="rounded-xl border border-border bg-card p-6">
                <h2 className="mb-3 text-base font-bold text-foreground">{section.title}</h2>
                <p className="text-[15px] leading-7 text-muted-foreground whitespace-pre-wrap">{section.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-muted/30 p-8 text-center text-muted-foreground">
            წესები და პირობები მალე განახლდება
          </div>
        )}

        <div className="mt-8 text-center">
          <Button variant="outline" onClick={() => setLocation("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            მთავარ გვერდზე დაბრუნება
          </Button>
        </div>
      </div>
    </div>
  );
}
