import { useEffect, useRef, useState } from "react";
import { Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { removeBackground } from "@imgly/background-removal";

type BgType = "transparent" | "white" | "green" | "red" | "blue" | "yellow" | "blur";
type FillColor = "white" | "green" | "red" | "blue" | "yellow";
type Mode = "cutout" | "colorbg" | "original";

const BG_COLORS: Record<FillColor, string> = {
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

const FILL_OPTIONS: { value: FillColor; label: string; swatch: string }[] = [
  { value: "white", label: "თეთრი", swatch: "#ffffff" },
  { value: "green", label: "მწვანე", swatch: "#10b981" },
  { value: "red", label: "წითელი", swatch: "#ef4444" },
  { value: "blue", label: "ლურჯი", swatch: "#3b82f6" },
  { value: "yellow", label: "ყვითელი", swatch: "#facc15" },
];

// Replace the background of `img` with transparency using a flood fill from the
// image borders. Only background-connected pixels close to the border color are
// removed, so the product (including white parts inside it) stays intact.
function removeBgByFlood(img: HTMLImageElement, W: number, H: number, threshold: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const cx = c.getContext("2d")!;
  cx.drawImage(img, 0, 0, W, H);
  const id = cx.getImageData(0, 0, W, H);
  const d = id.data;

  // average the four corners to estimate the background color
  const corners = [0, (W - 1) * 4, (H - 1) * W * 4, ((H - 1) * W + (W - 1)) * 4];
  let br = 0, bg = 0, bb = 0;
  for (const s of corners) { br += d[s]; bg += d[s + 1]; bb += d[s + 2]; }
  br /= 4; bg /= 4; bb /= 4;

  const visited = new Uint8Array(W * H);
  const stack: number[] = [];
  for (let x = 0; x < W; x++) { stack.push(x); stack.push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { stack.push(y * W); stack.push(y * W + (W - 1)); }

  const tol = threshold * threshold * 3;
  while (stack.length) {
    const p = stack.pop()!;
    if (visited[p]) continue;
    visited[p] = 1;
    const i = p * 4;
    const dr = d[i] - br, dg = d[i + 1] - bg, db = d[i + 2] - bb;
    if (dr * dr + dg * dg + db * db > tol) continue;
    d[i + 3] = 0;
    const x = p % W;
    const y = (p / W) | 0;
    if (x > 0) stack.push(p - 1);
    if (x < W - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - W);
    if (y < H - 1) stack.push(p + W);
  }
  cx.putImageData(id, 0, 0);
  return c;
}

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
  const [mode, setMode] = useState<Mode>("cutout");
  const [bgType, setBgType] = useState<BgType>("transparent");
  const [bgBlur, setBgBlur] = useState(15);
  const [opacity, setOpacity] = useState(100);
  const [balance, setBalance] = useState(10);
  const [fillColor, setFillColor] = useState<FillColor>("white");
  const [bgThreshold, setBgThreshold] = useState(45);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const floodCache = useRef<{ key: string; canvas: HTMLCanvasElement } | null>(null);

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
    const baseImg = mode === "cutout" ? cutoutImg : originalImg;
    if (!baseImg || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const maxW = 800;
    const scale = Math.min(1, maxW / baseImg.width);
    const W = Math.round(baseImg.width * scale);
    const H = Math.round(baseImg.height * scale);
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    if (mode === "original") {
      if (originalImg) ctx.drawImage(originalImg, 0, 0, W, H);
      return;
    }

    if (mode === "colorbg") {
      if (!originalImg) return;
      ctx.fillStyle = BG_COLORS[fillColor];
      ctx.fillRect(0, 0, W, H);
      const key = `${W}x${H}:${bgThreshold}`;
      if (!floodCache.current || floodCache.current.key !== key) {
        floodCache.current = { key, canvas: removeBgByFlood(originalImg, W, H, bgThreshold) };
      }
      ctx.globalAlpha = opacity / 100;
      ctx.drawImage(floodCache.current.canvas, 0, 0, W, H);
      ctx.globalAlpha = 1;
      return;
    }

    // mode === "cutout"
    if (!cutoutImg) return;

    if (bgType === "blur" && originalImg) {
      ctx.filter = `blur(${bgBlur}px)`;
      ctx.drawImage(originalImg, 0, 0, W, H);
      ctx.filter = "none";
    } else if (bgType !== "transparent") {
      ctx.fillStyle = BG_COLORS[bgType as FillColor];
      ctx.fillRect(0, 0, W, H);
    }

    const fg = document.createElement("canvas");
    fg.width = W;
    fg.height = H;
    const fgCtx = fg.getContext("2d");
    if (!fgCtx) return;
    fgCtx.drawImage(cutoutImg, 0, 0, W, H);

    const high = (balance / 100) * 255;
    const low = high - 60;
    if (high > low) {
      const imgData = fgCtx.getImageData(0, 0, W, H);
      const d = imgData.data;
      for (let i = 3; i < d.length; i += 4) {
        const a = d[i];
        if (a === 0 || a === 255) continue;
        if (a <= low) d[i] = 0;
        else if (a >= high) d[i] = 255;
        else d[i] = Math.round(((a - low) / (high - low)) * 255);
      }
      fgCtx.putImageData(imgData, 0, 0);
    }

    ctx.globalAlpha = opacity / 100;
    ctx.drawImage(fg, 0, 0, W, H);
    ctx.globalAlpha = 1;
  }, [cutoutImg, originalImg, mode, bgType, bgBlur, opacity, balance, fillColor, bgThreshold]);

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

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setMode("cutout")}
          className={`rounded-md border-2 px-2 py-2 text-xs font-medium transition-colors ${
            mode === "cutout" ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-slate-200 text-slate-600 hover:border-emerald-300"
          }`}
          data-testid="button-mode-cutout"
        >
          ფონმოცილებული
        </button>
        <button
          type="button"
          onClick={() => setMode("colorbg")}
          className={`rounded-md border-2 px-2 py-2 text-xs font-medium transition-colors ${
            mode === "colorbg" ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-slate-200 text-slate-600 hover:border-emerald-300"
          }`}
          data-testid="button-mode-colorbg"
        >
          ფერადი ფონი
        </button>
        <button
          type="button"
          onClick={() => setMode("original")}
          className={`rounded-md border-2 px-2 py-2 text-xs font-medium transition-colors ${
            mode === "original" ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-slate-200 text-slate-600 hover:border-emerald-300"
          }`}
          data-testid="button-mode-original"
        >
          ორიგინალი
        </button>
      </div>

      {mode === "original" && (
        <p className="text-[11px] text-emerald-700/80">
          სურათი ინახება ისე როგორც არის, ფონის მოცილების გარეშე — გამოიყენე როცა ამოჭრა პროდუქტს ჭამს.
        </p>
      )}

      {mode === "colorbg" && (
        <>
          <p className="text-[11px] text-emerald-700/80">
            თეთრი ფონი იცვლება შენ მიერ არჩეული ფერით, პროდუქტი კი ხელუხლებელი რჩება (AI არ ჭამს).
          </p>
          <div className="space-y-2">
            <div className="text-xs font-medium text-emerald-900">ფონის ფერი</div>
            <div className="flex flex-wrap gap-2">
              {FILL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFillColor(opt.value)}
                  className={`flex items-center gap-1.5 rounded-md border-2 px-2.5 py-1.5 text-xs transition-colors ${
                    fillColor === opt.value ? "border-emerald-600 bg-emerald-50" : "border-slate-200 hover:border-emerald-300"
                  }`}
                  data-testid={`button-fill-${opt.value}`}
                >
                  <span className="inline-block h-4 w-4 rounded border border-slate-300" style={{ background: opt.swatch }} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-emerald-900">ფონის მგრძნობელობა</span>
              <span className="text-emerald-800 tabular-nums">{bgThreshold}</span>
            </div>
            <input
              type="range" min={10} max={120} step={5}
              value={bgThreshold}
              onChange={(e) => setBgThreshold(Number(e.target.value))}
              className="w-full accent-emerald-600"
              data-testid="slider-bg-threshold"
            />
            <div className="flex justify-between text-[10px] text-emerald-700/70">
              <span>ნაკლები ფონი იცვლება</span>
              <span>მეტი ფონი იცვლება</span>
            </div>
          </div>
        </>
      )}

      {mode === "cutout" && (
      <>
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
          <span className="font-medium text-emerald-900">ამოჭრის ბალანსი</span>
          <span className="text-emerald-800 tabular-nums">{balance}%</span>
        </div>
        <input
          type="range" min={0} max={100} step={5}
          value={balance}
          onChange={(e) => setBalance(Number(e.target.value))}
          className="w-full accent-emerald-600"
          data-testid="slider-balance"
        />
        <div className="flex justify-between text-[10px] text-emerald-700/70">
          <span>ნაკლები ჭამა (მეტი ნაპირი)</span>
          <span>მეტი ამოჭრა</span>
        </div>
      </div>
      </>
      )}

      {mode !== "original" && (
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
      )}

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
