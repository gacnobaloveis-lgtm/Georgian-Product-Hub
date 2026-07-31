import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { ArrowLeft, Search, Fish as FishIcon, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import GuideEquipment, { guideEquipmentHasData, type GuideEquipmentMap } from "@/components/GuideEquipment";
import { CartDrawer } from "@/components/CartDrawer";
import { useCart } from "@/hooks/use-cart";
import mountainSceneBg from "@assets/mountain-scene-bg.webp";

const PAGE_BG_STYLE: React.CSSProperties = {
  backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.55), rgba(2, 6, 23, 0.65)), url(${mountainSceneBg})`,
  backgroundSize: "cover",
  backgroundPosition: "right center",
  backgroundAttachment: typeof window !== "undefined" && window.innerWidth >= 768 ? "fixed" : "scroll",
};

interface FishInfo {
  name: string;
  image: string;
  color: string;
}

interface GuideData {
  fish: Record<string, FishInfo>;
}

const cardCls = "rounded-2xl border border-white/20 bg-white/25 p-5 shadow-xl backdrop-blur-md";

export default function GuideEquipmentPage() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { items, totalCount } = useCart();
  const cartTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const { data: guideData } = useQuery<GuideData>({ queryKey: ["/api/guide/data"] });
  const { data: equipmentMap } = useQuery<GuideEquipmentMap>({ queryKey: ["/api/guide/equipment"] });

  const search = useSearch();

  const fishEntries = guideData ? Object.entries(guideData.fish) : [];

  // გაზიარებული ბმულით მოსვლა: /guide/equipment?fish=kashapi
  // პროდუქტის გვერდიდან დაბრუნება — კალათა გაიხსნას
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("cart")) {
      setCartOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!guideData) return;
    const param = new URLSearchParams(search).get("fish");
    if (param && guideData.fish[param] && !selectedKey) {
      setSelectedKey(param);
      setQuery(guideData.fish[param].name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guideData]);

  function selectFish(key: string) {
    setSelectedKey(key);
    setNotFound(false);
    window.history.replaceState(null, "", `/guide/equipment?fish=${key}`);
  }

  function doSearch(q?: string) {
    const text = (q ?? query).trim().toLowerCase();
    if (!text) return;
    const hit = fishEntries.find(
      ([key, f]) => f.name.toLowerCase().includes(text) || key.toLowerCase() === text
    );
    if (hit) {
      selectFish(hit[0]);
      setQuery(hit[1].name);
    } else {
      setSelectedKey(null);
      setNotFound(true);
    }
  }

  const selectedFish = selectedKey && guideData ? guideData.fish[selectedKey] : null;
  const eq = selectedKey && equipmentMap ? equipmentMap[selectedKey] : undefined;
  const hasEq = guideEquipmentHasData(eq);

  return (
    <div className="min-h-screen" style={PAGE_BG_STYLE}>
      <div className="mx-auto max-w-3xl px-4 py-6 pb-16">
        <div className="mb-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
            onClick={() => navigate("/")}
            data-testid="button-back-to-guide"
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> მთავარზე გასვლა
          </Button>
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white [text-shadow:_0_2px_6px_rgb(0_0_0_/_70%)]">
            🎣 როგორ შევარჩიო სპინინგის კომპლექტი
          </h1>
          <p className="mt-1 text-sm text-white/80 [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">
            ჩაწერე თევზის სახელი და ნახე სრული კომპლექტი — ჯოხი, კოჭა, წნული, სატყუარები
          </p>
        </div>

        <div className={cardCls}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <FishIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setNotFound(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && doSearch()}
                placeholder="მაგ: ქაშაპი"
                className="w-full rounded-xl border border-white/30 bg-white/80 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-emerald-400"
                data-testid="input-equipment-fish-search"
              />
            </div>
            <Button
              onClick={() => doSearch()}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="button-equipment-search"
            >
              <Search className="mr-1 h-4 w-4" /> ძიება
            </Button>
          </div>

          {fishEntries.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {fishEntries.map(([key, f]) => (
                <button
                  key={key}
                  onClick={() => {
                    setQuery(f.name);
                    selectFish(key);
                  }}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                    selectedKey === key
                      ? "border-emerald-400 bg-emerald-500/90 text-white"
                      : "border-white/40 bg-white/60 text-slate-700 hover:bg-white/90"
                  }`}
                  data-testid={`chip-fish-${key}`}
                >
                  <img src={f.image} alt="" className="h-5 w-5 rounded-full object-cover" />
                  {f.name}
                </button>
              ))}
            </div>
          )}

          {notFound && (
            <p className="mt-3 text-sm font-medium text-amber-200 [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]" data-testid="text-fish-not-found">
              ასეთი თევზი ვერ მოიძებნა — სცადე ზემოთ ჩამოთვლილი თევზებიდან ერთ-ერთი.
            </p>
          )}
        </div>

        {selectedFish && (
          <div className="mt-6">
            {hasEq && eq ? (
              <>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-white [text-shadow:_0_2px_6px_rgb(0_0_0_/_70%)]" data-testid="text-equipment-fish-title">
                  <img src={selectedFish.image} alt="" className="h-7 w-7 rounded-full object-cover" />
                  {selectedFish.name} — სპინინგის კომპლექტი
                </h2>
                <GuideEquipment eq={eq} />
              </>
            ) : (
              <div className={`${cardCls} text-center`} data-testid="card-equipment-empty">
                <p className="text-sm font-medium text-white [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">
                  {selectedFish.name}-ზე კომპლექტი ჯერ არ არის შევსებული — მალე დაემატება.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* მოტივტივე კალათა — რაოდენობა + ჯამური თანხა */}
      {totalCount > 0 && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-2xl ring-2 ring-white/30 transition hover:bg-emerald-700 active:scale-95"
          data-testid="button-equipment-cart"
        >
          <span className="relative">
            <ShoppingCart className="h-5 w-5" />
            <span className="absolute -right-2.5 -top-2.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold" data-testid="text-equipment-cart-count">
              {totalCount > 99 ? "99+" : totalCount}
            </span>
          </span>
          <span className="ml-1">₾{cartTotal.toFixed(2)}</span>
        </button>
      )}

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
}
