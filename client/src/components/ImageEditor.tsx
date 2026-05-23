import { useEffect, useRef, useState } from "react";
import { Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { removeBackground } from "@imgly/background-removal";

type BgType = "transparent" | "white" | "green" | "red" | "blue" | "yellow" | "blur";

const BG_COLORS: Record<Exclude<BgType, "transparent" | "blur">, string> = {
  white: "#ffffff",
  green: "#10b981",
  red: "#ef4444",
  blue: "#3b82f6",
  yellow: "#facc15",
};

const BG_OPTIONS: { value: BgType; label: string; swatch: string }[] = [
  { value: "transparent", label: "გამჭვირვალე", swatch: "transparent" },
  { value: "blur", label: "ბუნდოვანი", swatch: "linear-gradient(135deg,#a3a3a3,#e5e5e5)" },
  { value: "white", label: "თეთრი", swatch: "#ffffff" },
  { value: "green", label: "მწვანე", swatch: "#10b981" },
  { value: "red", label: "წითელი", swatch: "#ef4444" },
  { value: "blue", label: "ლურჯი", swatch: "#3b82f6" },
  { value: "yellow", label: "ყვითელი", swatch: "#facc15" },
];

interface Props {
  file: File;
  onSave: (blob: Blob) => void;
  onCancel: () => void;
}

export function ImageEditor({ file, onSave, onCancel }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState("ფონის მოცილება მიმდინარეობს...");
  const [originalImg, setOriginalImg] = useState<HTMLImageElement | null>(null);
  const [cutoutImg, setCutoutImg] = useState<HTMLImageElement | null>(null);
  const [bgType, setBgType] = useState<BgType>("transparent");
  const [bgBlur, setBgBlur] = useState(15);
  const [opacity, setOpacity] = useState(100);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadingMsg("სურათი იტვირთება...");
        const origUrl = URL.createObjectURL(file);
        const orig = new Image();
        orig.src = origUrl;
        await new Promise((r, e) => { orig.onload = r; orig.onerror = e; });
        if (cancelled) return;
        setOriginalImg(orig);

        let cutBlob: Blob;
        try {
          setLoadingMsg("ფონის მოცილება ბრაუზერში...");
          cutBlob = await removeBackground(file, {
            progress: (key, current, total) => {
              if (cancelled) return;
              if (key.startsWith("fetch")) {
                const pct = total ? Math.round((current / total) * 100) : 0;
                setLoadingMsg(`მოდელის ჩამოტვირთვა... ${pct}%`);
              } else if (key.startsWith("compute")) {
                setLoadingMsg("ფონის ამოჭრა...");
              }
            },
          });
        } catch (clientErr) {
          console.warn("Client bg removal failed, trying server", clientErr);
          if (cancelled) return;
          setLoadingMsg("სერვერზე ვცდი...");
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch(api.media.cutout.path, { method: "POST", body: fd, credentials: "include" });
          if (!res.ok) throw new Error("server cutout failed");
          cutBlob = await res.blob();
        }

        if (cancelled) return;
        const cutUrl = URL.createObjectURL(cutBlob);
        const cut = new Image();
        cut.src = cutUrl;
        await new Promise((r, e) => { cut.onload = r; cut.onerror = e; });
        if (cancelled) return;
        setCutoutImg(cut);
        setLoading(false);
      } catch (err) {
        console.error(err);
        if (cancelled) return;
        toast({ title: "ფონის მოცილება ვერ მოხერხდა", description: "გრძელდება ორიგინალი სურათით" });
        onSave(file);
      }
    })();
    return () => { cancelled = true; };
  }, [file]);

  useEffect(() => {
    if (!cutoutImg || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const maxW = 800;
    const scale = Math.min(1, maxW / cutoutImg.width);
    const W = Math.round(cutoutImg.width * scale);
    const H = Math.round(cutoutImg.height * scale);
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    if (bgType === "blur" && originalImg) {
      ctx.filter = `blur(${bgBlur}px)`;
      ctx.drawImage(originalImg, 0, 0, W, H);
      ctx.filter = "none";
    } else if (bgType !== "transparent") {
      ctx.fillStyle = BG_COLORS[bgType as keyof typeof BG_COLORS];
      ctx.fillRect(0, 0, W, H);
    }

    ctx.globalAlpha = opacity / 100;
    ctx.drawImage(cutoutImg, 0, 0, W, H);
    ctx.globalAlpha = 1;
  }, [cutoutImg, originalImg, bgType, bgBlur, opacity]);

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) onSave(blob);
    }, "image/png");
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-emerald-300 bg-white p-8 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
        <p className="mt-3 text-sm text-emerald-900" data-testid="text-loading">{loadingMsg}</p>
        <p className="text-xs text-emerald-700/70">პირველად ~30-60 წამი (მოდელის ჩამოტვირთვა), შემდეგ ~5-10 წამი</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-emerald-300 bg-white p-3 space-y-3" data-testid="image-editor">
      <div
        className="relative w-full rounded-md overflow-hidden border border-slate-200"
        style={{
          backgroundImage:
            "linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%)",
          backgroundSize: "16px 16px",
          backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
        }}
      >
        <canvas ref={canvasRef} className="w-full h-auto block" data-testid="canvas-preview" />
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-emerald-900">ფონი</div>
        <div className="flex flex-wrap gap-2">
          {BG_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setBgType(opt.value)}
              className={`flex items-center gap-1.5 rounded-md border-2 px-2.5 py-1.5 text-xs transition-colors ${
                bgType === opt.value ? "border-emerald-600 bg-emerald-50" : "border-slate-200 hover:border-emerald-300"
              }`}
              data-testid={`button-bg-${opt.value}`}
            >
              <span
                className="inline-block h-4 w-4 rounded border border-slate-300"
                style={{
                  background: opt.value === "transparent"
                    ? "linear-gradient(45deg,#e5e7eb 25%,transparent 25%,transparent 75%,#e5e7eb 75%) 0 0/8px 8px,linear-gradient(45deg,#e5e7eb 25%,#fff 25%,#fff 75%,#e5e7eb 75%) 4px 4px/8px 8px"
                    : opt.swatch,
                }}
              />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {bgType === "blur" && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-emerald-900">ფონის ბლური</span>
            <span className="text-emerald-800 tabular-nums">{bgBlur}px</span>
          </div>
          <input
            type="range" min={0} max={40} step={1}
            value={bgBlur}
            onChange={(e) => setBgBlur(Number(e.target.value))}
            className="w-full accent-emerald-600"
            data-testid="slider-bg-blur"
          />
        </div>
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-emerald-900">პროდუქტის გამჭვირვალობა</span>
          <span className="text-emerald-800 tabular-nums">{opacity}%</span>
        </div>
        <input
          type="range" min={20} max={100} step={5}
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          className="w-full accent-emerald-600"
          data-testid="slider-fg-opacity"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1" data-testid="button-cancel-edit">
          <X className="mr-1 h-4 w-4" /> გადააგდე
        </Button>
        <Button type="button" onClick={handleSave} className="flex-1 bg-emerald-600 hover:bg-emerald-700" data-testid="button-save-edit">
          <Check className="mr-1 h-4 w-4" /> შენახვა
        </Button>
      </div>
    </div>
  );
}
