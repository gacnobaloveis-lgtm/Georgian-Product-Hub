import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, X } from "lucide-react";
import type { FishEquipment, GuideEquipmentMap } from "@/components/GuideEquipment";
import GuideEquipment, { guideEquipmentHasData, isProductOutOfStock } from "@/components/GuideEquipment";
import type { Product } from "@shared/schema";

interface GuideData {
  fish: Record<string, { name: string; image?: string }>;
}

const emptyEq: FishEquipment = {
  rod: { lengths: [], action: "", power: "", casting: "", productIds: [] },
  reel: { sizes: [], gearRatio: "", brake: "", productIds: [] },
  line: { min: "", best: "", max: "", productIds: [] },
  lure: { types: [], weight: "", productIds: [] },
  fluoro: { min: "", best: "", max: "", productIds: [] },
  recs: [],
};

function cleanIds(ids?: number[]): number[] {
  return (ids || []).filter((n) => Number.isInteger(n) && n > 0);
}

function normalize(eq?: FishEquipment): FishEquipment {
  return {
    rod: { lengths: eq?.rod?.lengths || [], action: eq?.rod?.action || "", power: eq?.rod?.power || "", casting: eq?.rod?.casting || "", productIds: cleanIds(eq?.rod?.productIds) },
    reel: { sizes: eq?.reel?.sizes || [], gearRatio: eq?.reel?.gearRatio || "", brake: eq?.reel?.brake || "", productIds: cleanIds(eq?.reel?.productIds) },
    line: { min: eq?.line?.min || "", best: eq?.line?.best || "", max: eq?.line?.max || "", productIds: cleanIds(eq?.line?.productIds) },
    lure: { types: eq?.lure?.types || [], weight: eq?.lure?.weight || "", typeWeights: eq?.lure?.typeWeights || {}, productIds: cleanIds(eq?.lure?.productIds) },
    fluoro: { min: eq?.fluoro?.min || "", best: eq?.fluoro?.best || "", max: eq?.fluoro?.max || "", productIds: cleanIds(eq?.fluoro?.productIds) },
    recs: eq?.recs || [],
  };
}

// ცარიელი ველების მოჭრა შენახვამდე
function compact(eq: FishEquipment): FishEquipment | undefined {
  const out: FishEquipment = {};
  const rod = {
    lengths: (eq.rod?.lengths || []).map((s) => s.trim()).filter(Boolean),
    action: eq.rod?.action?.trim() || "",
    power: eq.rod?.power?.trim() || "",
    casting: eq.rod?.casting?.trim() || "",
    productIds: cleanIds(eq.rod?.productIds),
  };
  if (rod.lengths.length || rod.action || rod.power || rod.casting || rod.productIds.length) out.rod = rod;
  const reel = {
    sizes: (eq.reel?.sizes || []).map((s) => s.trim()).filter(Boolean),
    gearRatio: eq.reel?.gearRatio?.trim() || "",
    brake: eq.reel?.brake?.trim() || "",
    productIds: cleanIds(eq.reel?.productIds),
  };
  if (reel.sizes.length || reel.gearRatio || reel.brake || reel.productIds.length) out.reel = reel;
  const line = { min: eq.line?.min?.trim() || "", best: eq.line?.best?.trim() || "", max: eq.line?.max?.trim() || "", productIds: cleanIds(eq.line?.productIds) };
  if (line.min || line.best || line.max || line.productIds.length) out.line = line;
  const lureTypes = (eq.lure?.types || []).map((s) => s.trim()).filter(Boolean);
  const typeWeights: Record<string, string> = {};
  for (const t of lureTypes) {
    const w = eq.lure?.typeWeights?.[t]?.trim();
    if (w) typeWeights[t] = w;
  }
  const lure = { types: lureTypes, weight: eq.lure?.weight?.trim() || "", typeWeights, productIds: cleanIds(eq.lure?.productIds) };
  if (lure.types.length || lure.weight || Object.keys(typeWeights).length || lure.productIds.length) out.lure = lure;
  const fluoro = { min: eq.fluoro?.min?.trim() || "", best: eq.fluoro?.best?.trim() || "", max: eq.fluoro?.max?.trim() || "", productIds: cleanIds(eq.fluoro?.productIds) };
  if (fluoro.min || fluoro.best || fluoro.max || fluoro.productIds.length) out.fluoro = fluoro;
  const recs = (eq.recs || []).map((s) => s.trim()).filter(Boolean);
  if (recs.length) out.recs = recs;
  return Object.keys(out).length ? out : undefined;
}

function ListEditor({
  label,
  items,
  onChange,
  placeholder,
  testId,
}: {
  label: string;
  items: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  testId: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <div className="space-y-2">
        {items.map((v, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={v}
              placeholder={placeholder}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
              data-testid={`input-${testId}-${i}`}
            />
            <Button variant="ghost" size="icon" onClick={() => onChange(items.filter((_, j) => j !== i))} data-testid={`button-remove-${testId}-${i}`}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange([...items, ""])} data-testid={`button-add-${testId}`}>
          <Plus className="mr-1 h-4 w-4" /> დამატება
        </Button>
      </div>
    </div>
  );
}

function ProductPicker({
  ids,
  onChange,
  products,
  testId,
}: {
  ids: number[];
  onChange: (v: number[]) => void;
  products?: Product[];
  testId: string;
}) {
  const attached = ids
    .map((id) => products?.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));
  const available = (products || []).filter((p) => !ids.includes(p.id));
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">მაღაზიის პროდუქტები („ყიდვის“ ღილაკი)</label>
      <div className="space-y-2">
        {attached.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-md border p-2">
            {p.imageUrl && (
              <img src={p.imageUrl} alt={p.name} className="h-9 w-9 rounded bg-white object-contain" />
            )}
            <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
            <span className="text-sm font-semibold text-emerald-600">
              ₾{Number(p.discountPrice ?? p.originalPrice).toFixed(2)}
            </span>
            {isProductOutOfStock(p) && (
              <span className="flex-shrink-0 rounded bg-red-500/15 px-1.5 py-0.5 text-xs font-semibold text-red-600">
                ამოწურულია
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onChange(ids.filter((id) => id !== p.id))}
              data-testid={`button-remove-${testId}-product-${p.id}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <select
          value=""
          onChange={(e) => {
            const id = Number(e.target.value);
            if (id) onChange([...ids, id]);
          }}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          data-testid={`select-${testId}-product`}
        >
          <option value="">+ პროდუქტის მიბმა...</option>
          {available.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — ₾{Number(p.discountPrice ?? p.originalPrice).toFixed(2)}
              {isProductOutOfStock(p) ? " ⛔ ამოწურულია" : ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function GuideEquipmentSection() {
  const { toast } = useToast();
  const [fishKey, setFishKey] = useState("");
  const [eq, setEq] = useState<FishEquipment>(normalize());

  const { data: guideData } = useQuery<GuideData>({ queryKey: ["/api/guide/data"] });
  const { data: products } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: map, isSuccess: mapLoaded } = useQuery<GuideEquipmentMap>({ queryKey: ["/api/guide/equipment"] });

  useEffect(() => {
    if (!fishKey && guideData) {
      const first = Object.keys(guideData.fish)[0];
      if (first) setFishKey(first);
    }
  }, [guideData, fishKey]);

  useEffect(() => {
    if (fishKey) setEq(normalize(map?.[fishKey]));
  }, [fishKey, map]);

  const save = useMutation({
    mutationFn: async () => {
      // ვგზავნით მხოლოდ ერთი თევზის მონაცემს — სერვერი თვითონ ურევს არსებულს
      const res = await fetch("/api/admin/guide-equipment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fishKey, equipment: compact(eq) ?? null }),
      });
      if (!res.ok) throw new Error("შენახვა ვერ მოხერხდა");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guide/equipment"] });
      toast({ title: "შენახულია ✅" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const fishList = guideData ? Object.entries(guideData.fish) : [];
  const preview = compact(eq);

  return (
    <div className="space-y-6">
      <Card className="border-card-border bg-card">
        <CardContent className="space-y-5 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium">თევზი</label>
            <select
              value={fishKey}
              onChange={(e) => setFishKey(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              data-testid="select-eq-fish"
            >
              {fishList.map(([k, f]) => (
                <option key={k} value={k}>
                  {f.name} {guideEquipmentHasData(map?.[k]) ? "✓ (შევსებულია)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* ჯოხი */}
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="font-semibold text-green-600">🎣 ჯოხი</h3>
            <ListEditor label="სიგრძეები" items={eq.rod?.lengths || []} onChange={(v) => setEq({ ...eq, rod: { ...eq.rod, lengths: v } })} placeholder="მაგ. 2.10 მ" testId="rod-length" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Action</label>
                <Input value={eq.rod?.action || ""} placeholder="Fast" onChange={(e) => setEq({ ...eq, rod: { ...eq.rod, action: e.target.value } })} data-testid="input-rod-action" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Power</label>
                <Input value={eq.rod?.power || ""} placeholder="Light" onChange={(e) => setEq({ ...eq, rod: { ...eq.rod, power: e.target.value } })} data-testid="input-rod-power" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">ტყორცნის წონა</label>
                <Input value={eq.rod?.casting || ""} placeholder="2–7 გ" onChange={(e) => setEq({ ...eq, rod: { ...eq.rod, casting: e.target.value } })} data-testid="input-rod-casting" />
              </div>
            </div>
            <ProductPicker ids={eq.rod?.productIds || []} onChange={(v) => setEq({ ...eq, rod: { ...eq.rod, productIds: v } })} products={products} testId="rod" />
          </div>

          {/* კოჭა */}
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="font-semibold text-sky-600">🌀 კოჭა</h3>
            <ListEditor label="ზომები" items={eq.reel?.sizes || []} onChange={(v) => setEq({ ...eq, reel: { ...eq.reel, sizes: v } })} placeholder="მაგ. 2500" testId="reel-size" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Gear Ratio</label>
                <Input value={eq.reel?.gearRatio || ""} placeholder="5.2:1" onChange={(e) => setEq({ ...eq, reel: { ...eq.reel, gearRatio: e.target.value } })} data-testid="input-reel-gear" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">მუხრუჭი</label>
                <Input value={eq.reel?.brake || ""} placeholder="5–8 კგ" onChange={(e) => setEq({ ...eq, reel: { ...eq.reel, brake: e.target.value } })} data-testid="input-reel-brake" />
              </div>
            </div>
            <ProductPicker ids={eq.reel?.productIds || []} onChange={(v) => setEq({ ...eq, reel: { ...eq.reel, productIds: v } })} products={products} testId="reel" />
          </div>

          {/* წნული */}
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="font-semibold text-violet-600">🧵 წნული</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">მინ.</label>
                <Input value={eq.line?.min || ""} placeholder="PE 0.3" onChange={(e) => setEq({ ...eq, line: { ...eq.line, min: e.target.value } })} data-testid="input-line-min" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">საუკეთესო</label>
                <Input value={eq.line?.best || ""} placeholder="PE 0.4" onChange={(e) => setEq({ ...eq, line: { ...eq.line, best: e.target.value } })} data-testid="input-line-best" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">მაქს.</label>
                <Input value={eq.line?.max || ""} placeholder="PE 0.5" onChange={(e) => setEq({ ...eq, line: { ...eq.line, max: e.target.value } })} data-testid="input-line-max" />
              </div>
            </div>
            <ProductPicker ids={eq.line?.productIds || []} onChange={(v) => setEq({ ...eq, line: { ...eq.line, productIds: v } })} products={products} testId="line" />
          </div>

          {/* სატყუარა */}
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="font-semibold text-orange-600">🪝 სატყუარა</h3>
            <ListEditor label="ტიპები" items={eq.lure?.types || []} onChange={(v) => setEq({ ...eq, lure: { ...eq.lure, types: v } })} placeholder="მაგ. ვობლერი" testId="lure-type" />
            {(eq.lure?.types || []).filter((t) => t.trim()).length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">წონა თითო ტიპზე (გრამებში)</label>
                {(eq.lure?.types || []).filter((t) => t.trim()).map((t) => (
                  <div key={t} className="flex items-center gap-2">
                    <span className="w-28 flex-shrink-0 truncate text-sm">{t}</span>
                    <Input
                      value={eq.lure?.typeWeights?.[t] || ""}
                      placeholder="მაგ. 3 – 6 გ"
                      onChange={(e) =>
                        setEq({
                          ...eq,
                          lure: { ...eq.lure, typeWeights: { ...(eq.lure?.typeWeights || {}), [t]: e.target.value } },
                        })
                      }
                      data-testid={`input-lure-weight-${t}`}
                    />
                  </div>
                ))}
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium">საერთო წონა (არასავალდებულო)</label>
              <Input value={eq.lure?.weight || ""} placeholder="2 – 4.5 გ" onChange={(e) => setEq({ ...eq, lure: { ...eq.lure, weight: e.target.value } })} data-testid="input-lure-weight" />
            </div>
            <ProductPicker ids={eq.lure?.productIds || []} onChange={(v) => setEq({ ...eq, lure: { ...eq.lure, productIds: v } })} products={products} testId="lure" />
          </div>

          {/* ფლუორო */}
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="font-semibold text-yellow-600">📏 ფლუორო</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">მინ.</label>
                <Input value={eq.fluoro?.min || ""} placeholder="0.12 მმ" onChange={(e) => setEq({ ...eq, fluoro: { ...eq.fluoro, min: e.target.value } })} data-testid="input-fluoro-min" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">საუკეთესო</label>
                <Input value={eq.fluoro?.best || ""} placeholder="0.14 მმ" onChange={(e) => setEq({ ...eq, fluoro: { ...eq.fluoro, best: e.target.value } })} data-testid="input-fluoro-best" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">მაქს.</label>
                <Input value={eq.fluoro?.max || ""} placeholder="0.16 მმ" onChange={(e) => setEq({ ...eq, fluoro: { ...eq.fluoro, max: e.target.value } })} data-testid="input-fluoro-max" />
              </div>
            </div>
            <ProductPicker ids={eq.fluoro?.productIds || []} onChange={(v) => setEq({ ...eq, fluoro: { ...eq.fluoro, productIds: v } })} products={products} testId="fluoro" />
          </div>

          {/* რეკომენდაცია */}
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="font-semibold text-cyan-600">⭐ რეკომენდაცია</h3>
            <ListEditor label="პუნქტები" items={eq.recs || []} onChange={(v) => setEq({ ...eq, recs: v })} placeholder="მაგ. მსუბუქი Fast Action ჯოხი" testId="rec" />
          </div>

          <Button onClick={() => save.mutate()} disabled={save.isPending || !fishKey || !mapLoaded} className="w-full" data-testid="button-save-equipment">
            {save.isPending ? "ინახება..." : "შენახვა"}
          </Button>
        </CardContent>
      </Card>

      {/* წინასწარი ხედი */}
      {preview && (
        <div className="rounded-xl bg-slate-950 p-4">
          <p className="mb-3 text-sm text-slate-400">ასე გამოჩნდება გზამკვლევში:</p>
          <GuideEquipment eq={preview} />
        </div>
      )}
    </div>
  );
}
