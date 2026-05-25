import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Coins, AlertCircle, PlayCircle } from "lucide-react";
import { useLocation } from "wouter";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userCredit: number;
  creditNeeded: number;
  videoUrl?: string;
}

function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export function InsufficientCreditDialog({ open, onOpenChange, userCredit, creditNeeded, videoUrl }: Props) {
  const ytId = videoUrl ? getYouTubeId(videoUrl) : null;
  const shortfall = Math.max(0, creditNeeded - userCredit);
  const [location, setLocation] = useLocation();

  const goToGuide = () => {
    onOpenChange(false);
    setTimeout(() => {
      if (window.location.pathname === "/") {
        window.dispatchEvent(new Event("open-credit-guide"));
        window.scrollTo({ top: 0, behavior: "smooth" });
        setTimeout(() => window.dispatchEvent(new Event("open-credit-guide")), 400);
      } else {
        setLocation("/?guide=credit");
      }
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg border-white/20 text-white"
        data-testid="dialog-insufficient-credit"
        style={{
          background: "rgba(15, 23, 42, 0.55)",
          backdropFilter: "blur(24px) saturate(160%)",
          WebkitBackdropFilter: "blur(24px) saturate(160%)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertCircle className="h-6 w-6 text-amber-600" />
            თქვენ არ გაქვთ საკმარისი კრედიტი
          </DialogTitle>
          <DialogDescription className="sr-only">საკმარისი კრედიტი არ არის ამ შეკვეთის გასაკეთებლად</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border border-white/20 bg-white/10 backdrop-blur-md p-3 space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-white/85">თქვენი კრედიტი:</span>
              <span className="font-bold text-amber-300 inline-flex items-center gap-1">
                <Coins className="h-4 w-4" />
                {userCredit.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/85">საჭიროა:</span>
              <span className="font-bold text-amber-300 inline-flex items-center gap-1">
                <Coins className="h-4 w-4" />
                {creditNeeded.toFixed(2)}
              </span>
            </div>
            <div className="border-t border-white/15 pt-1.5 flex items-center justify-between">
              <span className="font-semibold text-red-300">გაკლიათ:</span>
              <span className="font-bold text-red-300 inline-flex items-center gap-1">
                <Coins className="h-4 w-4" />
                {shortfall.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-white/20 bg-white/10 backdrop-blur-md p-3 space-y-2">
            <p className="text-sm font-semibold text-white flex items-center gap-1.5">
              <PlayCircle className="h-5 w-5 text-sky-300" />
              როგორ დავაგროვო კრედიტი?
            </p>
            {ytId ? (
              <div className="relative w-full overflow-hidden rounded-md" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  src={`https://www.youtube.com/embed/${ytId}?rel=0&playsinline=1`}
                  title="როგორ დავაგროვო კრედიტი"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="absolute inset-0 h-full w-full"
                  data-testid="iframe-credit-tutorial"
                />
              </div>
            ) : (
              <p className="text-sm text-white/85">
                ნახეთ ვიდეო გაკვეთილი ჩვენი მთავარ გვერდზე — როგორ მოიწვიოთ მეგობრები და მიიღოთ კრედიტი ყოველ ახალ შენაძენზე.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={goToGuide}
            className="w-full rounded-xl bg-green-600 px-4 py-3 text-base font-bold text-white shadow-md hover:bg-green-700 transition-colors"
            data-testid="button-view-credit-guide"
          >
            დეტალური გზამკვლევი →
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
