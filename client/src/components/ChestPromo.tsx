import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Product } from "@shared/schema";

export interface ChestPromoData {
  enabled: boolean;
  percent?: number;
  timerMinutes?: number;
  productIds?: number[];
  audience?: "all" | "new";
  productPercents?: Record<number, number>;
  claimExpiresAt?: number | null;
}

export function chestPercentFor(promo: ChestPromoData | undefined, productId: number): number {
  if (!promo) return 0;
  return promo.productPercents?.[productId] || promo.percent || 0;
}

const SEEN_KEY = "chest_popup_seen";
const TIMER_KEY = "chest_timer_start";
const POPUP_DELAY_MS = 60 * 1000;

// Start the 60s countdown from the moment the app loads (any page), so a
// visitor who lands on a product page and later returns to the home page gets
// the popup immediately once the time has already passed.
try {
  if (!localStorage.getItem(TIMER_KEY)) {
    localStorage.setItem(TIMER_KEY, String(Date.now()));
  }
} catch {}

export function useChestPromo() {
  const { data: promo } = useQuery<ChestPromoData>({
    queryKey: ["/api/chest-promo"],
    staleTime: 60 * 1000,
  });
  const active = Boolean(
    promo?.enabled &&
    promo.claimExpiresAt &&
    promo.claimExpiresAt > Date.now()
  );
  return {
    promo,
    claimActive: active,
    claimExpiresAt: active ? (promo!.claimExpiresAt as number) : null,
  };
}

export function chestDiscountedPrice(basePrice: number, percent: number): number {
  return Math.round(basePrice * (1 - percent / 100) * 100) / 100;
}

export function ChestCountdown({ expiresAt, className }: { expiresAt: number; className?: string }) {
  const [left, setLeft] = useState(() => Math.max(0, expiresAt - Date.now()));
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, expiresAt - Date.now())), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  useEffect(() => {
    if (left === 0) {
      queryClient.invalidateQueries({ queryKey: ["/api/chest-promo"] });
    }
  }, [left]);
  if (left <= 0) return null;
  const totalSec = Math.floor(left / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span className={className} data-testid="text-chest-countdown">
      ⏱ {h > 0 ? `${pad(h)}:` : ""}{pad(m)}:{pad(s)}
    </span>
  );
}

export function ChestPopup({ products }: { products: Product[] }) {
  const { promo } = useChestPromo();
  const [visible, setVisible] = useState(false);
  const [page, setPage] = useState(0);

  const claimMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/chest-promo/claim");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chest-promo"] });
      setVisible(false);
    },
    onError: () => {
      setVisible(false);
    },
  });

  useEffect(() => {
    if (!promo?.enabled) return;
    if (promo.claimExpiresAt) return;
    // "new" audience: show only to first-time visitors (localStorage flag).
    // "all" audience: show to everyone who hasn't claimed yet.
    if (promo.audience !== "all") {
      try {
        if (localStorage.getItem(SEEN_KEY)) return;
      } catch {}
    }
    // Count from the app-wide timer start, so time spent on product pages
    // counts too — returning to the home page shows the popup right away.
    let started = Date.now();
    try {
      const raw = Number(localStorage.getItem(TIMER_KEY) || 0);
      if (raw > 0) started = raw;
    } catch {}
    const remaining = Math.max(0, POPUP_DELAY_MS - (Date.now() - started));
    const t = setTimeout(() => {
      setVisible(true);
      try { localStorage.setItem(SEEN_KEY, "1"); } catch {}
    }, remaining);
    return () => clearTimeout(t);
  }, [promo?.enabled, promo?.claimExpiresAt]);

  const allPromoProducts = products.filter((p) => promo?.productIds?.includes(p.id));
  const pageCount = Math.max(1, Math.ceil(allPromoProducts.length / 3));

  // Auto-rotate the pages every 3 seconds when there are more than 3 items.
  useEffect(() => {
    if (!visible || pageCount <= 1) return;
    const t = setInterval(() => setPage((p) => (p + 1) % pageCount), 3000);
    return () => clearInterval(t);
  }, [visible, pageCount]);

  if (!visible || !promo?.enabled) return null;

  const promoProducts = allPromoProducts.slice(page * 3, page * 3 + 3);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4" data-testid="chest-popup-overlay">
      <div
        className="relative w-full max-w-[420px] overflow-hidden rounded-[20px] border-2 border-cyan-400 p-7 text-center text-white shadow-[0_0_50px_rgba(0,210,255,0.5)]"
        style={{ background: "radial-gradient(circle, #1a2a6c, #0a1128)" }}
        data-testid="chest-popup"
      >
        <div
          className="pointer-events-none absolute -left-1/2 -top-1/2 h-[200%] w-[200%] animate-[spin_12s_linear_infinite]"
          style={{ background: "conic-gradient(from 0deg, transparent, rgba(0,210,255,0.12), transparent 30%)" }}
        />
        <div className="relative z-10">
          <div className="mb-3 animate-bounce text-[80px] leading-none drop-shadow-[0_0_25px_rgba(255,215,0,0.7)]">🎁</div>
          <h1 className="m-0 text-3xl font-bold uppercase tracking-[2px] [text-shadow:0_0_10px_#00d2ff]">გილოცავთ!</h1>
          <p className="mb-5 mt-1 text-lg text-slate-400">თქვენ გაქვთ ფასდაკლების საჩუქარი</p>
          <hr className="mb-5 h-px border-0" style={{ background: "linear-gradient(to right, transparent, #00d2ff, transparent)" }} />
          <div className="mb-6 flex justify-center gap-3">
            {promoProducts.length > 0 ? promoProducts.map((p) => (
              <div
                key={p.id}
                className="w-[100px] rounded-xl border border-blue-400 p-2 shadow-[inset_0_0_10px_rgba(255,255,255,0.2)] transition-transform hover:scale-105"
                style={{ background: "linear-gradient(135deg, #1e3a8a, #3b82f6)" }}
                data-testid={`chest-reward-${p.id}`}
              >
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="mx-auto mb-1.5 h-14 w-14 rounded-md object-cover" />
                ) : (
                  <div className="mb-1.5 text-3xl">🪙</div>
                )}
                <div className="truncate text-[10px] text-blue-100">{p.name}</div>
                <div className="text-sm font-bold text-white">-{chestPercentFor(promo, p.id)}%</div>
              </div>
            )) : (
              <div
                className="w-[100px] rounded-xl border border-blue-400 p-4 shadow-[inset_0_0_10px_rgba(255,255,255,0.2)]"
                style={{ background: "linear-gradient(135deg, #1e3a8a, #3b82f6)" }}
              >
                <div className="mb-2 text-3xl">🪙</div>
                <div className="text-[15px] font-bold text-white">-{promo.percent}%</div>
              </div>
            )}
          </div>
          {pageCount > 1 && (
            <div className="mb-5 flex items-center justify-center gap-3" data-testid="chest-carousel-nav">
              <button
                onClick={() => setPage((p) => (p - 1 + pageCount) % pageCount)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-cyan-400/50 text-sm text-cyan-200 hover:bg-white/10"
                data-testid="button-chest-prev"
              >
                ‹
              </button>
              {Array.from({ length: pageCount }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`h-2 w-2 rounded-full transition-all ${i === page ? "w-4 bg-cyan-300" : "bg-slate-500 hover:bg-slate-300"}`}
                  data-testid={`dot-chest-page-${i}`}
                />
              ))}
              <button
                onClick={() => setPage((p) => (p + 1) % pageCount)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-cyan-400/50 text-sm text-cyan-200 hover:bg-white/10"
                data-testid="button-chest-next"
              >
                ›
              </button>
            </div>
          )}
          <button
            onClick={() => claimMutation.mutate()}
            disabled={claimMutation.isPending}
            className="rounded-[25px] border-0 px-9 py-3 text-base font-bold text-black shadow-[0_5px_15px_rgba(255,140,0,0.4)] transition-transform hover:scale-105 disabled:opacity-60"
            style={{ background: "linear-gradient(to right, #ffd700, #ff8c00)" }}
            data-testid="button-chest-claim"
          >
            {claimMutation.isPending ? "იტვირთება..." : "საჩუქრის აღება"}
          </button>
          <button
            onClick={() => setVisible(false)}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-lg text-slate-400 hover:bg-white/10 hover:text-white"
            data-testid="button-chest-close"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
