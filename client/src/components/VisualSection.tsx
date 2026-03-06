import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { GlassPanel } from "@/components/GlassPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, Download, Type, Palette, Upload, Loader2, X } from "lucide-react";

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

export const BUILTIN_LOGOS = [
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

interface VisualSettings {
  selectedLogo: number | null;
  uploadedLogos: { src: string; label: string }[];
  text: string;
  font: string;
  fontSize: string;
  textColor: string;
  bgColor: string;
  textShadow: string;
  textStroke: string;
  isBold: boolean;
  isItalic: boolean;
  customText: string;
}

const DEFAULT_SETTINGS: VisualSettings = {
  selectedLogo: null,
  uploadedLogos: [],
  text: "spiningebi.ge",
  font: "FiraGO",
  fontSize: "48",
  textColor: "#FFD700",
  bgColor: "#1a1a2e",
  textShadow: "2px 2px 4px rgba(255,215,0,0.5)",
  textStroke: "",
  isBold: true,
  isItalic: false,
  customText: "",
};

export function VisualSection() {
  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [selectedLogo, setSelectedLogo] = useState<number | null>(null);
  const [uploadedLogos, setUploadedLogos] = useState<{ src: string; label: string }[]>([]);
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
  const [isUploading, setIsUploading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const { data: savedSettings } = useQuery<VisualSettings | null>({
    queryKey: ["/api/admin/visual-settings"],
  });

  useEffect(() => {
    if (savedSettings && !loaded) {
      setSelectedLogo(savedSettings.selectedLogo);
      setUploadedLogos(savedSettings.uploadedLogos || []);
      setText(savedSettings.text || "spiningebi.ge");
      setFont(savedSettings.font || "FiraGO");
      setFontSize(savedSettings.fontSize || "48");
      setTextColor(savedSettings.textColor || "#FFD700");
      setBgColor(savedSettings.bgColor || "#1a1a2e");
      setTextShadow(savedSettings.textShadow || "2px 2px 4px rgba(255,215,0,0.5)");
      setTextStroke(savedSettings.textStroke || "");
      setIsBold(savedSettings.isBold ?? true);
      setIsItalic(savedSettings.isItalic ?? false);
      setCustomText(savedSettings.customText || "");
      setLoaded(true);
    } else if (savedSettings === null && !loaded) {
      setLoaded(true);
    }
  }, [savedSettings, loaded]);

  const saveMutation = useMutation({
    mutationFn: async (settings: VisualSettings) => {
      await apiRequest("PUT", "/api/admin/visual-settings", settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/visual-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visual-settings/public"] });
      toast({ title: "შენახულია", description: "ვიზუალის პარამეტრები დამახსოვრებულია" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "შეცდომა", description: "შენახვა ვერ მოხერხდა" });
    },
  });

  function handleSave() {
    saveMutation.mutate({
      selectedLogo,
      uploadedLogos,
      text,
      font,
      fontSize,
      textColor,
      bgColor,
      textShadow,
      textStroke,
      isBold,
      isItalic,
      customText,
    });
  }

  async function handleLogoUpload(files: FileList) {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      imageFiles.forEach(f => formData.append("files", f));
      const res = await fetch("/api/media/upload", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("ატვირთვა ვერ მოხერხდა");
      const uploaded = await res.json();
      const newLogos = uploaded.map((m: { path: string; originalName: string }) => ({
        src: m.path,
        label: m.originalName.replace(/\.[^.]+$/, ""),
      }));
      setUploadedLogos(prev => [...prev, ...newLogos]);
      toast({ title: "ატვირთულია", description: `${imageFiles.length} ლოგო აიტვირთა` });
    } catch (err) {
      toast({ variant: "destructive", title: "შეცდომა", description: err instanceof Error ? err.message : "ატვირთვის შეცდომა" });
    } finally {
      setIsUploading(false);
    }
  }

  function removeUploadedLogo(idx: number) {
    setUploadedLogos(prev => prev.filter((_, i) => i !== idx));
    if (selectedLogo !== null && selectedLogo >= BUILTIN_LOGOS.length) {
      const uploadIdx = selectedLogo - BUILTIN_LOGOS.length;
      if (uploadIdx === idx) setSelectedLogo(null);
      else if (uploadIdx > idx) setSelectedLogo(selectedLogo - 1);
    }
  }

  const allLogos = [...BUILTIN_LOGOS, ...uploadedLogos];

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
          ლოგოები
        </h3>
        <div className="grid grid-cols-5 sm:grid-cols-5 gap-3">
          {allLogos.map((logo, idx) => (
            <div key={idx} className="relative">
              <button
                onClick={() => setSelectedLogo(selectedLogo === idx ? null : idx)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition-all hover:shadow-md w-full ${selectedLogo === idx ? "border-primary bg-primary/10 shadow-lg" : "border-muted bg-card hover:border-primary/30"}`}
                data-testid={`button-logo-${idx}`}
              >
                <img src={logo.src} alt={logo.label} className="h-12 w-12 sm:h-16 sm:w-16 object-contain" />
                <span className="text-[10px] sm:text-xs text-muted-foreground text-center leading-tight">{logo.label}</span>
              </button>
              {idx >= BUILTIN_LOGOS.length && (
                <button
                  onClick={() => removeUploadedLogo(idx - BUILTIN_LOGOS.length)}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white z-10"
                  data-testid={`button-remove-logo-${idx}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}

          <button
            onClick={() => logoInputRef.current?.click()}
            disabled={isUploading}
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-muted-foreground/30 p-2 transition-all hover:border-primary/50 hover:bg-primary/5 min-h-[80px] sm:min-h-[100px]"
            data-testid="button-upload-logo"
          >
            {isUploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-[10px] sm:text-xs text-muted-foreground text-center leading-tight">ატვირთვა</span>
              </>
            )}
          </button>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => {
              if (e.target.files && e.target.files.length > 0) {
                handleLogoUpload(e.target.files);
                e.target.value = "";
              }
            }}
            data-testid="input-logo-upload"
          />
        </div>

        {selectedLogo !== null && selectedLogo < allLogos.length && (
          <div className="mt-4 flex justify-center">
            <div className="rounded-2xl border-2 border-primary/30 bg-card p-6 shadow-xl">
              <img src={allLogos[selectedLogo].src} alt={allLogos[selectedLogo].label} className="h-32 w-32 sm:h-48 sm:w-48 object-contain" />
              <p className="text-center text-sm font-medium mt-2">{allLogos[selectedLogo].label}</p>
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

          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending || isUploading}
              className="min-h-[44px] flex-1"
              data-testid="button-visual-save"
            >
              {saveMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> ინახება...</>
              ) : (
                <><Save className="mr-2 h-4 w-4" /> დამახსოვრება</>
              )}
            </Button>
            <Button
              onClick={downloadCanvas}
              variant="outline"
              className="min-h-[44px]"
              data-testid="button-visual-download"
            >
              <Download className="mr-2 h-4 w-4" />
              PNG
            </Button>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
