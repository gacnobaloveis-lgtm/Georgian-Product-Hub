import { useLocation } from "wouter";
import { Fish, ArrowLeft, ShieldCheck, Truck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import mountainSceneBg from "@assets/ChatGPT_Image_May_21,_2026,_07_23_57_PM_1779377134814.png";

const PAGE_BG_STYLE: React.CSSProperties = {
  backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.55), rgba(2, 6, 23, 0.65)), url(${mountainSceneBg})`,
  backgroundSize: "cover",
  backgroundPosition: "right center",
  backgroundAttachment: "fixed",
};

export default function AboutPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen" style={PAGE_BG_STYLE}>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <button
          onClick={() => setLocation("/")}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-emerald-100/80 hover:text-white transition-colors"
          data-testid="button-back-about"
        >
          <ArrowLeft className="h-4 w-4" />
          მთავარი
        </button>

        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-full bg-emerald-500/20 p-3 ring-1 ring-emerald-400/40 backdrop-blur-md">
            <Fish className="h-6 w-6 text-emerald-300" />
          </div>
          <h1 className="text-2xl font-bold text-white [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">ჩვენს შესახებ</h1>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-white/20 bg-white/25 p-6 shadow-xl backdrop-blur-md">
            <h2 className="mb-3 text-base font-bold text-white [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">ვინ ვართ</h2>
            <p className="text-[15px] leading-7 text-emerald-50 [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">
              spiningebi.ge ონლაინ მაღაზია. ჩვენ ვთავაზობთ მეთევზეებს საუკეთესო სპინინგის ჯოხებს, კოჭებს, წნულებს, ვობლერებს და სხვა სათევზაო აქსესუარებს საუკეთესო ფასებად.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/20 bg-white/25 p-5 text-center shadow-xl backdrop-blur-md">
              <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-emerald-300 drop-shadow" />
              <h3 className="font-bold text-white mb-1 [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">ხარისხი</h3>
              <p className="text-sm text-emerald-50 [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">მაღალი უკვე გამოცდილი სპინინგისტებისგან</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/25 p-5 text-center shadow-xl backdrop-blur-md">
              <Truck className="mx-auto mb-3 h-8 w-8 text-sky-300 drop-shadow" />
              <h3 className="font-bold text-white mb-1 [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">მიწოდება</h3>
              <p className="text-sm text-emerald-50 [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">მიტანა საქართველოს ყველა კუთხეში</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/25 p-5 text-center shadow-xl backdrop-blur-md">
              <Star className="mx-auto mb-3 h-8 w-8 text-amber-300 drop-shadow" />
              <h3 className="font-bold text-white mb-1 [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">გამოცდილება</h3>
              <p className="text-sm text-emerald-50 [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">წლების გამოცდილება სათევზაო ინდუსტრიაში</p>
            </div>
          </div>

        </div>

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
