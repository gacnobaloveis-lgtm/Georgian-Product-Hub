import { useState } from "react";
import { GlassPanel } from "@/components/GlassPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Type, Palette } from "lucide-react";

import logo1 from "@assets/fisherman_transparent.png";
import logo2 from "@assets/image_1771887558144.png";
import logo3 from "@assets/image_1771887805060.png";
import logo4 from "@assets/image_1771887952843.png";
import logo5 from "@assets/image_1771888120512.png";
import logo6 from "@assets/image_1771888304367.png";
import logo7 from "@assets/image_1771888431502.png";
import logo8 from "@assets/image_1772362338173.png";
import logo9 from "@assets/image_1771888285281.png";
import logo10 from "@assets/image_1771882949475.png";

const LOGOS = [
  { src: logo1, label: "მეთევზე" },
  { src: logo2, label: "ვობლერი" },
  { src: logo3, label: "სპინინგის ჯოხი" },
  { src: logo4, label: "კოჭი" },
  { src: logo5, label: "წნული" },
  { src: logo6, label: "ყანყალი" },
  { src: logo7, label: "ტრიალი" },
  { src: logo8, label: "ჟილეტი" },
  { src: logo9, label: "თევზი" },
  { src: logo10, label: "ჰუკი" },
];

const FONT_OPTIONS = [
  { value: "FiraGO", label: "FiraGO (ქართული)" },
  { value: "Georgia", label: "Georgia (სერიფი)" },
  { value: "Arial Black", label: "Arial Black (თამამი)" },
  { value: "Impact", label: "Impact" },
  { value: "Courier New", label: "Courier New (მონო)" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Verdana", label: "Verdana" },
  { value: "Trebuchet MS", label: "Trebuchet MS" },
  { value: "Lucida Console", label: "Lucida Console" },
  { value: "Comic Sans MS", label: "Comic Sans MS" },
];

const PRESET_STYLES = [
  { label: "ოქროსფერი", color: "#FFD700", bg: "#1a1a2e", shadow: "2px 2px 4px rgba(255,215,0,0.5)", stroke: "" },
  { label: "ნეონ ლურჯი", color: "#00f0ff", bg: "#0d0d1a", shadow: "0 0 10px #00f0ff, 0 0 20px #00f0ff", stroke: "" },
  { label: "ნეონ მწვანე", color: "#39ff14", bg: "#0d1a0d", shadow: "0 0 10px #39ff14, 0 0 20px #39ff14", stroke: "" },
  { label: "წითელი ცეცხლი", color: "#ff4500", bg: "#1a0d0d", shadow: "2px 2px 8px rgba(255,69,0,0.6)", stroke: "" },
  { label: "თეთრი კლასიკა", color: "#ffffff", bg: "#2d2d44", shadow: "1px 1px 3px rgba(0,0,0,0.5)", stroke: "" },
  { label: "იასამნისფერი", color: "#9b59b6", bg: "#1a0d2e", shadow: "0 0 12px rgba(155,89,182,0.6)", stroke: "" },
  { label: "ვარდისფერი", color: "#ff69b4", bg: "#1a0d14", shadow: "0 0 10px rgba(255,105,180,0.5)", stroke: "" },
  { label: "ზღვისფერი", color: "#1abc9c", bg: "#0d1a1a", shadow: "0 0 10px rgba(26,188,156,0.5)", stroke: "" },
  { label: "კონტურიანი", color: "transparent", bg: "#1a1a2e", shadow: "none", stroke: "2px white" },
  { label: "გრადიენტი", color: "", bg: "linear-gradient(135deg, #1a1a2e, #2d1a44)", shadow: "none", stroke: "" },
];

export function VisualSection() {
  const [selectedLogo, setSelectedLogo] = useState<number | null>(null);
  const [text, setText] = useState("spiningebi.ge");
  const [font, setFont] = useState("FiraGO");
  const [fontSize, setFontSize] = useState("48");
  const [textColor, setTextColor] = useState("#FFD700");
  const [bgColor, setBgColor] = useState("#1a1a2e");
  const [textShadow, setTextShadow] = useState("2px 2px 4px rgba(255,215,0,0.5)");
  const [textStroke, setTextStroke] = useState("");
  const [isBold, setIsBold] = useState(true);
  const [isItalic, setIsItalic] = useState(false);
  const [customText, setCustomText] = useState("");

  function applyPreset(idx: number) {
    const p = PRESET_STYLES[idx];
    setTextColor(p.color || "#FFD700");
    setBgColor(p.bg);
    setTextShadow(p.shadow);
    setTextStroke(p.stroke);
  }

  function downloadCanvas() {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 800;
    canvas.height = 400;

    if (bgColor.startsWith("linear")) {
      const grd = ctx.createLinearGradient(0, 0, 800, 400);
      grd.addColorStop(0, "#1a1a2e");
      grd.addColorStop(1, "#2d1a44");
      ctx.fillStyle = grd;
    } else {
      ctx.fillStyle = bgColor;
    }
    ctx.fillRect(0, 0, 800, 400);

    const size = parseInt(fontSize) || 48;
    ctx.font = `${isBold ? "bold " : ""}${isItalic ? "italic " : ""}${size}px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (textStroke) {
      ctx.strokeStyle = textStroke.split(" ").pop() || "white";
      ctx.lineWidth = parseInt(textStroke) || 2;
      ctx.strokeText(text, 400, 200);
    }

    if (textColor !== "transparent") {
      ctx.fillStyle = textColor;
      ctx.fillText(text, 400, 200);
    }

    if (customText) {
      const subSize = size * 0.4;
      ctx.font = `${isBold ? "bold " : ""}${isItalic ? "italic " : ""}${subSize}px ${font}`;
      
      if (textStroke) {
        ctx.strokeStyle = textStroke.split(" ").pop() || "white";
        ctx.lineWidth = Math.max(1, (parseInt(textStroke) || 2) * 0.6);
        ctx.strokeText(customText, 400, 200 + size * 0.7);
      }
      
      ctx.fillStyle = textColor !== "transparent" ? textColor : "white";
      ctx.fillText(customText, 400, 200 + size * 0.7);
    }

    const link = document.createElement("a");
    link.download = "spiningebi-visual.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="space-y-6">
      <GlassPanel>
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2" data-testid="text-visual-logos-title">
          <Palette className="h-5 w-5 text-primary" />
          თევზაობის ლოგოები
        </h3>
        <div className="grid grid-cols-5 sm:grid-cols-5 gap-3">
          {LOGOS.map((logo, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedLogo(selectedLogo === idx ? null : idx)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition-all hover:shadow-md ${selectedLogo === idx ? "border-primary bg-primary/10 shadow-lg" : "border-muted bg-card hover:border-primary/30"}`}
              data-testid={`button-logo-${idx}`}
            >
              <img src={logo.src} alt={logo.label} className="h-12 w-12 sm:h-16 sm:w-16 object-contain" />
              <span className="text-[10px] sm:text-xs text-muted-foreground text-center leading-tight">{logo.label}</span>
            </button>
          ))}
        </div>

        {selectedLogo !== null && (
          <div className="mt-4 flex justify-center">
            <div className="rounded-2xl border-2 border-primary/30 bg-card p-6 shadow-xl">
              <img src={LOGOS[selectedLogo].src} alt={LOGOS[selectedLogo].label} className="h-32 w-32 sm:h-48 sm:w-48 object-contain" />
              <p className="text-center text-sm font-medium mt-2">{LOGOS[selectedLogo].label}</p>
            </div>
          </div>
        )}
      </GlassPanel>

      <GlassPanel>
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2" data-testid="text-visual-text-title">
          <Type className="h-5 w-5 text-primary" />
          ტექსტის დიზაინერი
        </h3>

        <div className="space-y-4">
          <div
            className="rounded-xl p-6 sm:p-10 flex flex-col items-center justify-center min-h-[160px] sm:min-h-[200px] transition-all"
            style={{ background: bgColor.startsWith("linear") ? bgColor : bgColor }}
            data-testid="visual-preview"
          >
            <p
              style={{
                fontFamily: font,
                fontSize: `${fontSize}px`,
                color: textColor !== "transparent" ? textColor : undefined,
                textShadow: textShadow !== "none" ? textShadow : undefined,
                fontWeight: isBold ? "bold" : "normal",
                fontStyle: isItalic ? "italic" : "normal",
                WebkitTextStroke: textStroke || undefined,
                lineHeight: 1.2,
              }}
              className="text-center break-all"
              data-testid="text-visual-main"
            >
              {text}
            </p>
            {customText && (
              <p
                style={{
                  fontFamily: font,
                  fontSize: `${(parseInt(fontSize) || 48) * 0.4}px`,
                  color: textColor !== "transparent" ? textColor : "white",
                  textShadow: textShadow !== "none" ? textShadow : undefined,
                  fontWeight: isBold ? "bold" : "normal",
                  fontStyle: isItalic ? "italic" : "normal",
                  WebkitTextStroke: textStroke || undefined,
                }}
                className="text-center mt-1"
                data-testid="text-visual-subtitle"
              >
                {customText}
              </p>
            )}
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-5 gap-2">
            {PRESET_STYLES.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => applyPreset(idx)}
                className="rounded-lg border border-muted px-2 py-1.5 text-[10px] sm:text-xs font-medium transition-all hover:border-primary/50 hover:bg-primary/5"
                style={{ backgroundColor: preset.bg.startsWith("linear") ? "#1a1a2e" : preset.bg, color: preset.color || "#FFD700" }}
                data-testid={`button-preset-${idx}`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">მთავარი ტექსტი</label>
              <Input
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="spiningebi.ge"
                className="min-h-[44px]"
                data-testid="input-visual-text"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">დამატებითი ტექსტი</label>
              <Input
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                placeholder="სლოგანი ან აღწერა"
                className="min-h-[44px]"
                data-testid="input-visual-custom"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">შრიფტი</label>
              <Select value={font} onValueChange={setFont}>
                <SelectTrigger className="min-h-[44px]" data-testid="select-visual-font">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">ზომა (px)</label>
              <Input
                type="number"
                min="12"
                max="120"
                value={fontSize}
                onChange={e => setFontSize(e.target.value)}
                className="min-h-[44px]"
                data-testid="input-visual-size"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">ტექსტის ფერი</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={textColor === "transparent" ? "#ffffff" : textColor}
                  onChange={e => setTextColor(e.target.value)}
                  className="h-[44px] w-[44px] rounded border border-muted cursor-pointer"
                  data-testid="input-visual-text-color"
                />
                <Input
                  value={textColor}
                  onChange={e => setTextColor(e.target.value)}
                  className="min-h-[44px] flex-1"
                  data-testid="input-visual-text-color-hex"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">ფონის ფერი</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={bgColor.startsWith("linear") ? "#1a1a2e" : bgColor}
                  onChange={e => setBgColor(e.target.value)}
                  className="h-[44px] w-[44px] rounded border border-muted cursor-pointer"
                  data-testid="input-visual-bg-color"
                />
                <Input
                  value={bgColor}
                  onChange={e => setBgColor(e.target.value)}
                  className="min-h-[44px] flex-1"
                  data-testid="input-visual-bg-color-hex"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isBold}
                onChange={e => setIsBold(e.target.checked)}
                className="h-4 w-4 rounded accent-primary"
                data-testid="checkbox-visual-bold"
              />
              <span className="text-xs font-bold">თამამი</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isItalic}
                onChange={e => setIsItalic(e.target.checked)}
                className="h-4 w-4 rounded accent-primary"
                data-testid="checkbox-visual-italic"
              />
              <span className="text-xs italic">დახრილი</span>
            </label>
          </div>

          <Button
            onClick={downloadCanvas}
            className="min-h-[44px] w-full"
            data-testid="button-visual-download"
          >
            <Download className="mr-2 h-4 w-4" />
            ჩამოტვირთვა (PNG)
          </Button>
        </div>
      </GlassPanel>
    </div>
  );
}
