import { ReactNode } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Ruler,
  RotateCw,
  Cable,
  Fish,
  CheckCircle2,
  Star,
  ShoppingCart,
  Share2,
} from "lucide-react";
import type { Product } from "@shared/schema";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";

// თითო თევზის აღჭურვილობის კომპლექტი — ადმინი ავსებს ადმინ პანელიდან
export interface FishEquipment {
  rod?: {
    lengths?: string[]; // ["2.10 მ", "2.00 მ"]
    action?: string; // Fast
    power?: string; // Light
    casting?: string; // 2–7 გ
    productIds?: number[]; // მიბმული მაღაზიის პროდუქტები
  };
  reel?: {
    sizes?: string[]; // ["2000", "2500"]
    gearRatio?: string; // 5.2:1
    brake?: string; // 5-8 კგ
    productIds?: number[];
  };
  line?: { min?: string; best?: string; max?: string; productIds?: number[] }; // PE
  lure?: { types?: string[]; weight?: string; typeWeights?: Record<string, string>; productIds?: number[] };
  fluoro?: { min?: string; best?: string; max?: string; productIds?: number[] };
  recs?: string[];
}

export type GuideEquipmentMap = Record<string, FishEquipment>;

const cardCls =
  "rounded-2xl border border-white/15 bg-slate-900/70 p-4 shadow-xl backdrop-blur-md";

function EqCard({
  title,
  color,
  icon,
  children,
  testId,
}: {
  title: string;
  color: string;
  icon: ReactNode;
  children: ReactNode;
  testId: string;
}) {
  return (
    <div className={cardCls} data-testid={testId}>
      <div className="mb-3 flex items-center gap-2.5">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: `${color}20` }}
        >
          {icon}
        </div>
        <h3 className="text-base font-bold" style={{ color }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <b className="text-white">{value}</b>
    </div>
  );
}

function Badges({ items, cls }: { items?: string[]; cls: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {items.map((s) => (
        <span
          key={s}
          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}
        >
          {s}
        </span>
      ))}
    </div>
  );
}

// მარაგის შემოწმება ორივე მოდელისთვის: colorStock JSON (ფერიანი) ან stock int (უფერო)
export function isProductOutOfStock(p: Product): boolean {
  let colorStock: Record<string, number> = {};
  try {
    colorStock = JSON.parse(p.colorStock || "{}");
  } catch {}
  const colors = Object.keys(colorStock);
  if (colors.length > 0) {
    return Object.values(colorStock).reduce((a, b) => a + (Number(b) || 0), 0) <= 0;
  }
  return (p.stock ?? 0) <= 0;
}

function CardProducts({
  ids,
  products,
  testId,
}: {
  ids?: number[];
  products?: Product[];
  testId: string;
}) {
  const { addItem } = useCart();
  const { toast } = useToast();
  if (!ids || ids.length === 0 || !products) return null;
  const linked = ids
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));
  if (linked.length === 0) return null;

  function parseList(raw?: string | null): string[] {
    try {
      const v = JSON.parse(raw || "[]");
      return Array.isArray(v) ? v.filter((s) => typeof s === "string" && s.trim()) : [];
    } catch {
      return [];
    }
  }

  // პირდაპირ კალათაში — ფერიან/ვარიანტიან პროდუქტზე ის, რომელიც ფოტოზეა (პირველი ვარიანტი)
  function handleAdd(p: Product) {
    const price = Number(p.discountPrice ?? p.originalPrice);

    let colorStock: Record<string, number> = {};
    try {
      colorStock = JSON.parse(p.colorStock || "{}");
    } catch {}
    const colors = Object.keys(colorStock);
    let selectedColor: string | null = null;
    let stock = p.stock ?? 0;
    if (colors.length > 0) {
      // მარაგიანი პირველი ფერი (ფოტოზეც პირველი ჩანს)
      const withStock = colors.find((c) => (Number(colorStock[c]) || 0) > 0) || colors[0];
      selectedColor = withStock;
      stock = Number(colorStock[withStock]) || 0;
    }

    const lengths = parseList(p.lengthOptions);
    const weights = parseList(p.weightOptions);
    const legacyVariants = parseList(p.variantOptions);
    const selectedVariant =
      [lengths[0], weights[0]].filter(Boolean).join(" • ") || legacyVariants[0] || null;

    // შესყიდვის ლიმიტიც გავითვალისწინოთ, როგორც პროდუქტის გვერდზეა
    const cap = p.purchaseLimit && p.purchaseLimit > 0 ? Math.min(stock, p.purchaseLimit) : stock;
    addItem({
      productId: p.id,
      name: p.name,
      price,
      imageUrl: p.imageUrl || "",
      quantity: 1,
      selectedColor,
      selectedVariant,
      maxStock: cap,
    });
    toast({
      title: "კალათაში დაემატა ✓",
      description:
        p.name +
        (selectedColor ? ` — ${selectedColor}` : "") +
        (selectedVariant ? ` (${selectedVariant})` : ""),
    });
  }
  return (
    <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
      <p className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
        <Star className="h-3.5 w-3.5 animate-pulse fill-amber-300 text-amber-300" />
        ეხლავე შეძენა
      </p>
      {linked.map((p) => {
        const price = p.discountPrice ?? p.originalPrice;
        const soldOut = isProductOutOfStock(p);
        const inner = (
          <>
            {p.imageUrl ? (
              <img
                src={p.imageUrl}
                alt={p.name}
                className="h-11 w-11 flex-shrink-0 rounded-lg bg-white object-contain"
                loading="lazy"
              />
            ) : (
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-slate-700">
                <ShoppingCart className="h-5 w-5 text-slate-400" />
              </div>
            )}
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-xs font-semibold text-white">{p.name}</p>
              <p className="text-xs font-bold text-emerald-300">
                ₾{Number(price).toFixed(2)}
              </p>
            </div>
            {soldOut ? (
              <span
                className="flex flex-shrink-0 items-center rounded-lg bg-red-500/15 px-2.5 py-1.5 text-xs font-bold text-red-300"
                data-testid={`${testId}-product-${p.id}-soldout`}
              >
                ამოწურულია
              </span>
            ) : (
              <span className="flex flex-shrink-0 items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-xs font-bold text-emerald-300">
                <ShoppingCart className="h-3.5 w-3.5" />
                ყიდვა
              </span>
            )}
          </>
        );
        const tileCls = `flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-slate-800/60 p-2 transition-colors ${
          soldOut ? "opacity-60 hover:border-white/20" : "hover:border-emerald-400/40 hover:bg-slate-800"
        }`;
        // მხოლოდ ამოწურული → პროდუქტის გვერდზე; დანარჩენი → პირდაპირ კალათაში
        if (soldOut) {
          const back = encodeURIComponent(window.location.pathname + window.location.search);
          return (
            <Link key={p.id} href={`/product/${p.id}?back=${back}`} className={tileCls} data-testid={`${testId}-product-${p.id}`}>
              {inner}
            </Link>
          );
        }
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => handleAdd(p)}
            className={tileCls}
            data-testid={`${testId}-product-${p.id}`}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}

function hasAny(eq?: FishEquipment): boolean {
  if (!eq) return false;
  return Boolean(
    (eq.rod && (eq.rod.lengths?.length || eq.rod.action || eq.rod.power || eq.rod.casting || eq.rod.productIds?.length)) ||
      (eq.reel && (eq.reel.sizes?.length || eq.reel.gearRatio || eq.reel.brake || eq.reel.productIds?.length)) ||
      (eq.line && (eq.line.min || eq.line.best || eq.line.max || eq.line.productIds?.length)) ||
      (eq.lure && (eq.lure.types?.length || eq.lure.weight || eq.lure.productIds?.length)) ||
      (eq.fluoro && (eq.fluoro.min || eq.fluoro.best || eq.fluoro.max || eq.fluoro.productIds?.length)) ||
      eq.recs?.length,
  );
}

export function guideEquipmentHasData(eq?: FishEquipment) {
  return hasAny(eq);
}

export default function GuideEquipment({ eq }: { eq: FishEquipment }) {
  const anyProducts = Boolean(
    eq?.rod?.productIds?.length ||
      eq?.reel?.productIds?.length ||
      eq?.line?.productIds?.length ||
      eq?.lure?.productIds?.length ||
      eq?.fluoro?.productIds?.length,
  );
  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: anyProducts,
  });
  const { data: fbConfig } = useQuery<{ appId: string }>({
    queryKey: ["/api/facebook/app-id"],
    staleTime: Infinity,
  });

  async function shareOnFacebook() {
    const url = window.location.href;
    // მობილურზე — სისტემური გაზიარება (FB app-ში პირდაპირ)
    if (navigator.share) {
      try {
        await navigator.share({ title: "სპინინგის კომპლექტი | spiningebi.ge", url });
      } catch {
        // მომხმარებელმა გააუქმა
      }
      return;
    }
    const appId = fbConfig?.appId;
    const fbUrl = appId
      ? `https://www.facebook.com/dialog/share?app_id=${appId}&display=popup&href=${encodeURIComponent(url)}&redirect_uri=${encodeURIComponent(url)}`
      : `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    const popup = window.open(fbUrl, "_blank", "width=626,height=600,noopener=no");
    if (!popup) window.location.href = fbUrl;
  }

  if (!hasAny(eq)) return null;
  const showRod = eq.rod && (eq.rod.lengths?.length || eq.rod.action || eq.rod.power || eq.rod.casting || eq.rod.productIds?.length);
  const showReel = eq.reel && (eq.reel.sizes?.length || eq.reel.gearRatio || eq.reel.brake || eq.reel.productIds?.length);
  const showLine = eq.line && (eq.line.min || eq.line.best || eq.line.max || eq.line.productIds?.length);
  const showLure = eq.lure && (eq.lure.types?.length || eq.lure.weight || eq.lure.productIds?.length);
  const showFluoro = eq.fluoro && (eq.fluoro.min || eq.fluoro.best || eq.fluoro.max || eq.fluoro.productIds?.length);
  const showRecs = eq.recs && eq.recs.length > 0;

  return (
    <div data-testid="section-guide-equipment">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-white [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">
        <Star className="h-5 w-5 text-emerald-300" />
        სპინინგის კომპლექტი
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {showRod && (
          <EqCard title="ჯოხი" color="#22c55e" icon={<Fish className="h-5 w-5 text-green-400" />} testId="card-eq-rod">
            <div className="space-y-2">
              <Row label="Action" value={eq.rod?.action} />
              <Row label="Power" value={eq.rod?.power} />
              <Row label="ტყორცნის წონა" value={eq.rod?.casting} />
            </div>
            {(eq.rod?.lengths?.length ?? 0) > 0 && (
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-slate-400">სიგრძე</span>
                <b className="text-white">{eq.rod!.lengths!.join(", ")}</b>
              </div>
            )}
            <CardProducts ids={eq.rod?.productIds} products={products} testId="rod" />
          </EqCard>
        )}
        {showReel && (
          <EqCard title="კოჭა" color="#0ea5e9" icon={<RotateCw className="h-5 w-5 text-sky-400" />} testId="card-eq-reel">
            <div className="space-y-2">
              <Row label="Gear Ratio" value={eq.reel?.gearRatio} />
              <Row label="მუხრუჭი" value={eq.reel?.brake} />
            </div>
            {(eq.reel?.sizes?.length ?? 0) > 0 && (
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-slate-400">ზომა</span>
                <b className="text-white">{eq.reel!.sizes!.join(", ")}</b>
              </div>
            )}
            <CardProducts ids={eq.reel?.productIds} products={products} testId="reel" />
          </EqCard>
        )}
        {showLine && (
          <EqCard title="წნული" color="#8b5cf6" icon={<Cable className="h-5 w-5 text-violet-400" />} testId="card-eq-line">
            <div className="space-y-2">
              <Row label="მინ." value={eq.line?.min} />
              <Row label="საუკეთესო" value={eq.line?.best} />
              <Row label="მაქს." value={eq.line?.max} />
            </div>
            <CardProducts ids={eq.line?.productIds} products={products} testId="line" />
          </EqCard>
        )}
        {showFluoro && (
          <EqCard title="ფლუორო" color="#facc15" icon={<Ruler className="h-5 w-5 text-yellow-400" />} testId="card-eq-fluoro">
            <div className="space-y-2">
              <Row label="მინ." value={eq.fluoro?.min} />
              <Row label="საუკეთესო" value={eq.fluoro?.best} />
              <Row label="მაქს." value={eq.fluoro?.max} />
            </div>
            <CardProducts ids={eq.fluoro?.productIds} products={products} testId="fluoro" />
          </EqCard>
        )}
        {showLure && (
          <EqCard title="სატყუარა" color="#f97316" icon={<Fish className="h-5 w-5 text-orange-400" />} testId="card-eq-lure">
            <ul className="space-y-1.5 text-sm text-white">
              {(eq.lure?.types || []).map((t) => (
                <li key={t} className="flex items-center justify-between gap-2">
                  <span>🎣 {t}</span>
                  {eq.lure?.typeWeights?.[t] && (
                    <b className="text-white">{eq.lure.typeWeights[t]}</b>
                  )}
                </li>
              ))}
            </ul>
            {eq.lure?.weight && (
              <div className="mt-3 inline-block rounded-lg border border-orange-500/40 bg-orange-500/10 px-2.5 py-1 text-xs font-semibold text-orange-300">
                წონა: {eq.lure.weight}
              </div>
            )}
            <CardProducts ids={eq.lure?.productIds} products={products} testId="lure" />
          </EqCard>
        )}
        {showRecs && (
          <EqCard title="რეკომენდაცია" color="#06b6d4" icon={<CheckCircle2 className="h-5 w-5 text-cyan-400" />} testId="card-eq-recs">
            <ul className="space-y-1.5 text-sm text-white">
              {(eq.recs || []).map((r) => (
                <li key={r} className="flex items-start gap-1.5">
                  <span className="text-emerald-400">✓</span>
                  {r}
                </li>
              ))}
            </ul>
          </EqCard>
        )}
      </div>
      <button
        type="button"
        onClick={shareOnFacebook}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1877F2] px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#166FE5] active:scale-[0.98]"
        data-testid="button-equipment-share-fb"
      >
        <Share2 className="h-4 w-4" />
        გააზიარე ფეისბუქზე
      </button>
      <Link
        href="/"
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white shadow-lg backdrop-blur transition hover:bg-white/20 active:scale-[0.98]"
        data-testid="link-equipment-exit-home"
      >
        ← მთავარზე გასვლა
      </Link>
    </div>
  );
}
