import { useState, useEffect, useRef } from "react";
import { showNotification, requestNotificationPermission } from "@/lib/web-notification";
import { useQuery } from "@tanstack/react-query";
import { useProducts } from "@/hooks/use-products";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { CartDrawer } from "@/components/CartDrawer";
import { AuthLoginDialog } from "@/components/AuthLoginDialog";
import { AnimatedShell } from "@/components/AnimatedShell";
import { GlassPanel } from "@/components/GlassPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ImageOff, Home, ShoppingBag, Settings, Search, SlidersHorizontal, X, LayoutGrid, ShoppingCart, Share2, UserCircle, BookOpen, ChevronDown, Gift, ArrowLeft, Phone, Mail, MapPin, MessageCircle, ScrollText, Download, Info, Coins, Send } from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { LucideIcon } from "@/components/IconPicker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Link, useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useCategories } from "@/hooks/use-categories";
import type { Product, Category, TermsSection } from "@shared/schema";
import wobblerIcon from "@assets/image_1776964369278.png";
import rodIcon from "@assets/image_1776963958973.png";
import reelIcon from "@assets/image_1776964761416.png";
import lineIcon from "@assets/image_1776964112724.png";
import jigIcon from "@assets/image_1776965688800.png";
import mormishingIcon from "@assets/image_1776965808335.png";
import spinnerIcon from "@assets/image_1776965581799.png";
import vestIcon from "@assets/image_1776966819348.png";
import fishermanLogo from "@assets/spiningebi_logo.png";
import eyeIconPath from "@assets/image_1777053072588.png";
import mobileFooterBg from "@assets/690814979_2185444182251201_1788998078963550236_n_1779374232358.jpg";
import desktopFooterBg from "@assets/ChatGPT_Image_May_21,_2026,_07_04_25_PM_1779375895205.png";
import mountainSceneBg from "@assets/mountain-scene-bg.webp";
import heroCover2026 from "@assets/hero-cover-spiningebi-2026.png";
import { BUILTIN_LOGOS } from "@/components/VisualSection";
import RichTextDisplay from "@/components/RichTextDisplay";

function SiteFooter() {
  const [, setLocation] = useLocation();
  const { data: contact } = useQuery<{ phone: string; email: string; whatsapp: string; address: string; workHours: string; dayOff: string }>({
    queryKey: ["/api/contact-info"],
  });
  const c = contact || { phone: "+995 599 52 33 51", email: "spiningebi@gmail.com", whatsapp: "+995 599 52 33 51", address: "საქართველო, ქუთაისი, მელიქიშვილის 2", workHours: "ორშაბათი - შაბათი: 10:00 - 19:00", dayOff: "კვირა: დასვენება" };
  const waNumber = c.whatsapp.replace(/[\s+()-]/g, "");
  const sectionTitle = "mb-4 text-xs font-bold uppercase tracking-wider text-purple-700/80 flex items-center gap-2";
  const titleDot = <span className="inline-block h-1.5 w-1.5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />;
  const itemRow = "group flex items-center gap-3 text-sm text-gray-700 hover:text-purple-700 transition-all duration-200";
  const iconBadge = "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-purple-100 group-hover:ring-purple-300 group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-200";
  return (
    <footer className="mt-12" data-testid="footer">
      {/* ===== MOBILE FOOTER ===== */}
      <div className="relative sm:hidden overflow-hidden" data-testid="footer-mobile">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src={mobileFooterBg}
            alt=""
            className="h-full w-full object-cover object-top"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/55 to-slate-900/80" />
        </div>

        <div className="relative px-4 pt-5 pb-4 space-y-3 text-white">
          {/* Title */}
          <h3 className="text-lg font-bold tracking-tight" data-testid="footer-mobile-title">
            საკონტაქტო ინფორმაცია
          </h3>

          {/* Contact rows */}
          <ul className="space-y-2">
            <li>
              <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="flex items-center gap-2.5" data-testid="footer-mobile-phone">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 shadow">
                  <Phone className="h-4 w-4 text-white" />
                </span>
                <span className="text-sm font-medium text-white">{c.phone}</span>
              </a>
            </li>
            <li>
              <a href={`mailto:${c.email}`} className="flex items-center gap-2.5" data-testid="footer-mobile-email">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 shadow">
                  <Mail className="h-4 w-4 text-white" />
                </span>
                <span className="text-sm font-medium text-white truncate">{c.email}</span>
              </a>
            </li>
            <li>
              <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5" data-testid="footer-mobile-whatsapp">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 shadow">
                  <MessageCircle className="h-4 w-4 text-white" />
                </span>
                <span className="text-sm font-medium text-white">WhatsApp</span>
              </a>
            </li>
            <li>
              <button
                onClick={() => setLocation("/live-contact")}
                className="flex items-center gap-2.5 w-full text-left"
                data-testid="footer-mobile-live"
              >
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 shadow">
                  <MessageCircle className="h-4 w-4 text-white" />
                  <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500 ring-2 ring-emerald-600 animate-pulse" />
                </span>
                <span className="text-sm font-medium">
                  <span className="text-red-400 font-bold">LIVE</span>
                  <span className="text-white"> კონტაქტი</span>
                </span>
              </button>
            </li>
          </ul>

          {/* Address / Terms / About — stacked vertically, no borders */}
          <ul className="space-y-2 pt-1">
            <li>
              <div className="flex items-start gap-2.5" data-testid="footer-mobile-address">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 shadow mt-0.5">
                  <MapPin className="h-4 w-4 text-white" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white">მისამართი</p>
                  <RichTextDisplay
                    html={c.address}
                    className="prose prose-sm max-w-none text-xs text-white [&_p]:my-0 [&_*]:!leading-snug [&_*]:!text-white"
                  />
                </div>
              </div>
            </li>
            <li>
              <button
                onClick={() => setLocation("/terms")}
                className="flex items-center gap-2.5 w-full text-left active:scale-[0.99] transition-transform"
                data-testid="footer-mobile-terms"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 shadow">
                  <ScrollText className="h-4 w-4 text-white" />
                </span>
                <span className="text-sm font-medium text-white">წესები და პირობები</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setLocation("/about")}
                className="flex items-center gap-2.5 w-full text-left active:scale-[0.99] transition-transform"
                data-testid="footer-mobile-about"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 shadow">
                  <Info className="h-4 w-4 text-white" />
                </span>
                <span className="text-sm font-medium text-white">ჩვენს შესახებ</span>
              </button>
            </li>
          </ul>

          {/* Work hours — transparent like the other rows */}
          <div className="flex items-start gap-2.5 pt-1">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 shadow mt-0.5 text-sm">🎣</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white">სამუშაო საათები</p>
              <RichTextDisplay
                html={c.workHours}
                className="prose prose-sm max-w-none text-xs text-white [&_p]:my-0 [&_*]:!leading-snug [&_*]:!text-white"
              />
              <div className="mt-1.5 h-0.5 w-24 rounded-full bg-gradient-to-r from-sky-400 to-cyan-300" />
            </div>
          </div>

          {/* Footer mini */}
          <div className="pt-1 flex flex-col items-center gap-1 text-center">
            <RegisteredUsersCount />
            <p className="text-[10px] text-white/70">
              © {new Date().getFullYear()} <span className="font-semibold text-emerald-300">spiningebi.ge</span>
            </p>
          </div>
        </div>
      </div>

      {/* ===== DESKTOP / TABLET FOOTER ===== */}
      <div className="relative overflow-hidden hidden sm:block" data-testid="footer-desktop">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src={desktopFooterBg}
            alt=""
            className="h-full w-full object-cover object-top"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/55 to-slate-900/80" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-10 lg:px-8 text-white">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Column 1 — Contact rows */}
            <div>
              <h3 className="text-base font-bold tracking-tight text-white mb-4">საკონტაქტო ინფორმაცია</h3>
              <ul className="space-y-3">
                <li>
                  <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="flex items-center gap-3" data-testid="footer-phone">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 shadow">
                      <Phone className="h-4 w-4 text-white" />
                    </span>
                    <span className="text-sm font-medium text-white">{c.phone}</span>
                  </a>
                </li>
                <li>
                  <a href={`mailto:${c.email}`} className="flex items-center gap-3" data-testid="footer-email">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 shadow">
                      <Mail className="h-4 w-4 text-white" />
                    </span>
                    <span className="text-sm font-medium text-white truncate">{c.email}</span>
                  </a>
                </li>
                <li>
                  <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3" data-testid="footer-whatsapp">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 shadow">
                      <MessageCircle className="h-4 w-4 text-white" />
                    </span>
                    <span className="text-sm font-medium text-white">WhatsApp</span>
                  </a>
                </li>
                <li>
                  <button onClick={() => setLocation("/live-contact")} className="flex items-center gap-3 w-full text-left" data-testid="footer-live-contact2">
                    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 shadow">
                      <MessageCircle className="h-4 w-4 text-white" />
                      <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500 ring-2 ring-emerald-600 animate-pulse" />
                    </span>
                    <span className="text-sm font-semibold">
                      <span className="text-red-400">LIVE</span>
                      <span className="text-white"> კონტაქტი</span>
                    </span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 2 — Address */}
            <div>
              <h3 className="text-base font-bold tracking-tight text-white mb-4">მისამართი</h3>
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 shadow mt-0.5">
                  <MapPin className="h-4 w-4 text-white" />
                </span>
                <RichTextDisplay
                  html={c.address}
                  className="prose prose-sm max-w-none text-sm text-white [&_p]:my-0 [&_*]:!leading-snug [&_*]:!text-white"
                />
              </div>
            </div>

            {/* Column 3 — Links */}
            <div>
              <h3 className="text-base font-bold tracking-tight text-white mb-4">ბმულები</h3>
              <ul className="space-y-3">
                <li>
                  <button onClick={() => setLocation("/terms")} className="flex items-center gap-3 w-full text-left" data-testid="footer-terms-link2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 shadow">
                      <ScrollText className="h-4 w-4 text-white" />
                    </span>
                    <span className="text-sm font-medium text-white">წესები და პირობები</span>
                  </button>
                </li>
                <li>
                  <button onClick={() => setLocation("/about")} className="flex items-center gap-3 w-full text-left" data-testid="footer-about-link2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 shadow">
                      <Info className="h-4 w-4 text-white" />
                    </span>
                    <span className="text-sm font-medium text-white">ჩვენს შესახებ</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4 — Work hours */}
            <div>
              <h3 className="text-base font-bold tracking-tight text-white mb-4">სამუშაო საათები</h3>
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 shadow mt-0.5 text-base">🎣</span>
                <div className="flex-1 min-w-0">
                  <RichTextDisplay
                    html={c.workHours}
                    className="prose prose-sm max-w-none text-sm text-white font-medium [&_p]:my-0 [&_*]:!leading-snug [&_*]:!text-white"
                  />
                  <div className="mt-2 h-0.5 w-24 rounded-full bg-gradient-to-r from-sky-400 to-cyan-300" />
                  <RichTextDisplay
                    html={c.dayOff}
                    className="prose prose-sm max-w-none text-xs text-white/85 italic mt-1.5 [&_p]:my-0 [&_*]:!leading-snug [&_*]:!text-white/85"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-white/15 flex flex-col items-center gap-2">
            <RegisteredUsersCount />
            <div className="text-xs text-white/70">
              © {new Date().getFullYear()} <span className="font-semibold text-emerald-300">spiningebi.ge</span> — ყველა უფლება დაცულია
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function RegisteredUsersCount() {
  const { data } = useQuery<{ count: number }>({
    queryKey: ["/api/users/count"],
    refetchInterval: 60000,
  });
  if (!data || !data.count) return null;
  return (
    <p className="text-xs font-semibold text-purple-700" data-testid="text-registered-count">
      სულ დარეგისტრირდა <span className="text-emerald-600">{data.count}</span> მომხმარებელი
    </p>
  );
}

const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='250' fill='%23e2e8f0'%3E%3Crect width='400' height='250'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='%2394a3b8'%3E%E1%83%A1%E1%83%A3%E1%83%A0%E1%83%90%E1%83%97%E1%83%98 %E1%83%90%E1%83%A0 %E1%83%90%E1%83%A0%E1%83%98%E1%83%A1%3C/text%3E%3C/svg%3E";

function cacheBust(url: string | undefined): string | undefined {
  if (!url) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=4`;
}

const HERO_SLIDES = [
  { mobile: heroCover2026, desktop: heroCover2026 },
];
const HERO_SLIDE_INTERVAL_MS = 20000;

function ImgWithFallback({
  src,
  alt,
  className,
  ...rest
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [errored, setErrored] = useState(false);
  return (
    <img
      src={errored || !src ? PLACEHOLDER_IMG : cacheBust(src)}
      alt={alt}
      className={className}
      onError={() => setErrored(true)}
      {...rest}
    />
  );
}

function ProductCard({ product, referralCode }: { product: Product; referralCode?: string | null }) {
  const mainImage = product.imageUrl || null;
  const hasDiscount = product.discountPrice && Number(product.discountPrice) < Number(product.originalPrice);
  const discountPct =
    hasDiscount && Number(product.originalPrice) > 0
      ? Math.round(
          ((Number(product.originalPrice) - Number(product.discountPrice)) /
            Number(product.originalPrice)) *
            100
        )
      : 0;

  const formatPrice = (price: string | null) => {
    if (!price) return "";
    return `₾${Number(price).toFixed(2)}`;
  };

  const formatViews = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`;
    return String(count);
  };

  const handleClick = () => {
    fetch(`/api/products/${product.id}/view`, { method: "POST" }).catch(() => {});
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const baseUrl = window.location.origin;
    let productUrl = `${baseUrl}/product/${product.id}`;
    if (referralCode) {
      productUrl += `?ref=${referralCode}`;
    }
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`;

    const popup = window.open(fbUrl, "_blank", "width=600,height=600,noopener=no");

    const recordShare = () => {
      fetch(`/api/products/${product.id}/share`, { method: "POST" })
        .then(() => queryClient.invalidateQueries({ queryKey: ["/api/products"] }))
        .catch(() => {});
    };

    if (!popup) {
      window.location.href = fbUrl;
      return;
    }

    const openedAt = Date.now();
    const checker = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(checker);
          if (Date.now() - openedAt >= 3000) {
            recordShare();
          }
        }
      } catch {
        clearInterval(checker);
      }
    }, 700);

    setTimeout(() => clearInterval(checker), 5 * 60 * 1000);
  };

  return (
    <Link href={`/product/${product.id}`}>
      <Card className="cursor-pointer border border-emerald-400/30 bg-slate-950/55 text-emerald-50 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.7)] backdrop-blur-lg transition-all hover:bg-slate-950/65 hover:border-emerald-300/50 hover:shadow-[0_12px_30px_-12px_rgba(0,0,0,0.8)]" onClick={handleClick} data-testid={`card-product-${product.id}`}>
        <CardContent className="p-2 sm:p-3">
          <div className="relative mb-2 aspect-square overflow-hidden rounded-md bg-slate-950/40" data-testid={`img-product-main-${product.id}`}>
            <ImgWithFallback
              src={mainImage || undefined}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover"
            />
            {hasDiscount && (
              <span className="absolute left-1.5 top-1.5 z-10 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
                -{discountPct}%
              </span>
            )}
            {(product.soldCount ?? 0) > 0 && (
              <span className="absolute bottom-1.5 right-1.5 z-10 rounded bg-emerald-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow" data-testid={`text-sold-${product.id}`}>
                გაიყიდა {product.soldCount} ც
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center justify-between gap-1">
            <h3 className="truncate text-xs font-semibold leading-tight text-white sm:text-sm" data-testid={`text-product-name-${product.id}`}>
              {product.name}
            </h3>
            <div className="flex shrink-0 items-center gap-1 rounded bg-white/90 px-1.5 py-0.5 shadow-sm border border-white/70" data-testid={`text-views-${product.id}`}>
              <img src={eyeIconPath} alt="" className="h-3 w-3 rotate-180" />
              <span className="text-[10px] font-semibold text-black">{formatViews(product.viewCount ?? 0)}</span>
            </div>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {hasDiscount ? (
              <>
                <span className="text-xs font-bold text-emerald-300 sm:text-sm" data-testid={`text-price-discount-${product.id}`}>
                  {formatPrice(product.discountPrice)}
                </span>
                <span className="text-[10px] text-emerald-100/60 line-through sm:text-xs" data-testid={`text-price-original-${product.id}`}>
                  {formatPrice(product.originalPrice)}
                </span>
              </>
            ) : (
              <span className="text-xs font-bold text-emerald-300 sm:text-sm" data-testid={`text-price-${product.id}`}>
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleShare}
            className="mt-1 flex flex-col items-start gap-0 animate-pulse-share"
            data-testid={`button-share-${product.id}`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold sm:text-xs text-violet-300">დააგროვე კრედიტი</span>
              <Coins className="h-3.5 w-3.5 shrink-0" style={{ color: "#FDE68A", fill: "#F59E0B" }} />
              <Send className="h-3 w-3 shrink-0 text-violet-300" />
            </div>
            <span className="text-[9px] text-emerald-100/60 sm:text-[10px]" data-testid={`text-share-count-${product.id}`}>
              გადაზიარდა {product.shareCount ?? 0} ჯერ
            </span>
          </button>
        </CardContent>
      </Card>
    </Link>
  );
}

function getCategoryIcon(name: string) {
  const icons: Record<string, string> = {
    "სპინინგის ჯოხები": rodIcon,
    "სპინინგის კოჭები": reelIcon,
    "სპინინგის წნულები": lineIcon,
    "ვობლერები": wobblerIcon,
    "ტრიალები": spinnerIcon,
    "ყანყალები": jigIcon,
    "მორმიშინგი": mormishingIcon,
    "მორმიშკები": mormishingIcon,
    "ტანსაცმელი": vestIcon,
    "სპ.ჟილეტები": vestIcon,
  };
  return icons[name] || null;
}

function MobileBottomNav({
  onCategoriesOpen,
  onGuideOpen,
  onCartOpen,
  selectedCategory,
  onGoHome,
  onProfileClick,
  hasAdminRole,
  cartCount,
  chatUnreadCount,
}: {
  onCategoriesOpen: () => void;
  onGuideOpen: () => void;
  onCartOpen: () => void;
  selectedCategory: Category | null;
  onGoHome: () => void;
  onProfileClick: () => void;
  hasAdminRole: boolean;
  cartCount: number;
  chatUnreadCount: number;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-emerald-400/20 bg-slate-950/55 backdrop-blur-md md:hidden text-white" style={{ height: "56px", paddingBottom: "env(safe-area-inset-bottom)" }} data-testid="mobile-bottom-nav">
      <button
        onClick={onGoHome}
        className={`flex min-h-[40px] flex-1 flex-col items-center justify-center gap-0.5 text-xs font-bold transition-colors ${!selectedCategory ? "text-primary" : "text-muted-foreground"}`}
        data-testid="nav-home"
      >
        <Home className="h-5 w-5 text-emerald-400" />
        <span className="text-emerald-400">მთავარი</span>
      </button>
      <button
        onClick={onCategoriesOpen}
        className="flex min-h-[40px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground transition-colors"
        data-testid="nav-categories"
      >
        <LayoutGrid className="h-4 w-4" />
        <span>კატეგორიები</span>
      </button>
      <button
        onClick={onCartOpen}
        className="relative flex min-h-[40px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground transition-colors"
        data-testid="nav-cart"
      >
        <div className="relative">
          <ShoppingCart className="h-4 w-4" />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          )}
        </div>
        <span>კალათა</span>
      </button>
      <button
        onClick={onGuideOpen}
        className="flex min-h-[40px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground transition-colors"
        data-testid="nav-guide"
      >
        <BookOpen className="h-4 w-4" />
        <span>გზამკვლევი</span>
      </button>
      <button
        onClick={onProfileClick}
        className="relative flex min-h-[40px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground transition-colors"
        data-testid="nav-profile"
      >
        <div className="relative">
          <UserCircle className="h-4 w-4" />
        </div>
        <span>პროფილი</span>
      </button>
      {hasAdminRole && (
        <Link href="/admin-login">
          <div className="flex min-h-[40px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground transition-colors" data-testid="nav-admin">
            <Settings className="h-4 w-4" />
            <span>ადმინი</span>
          </div>
        </Link>
      )}
    </nav>
  );
}

function CategoryDrawer({
  open,
  onOpenChange,
  categories,
  selectedCategory,
  onCategoryClick,
  onGoHome,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  selectedCategory: Category | null;
  onCategoryClick: (cat: Category) => void;
  onGoHome: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl px-0 border-emerald-400/20" style={{ backgroundImage: `linear-gradient(rgba(2,6,23,0.78), rgba(2,6,23,0.85)), url(${mountainSceneBg})`, backgroundSize: "cover", backgroundPosition: "right center" }}>
        <SheetHeader className="px-5 pb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => onOpenChange(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors" data-testid="button-categories-back">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <SheetTitle className="text-lg font-bold text-white">კატეგორიები</SheetTitle>
          </div>
          <SheetDescription className="text-sm text-emerald-100/70">აირჩიეთ კატეგორია პროდუქციის სანახავად</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <button
            onClick={() => { onGoHome(); onOpenChange(false); }}
            className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-base font-medium transition-colors ${
              !selectedCategory
                ? "bg-emerald-500/20 text-emerald-300 font-semibold ring-1 ring-emerald-400/40"
                : "text-emerald-50 hover:bg-emerald-500/15 hover:text-emerald-200"
            }`}
            data-testid="drawer-cat-all"
          >
            <Home className="h-6 w-6" />
            კატალოგი
          </button>
          <div className="mt-1 space-y-1">
            {categories.map((cat) => {
              const icon = getCategoryIcon(cat.name);
              const isActive = selectedCategory?.id === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => { onCategoryClick(cat); onOpenChange(false); }}
                  className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-base font-medium transition-colors ${
                    isActive
                      ? "bg-emerald-500/20 text-emerald-300 font-semibold ring-1 ring-emerald-400/40"
                      : "text-emerald-50 hover:bg-emerald-500/15 hover:text-emerald-200"
                  }`}
                  data-testid={`drawer-cat-${cat.id}`}
                >
                  {icon ? <img src={icon} alt="" className={`${cat.name === "სპინინგის კოჭები" ? "h-9 w-9" : "h-7 w-7"} shrink-0 object-contain drop-shadow`} /> : cat.icon ? <LucideIcon name={cat.icon} className="h-5 w-5 shrink-0" /> : null}
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SearchDrawer({
  open,
  onOpenChange,
  products,
  referralCode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[] | undefined;
  referralCode?: string | null;
}) {
  const [query, setQuery] = useState("");

  const filtered = query.trim().length > 0
    ? (products || []).filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(query.toLowerCase()))
      )
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="top" className="h-[85vh] px-0 border-emerald-400/20" style={{ backgroundImage: `linear-gradient(rgba(2,6,23,0.78), rgba(2,6,23,0.85)), url(${mountainSceneBg})`, backgroundSize: "cover", backgroundPosition: "right center" }}>
        <SheetHeader className="px-5 pb-2">
          <div className="flex items-center gap-3">
            <button onClick={() => onOpenChange(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors" data-testid="button-search-back">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <SheetTitle className="text-lg font-bold text-white">ძებნა</SheetTitle>
          </div>
          <SheetDescription className="text-sm text-emerald-100/70">მოძებნეთ კატალოგში</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-200/70" />
            <input
              type="search"
              placeholder="მოძებნე..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-emerald-400/30 bg-slate-950/50 text-white placeholder:text-emerald-100/40 pl-10 pr-4 text-base outline-none focus:ring-2 focus:ring-emerald-400/50 backdrop-blur-md"
              autoFocus
              data-testid="input-search"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-200/70" data-testid="button-clear-search">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {query.trim().length === 0 ? (
            <p className="pt-6 text-center text-sm text-emerald-100/70">ჩაწერეთ სახელი ძებნისთვის</p>
          ) : filtered.length === 0 ? (
            <p className="pt-6 text-center text-sm text-emerald-100/70">არაფერი მოიძებნა</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((product) => (
                <div key={product.id} onClick={() => onOpenChange(false)}>
                  <ProductCard product={product} referralCode={referralCode} />
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function HomePage() {
  const [, setLocation] = useLocation();
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const { user, isAuthenticated } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [heroSlide, setHeroSlide] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setHeroSlide((s) => (s + 1) % HERO_SLIDES.length);
    }, HERO_SLIDE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
  const hasAdminRole = !!(user && user.role && ["admin", "moderator", "sales_admin"].includes(user.role));
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [searchDrawerOpen, setSearchDrawerOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideSiteOpen, setGuideSiteOpen] = useState(false);
  const [guideCreditOpen, setGuideCreditOpen] = useState(false);
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const { totalCount: cartCount } = useCart();
  const { canInstall, install: installPwa } = usePwaInstall();
  const { data: onlineData } = useQuery<{ count: number }>({
    queryKey: ["/api/online-count"],
    refetchInterval: 30_000,
  });

  const displayOnline = onlineData ? onlineData.count : null;

  const [installDialogOpen, setInstallDialogOpen] = useState(false);

  interface VisualPublic {
    selectedLogo: number | null;
    uploadedLogos: { src: string; label: string }[];
    text: string;
    customText: string;
    font: string;
    fontSize: string;
    textColor: string;
    isBold: boolean;
    isItalic: boolean;
    customTextColor?: string;
    customTextItalic?: boolean;
  }

  const { data: visualSettings } = useQuery<VisualPublic | null>({
    queryKey: ["/api/visual-settings/public"],
  });

  const { data: termsSections = [] } = useQuery<TermsSection[]>({
    queryKey: ["/api/terms-sections"],
  });

  const allLogos = [...BUILTIN_LOGOS, ...(visualSettings?.uploadedLogos || [])];
  const heroLogoSrc = visualSettings?.selectedLogo !== null && visualSettings?.selectedLogo !== undefined && allLogos[visualSettings.selectedLogo]
    ? allLogos[visualSettings.selectedLogo].src
    : fishermanLogo;
  const heroText = visualSettings?.text || "spiningebi.ge";
  const heroSubtitle = visualSettings?.customText || "საუკეთესო სასპინინგე ინვენტარი ჩვენთან!";
  const heroFont = visualSettings?.font || "FiraGO";
  const heroTextColor = visualSettings?.textColor && visualSettings.textColor !== "transparent" ? visualSettings.textColor : undefined;
  const heroIsBold = visualSettings?.isBold ?? true;
  const heroIsItalic = visualSettings?.isItalic ?? false;

  useEffect(() => {
    const openCreditGuide = () => {
      setGuideOpen(true);
      setGuideCreditOpen(true);
      setTimeout(() => {
        const el = document.querySelector('[data-testid="button-guide-credit"]');
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 250);
    };
    const params = new URLSearchParams(window.location.search);
    if (params.get("guide") === "credit") {
      openCreditGuide();
      window.history.replaceState({}, "", window.location.pathname);
    }
    window.addEventListener("open-credit-guide", openCreditGuide);
    return () => window.removeEventListener("open-credit-guide", openCreditGuide);
  }, []);

  const { data: profileData } = useQuery<any>({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAuthenticated,
  });
  const referralCode = profileData?.referralCode || null;

  const { data: chatUnreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/chat/unread-count"],
    enabled: isAuthenticated,
    refetchInterval: 10000,
  });
  const chatUnreadCount = chatUnreadData?.count ?? 0;

  // Request notification permission once user is authenticated
  useEffect(() => {
    if (isAuthenticated) requestNotificationPermission();
  }, [isAuthenticated]);

  // Show browser pop-up notification when admin/bot sends a new message
  const prevChatUnreadRef = useRef(0);
  useEffect(() => {
    if (chatUnreadCount > prevChatUnreadRef.current) {
      showNotification("💬 ახალი შეტყობინება", "spiningebi.ge ადმინი გიპასუხა — გახსენი LIVE კონტაქტი", {
        tag: "chat-reply",
        onClick: () => { window.location.href = "/live-contact"; },
      });
    }
    prevChatUnreadRef.current = chatUnreadCount;
  }, [chatUnreadCount]);

  const { data: categoryProducts, isLoading: isCategoryLoading } = useQuery<Product[]>({
    queryKey: ["/api/products/category", selectedCategory?.id],
    queryFn: async () => {
      const res = await fetch(`/api/products/category/${selectedCategory!.id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedCategory,
  });

  const handleCategoryClick = (cat: Category) => {
    setSelectedCategory(cat);
  };

  const handleGoHome = () => {
    setSelectedCategory(null);
  };

  const handleProfileClick = () => {
    if (isAuthenticated) {
      window.location.href = "/profile";
    } else {
      setAuthDialogOpen(true);
    }
  };

  const renderProductGrid = (items: Product[] | undefined, loading: boolean, emptyMsg: string) => {
    if (loading) {
      return (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-card-border bg-card">
              <CardContent className="p-2 sm:p-3">
                <Skeleton className="mb-2 aspect-square w-full rounded-md" />
                <Skeleton className="mb-1 h-4 w-3/4" />
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }
    if (!items || items.length === 0) {
      return (
        <GlassPanel className="p-10">
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
            <ImageOff className="mb-3 h-12 w-12 opacity-30" />
            <p className="text-lg font-medium">{emptyMsg}</p>
            <p className="mt-1 text-sm">დაამატეთ პროდუქტები ადმინ პანელიდან.</p>
          </div>
        </GlassPanel>
      );
    }
    return (
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} referralCode={referralCode} />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-20 md:pb-0">
      <div
        className="relative z-10 aspect-[2/1] w-full overflow-hidden rounded-none sm:aspect-[5/1] lg:aspect-[7.5/1]"
      >
        {HERO_SLIDES.map((slide, idx) => (
          <picture key={idx}>
            <source media="(max-width: 639px)" srcSet={slide.mobile} />
            <img
              src={slide.desktop}
              alt="spiningebi.ge"
              className={`absolute inset-0 block h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${idx === heroSlide ? "opacity-100" : "opacity-0"}`}
              data-testid={idx === 0 ? "img-hero" : `img-hero-${idx}`}
            />
          </picture>
        ))}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-black/55 to-transparent" />
        <div className="absolute inset-x-0 top-0 flex items-start pl-10 pr-3 pt-2 sm:pl-20 sm:pr-8 sm:pt-4 lg:pl-32 lg:pr-16">
          <div className="flex items-center gap-2 sm:gap-5">
            <button onClick={handleGoHome} className="shrink-0 hover:opacity-80 transition-opacity" data-testid="img-logo-btn">
              <img
                src={cacheBust(heroLogoSrc)}
                alt="მთავარი"
                className="h-14 w-14 rounded-full border-2 border-emerald-500 bg-emerald-500 object-contain shadow-lg sm:h-16 sm:w-16 lg:h-20 lg:w-20"
                data-testid="img-logo"
                onError={(e) => { e.currentTarget.src = fishermanLogo; }}
              />
            </button>
            <div className="flex min-w-0 flex-col">
              <h1
                onClick={handleGoHome}
                className="cursor-pointer tracking-wide drop-shadow-lg text-xl leading-tight sm:text-3xl lg:text-4xl hover:opacity-80 transition-opacity"
                style={{
                  fontFamily: heroFont,
                  color: heroTextColor || "#ffffff",
                  fontWeight: heroIsBold ? "bold" : "normal",
                  fontStyle: heroIsItalic ? "italic" : "normal",
                }}
                data-testid="text-hero-title"
              >
                {heroText}
              </h1>
              <p
                className="mt-0.5 text-xs leading-tight drop-shadow sm:mt-1 sm:text-base lg:text-lg"
                style={{
                  fontFamily: heroFont,
                  color: visualSettings?.customTextColor
                    ? visualSettings.customTextColor
                    : heroTextColor ? `${heroTextColor}cc` : "rgba(255,255,255,0.8)",
                  fontStyle: (visualSettings?.customTextItalic ?? heroIsItalic) ? "italic" : "normal",
                }}
              >
                {heroSubtitle}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-0"
        style={{
          width: "100vw",
          height: "100vh",
          backgroundImage: `url(${mountainSceneBg})`,
          backgroundSize: "cover",
          backgroundPosition: "right center",
          backgroundRepeat: "no-repeat",
          transform: "translateZ(0)",
          willChange: "transform",
        }}
      />
      <div aria-hidden className="pointer-events-none fixed top-0 left-0 z-0 bg-gradient-to-b from-slate-950/45 via-slate-900/30 to-slate-950/50" style={{ width: "100vw", height: "100vh" }} />
      <div className="relative z-10">

      {/* Mobile-only online counter */}
      {displayOnline !== null && (
        <div className="relative md:hidden flex justify-center py-1" data-testid="badge-online-count-mobile">
          <div className="flex items-center gap-1.5 rounded-full border border-red-300/50 bg-red-500/20 backdrop-blur-sm px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-xs font-semibold text-red-100">ახლა საიტზეა {displayOnline} ვიზიტორი</span>
          </div>
        </div>
      )}

      <div className="relative mx-auto hidden max-w-6xl px-4 pb-4 pt-3 sm:px-6 md:block lg:px-8">
        <nav className="flex items-center justify-between rounded-2xl bg-slate-950/45 backdrop-blur-md border border-emerald-400/25 shadow-lg px-4 py-2.5">
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={handleGoHome} data-testid="link-nav-home"
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[13px] font-semibold transition-all whitespace-nowrap ${!selectedCategory ? "bg-primary/10 text-primary" : "text-foreground/70 hover:bg-muted hover:text-primary"}`}>
              <Home className="h-4 w-4 shrink-0 text-emerald-400" />
              <span className="text-emerald-400">მთავარი</span>
            </button>
            <button onClick={() => setGuideOpen(true)} data-testid="link-nav-guide"
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[13px] font-semibold text-foreground/70 hover:bg-muted hover:text-primary transition-all whitespace-nowrap">
              <BookOpen className="h-4 w-4 shrink-0" />
              გზამკვლევი
            </button>
            <button onClick={() => setLocation("/terms")} data-testid="link-nav-terms"
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[13px] font-semibold text-foreground/70 hover:bg-muted hover:text-primary transition-all whitespace-nowrap">
              <ScrollText className="h-4 w-4 shrink-0" />
              წესები და პირობები
            </button>
            <button onClick={() => setLocation("/about")} data-testid="link-nav-about"
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[13px] font-semibold text-foreground/70 hover:bg-muted hover:text-primary transition-all whitespace-nowrap">
              <Info className="h-4 w-4 shrink-0" />
              ჩვენს შესახებ
            </button>
            {canInstall && (
              <button onClick={() => setInstallDialogOpen(true)} data-testid="link-nav-install"
                className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[13px] font-semibold text-green-600 hover:bg-green-50 hover:text-green-700 transition-all animate-pulse whitespace-nowrap">
                <Download className="h-4 w-4 shrink-0" />
                ჩამოტვირთვა
              </button>
            )}
          </div>

          {/* Online visitor counter */}
          {displayOnline !== null && (
            <div className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 shrink-0 mx-2" data-testid="badge-online-count">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
              </span>
              <span className="text-[12px] font-semibold text-red-700 whitespace-nowrap">საიტზეა {displayOnline}</span>
            </div>
          )}

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => setCartDrawerOpen(true)}
              className="relative flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[13px] font-semibold text-foreground/70 hover:bg-muted hover:text-primary transition-all whitespace-nowrap"
              data-testid="link-cart-desktop"
            >
              <div className="relative">
                <ShoppingCart className="h-4 w-4 shrink-0" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </div>
              კალათა
            </button>
            <button
              onClick={handleProfileClick}
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[13px] font-semibold text-foreground/70 hover:bg-muted hover:text-primary transition-all whitespace-nowrap"
              data-testid="link-profile-desktop"
            >
              <UserCircle className="h-4 w-4 shrink-0" />
              პროფილი
            </button>
            {hasAdminRole && (
              <Link href="/admin-login">
                <span className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[13px] font-semibold text-foreground/70 hover:bg-muted hover:text-primary transition-all whitespace-nowrap" data-testid="link-admin-panel">
                  <Settings className="h-4 w-4 shrink-0" />
                  ადმინ
                </span>
              </Link>
            )}
          </div>
        </nav>
      </div>

        <div className="relative mx-auto max-w-6xl px-3 pt-4 pb-6 sm:px-6 sm:py-8 lg:px-8 lg:pt-6">
          <div className="flex flex-col gap-4 md:gap-6 lg:flex-row lg:items-start lg:gap-6">
            <aside className="hidden w-full shrink-0 lg:sticky lg:top-6 lg:block lg:w-64 lg:self-start lg:mt-10">
              <div className="rounded-xl border border-emerald-400/25 bg-slate-950/45 p-5 shadow-lg backdrop-blur-md">
                <h3 className="mb-4 flex items-center gap-2.5 text-base font-bold text-white">
                  <ShoppingBag className="h-5 w-5 text-emerald-400" />
                  კატალოგი
                </h3>
                {categories && categories.length > 0 ? (
                  <nav className="space-y-1.5" data-testid="sidebar-categories">
                    {categories.map((cat) => {
                      const icon = getCategoryIcon(cat.name);
                      const isActive = selectedCategory?.id === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => handleCategoryClick(cat)}
                          className={`flex min-h-[44px] w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-base font-medium transition-colors ${
                            isActive
                              ? "bg-emerald-500/20 text-emerald-300 font-semibold ring-1 ring-emerald-400/40"
                              : "text-emerald-50 hover:bg-emerald-500/15 hover:text-emerald-200"
                          }`}
                          data-testid={`sidebar-item-${cat.id}`}
                        >
                          {icon ? (
                            <img src={icon} alt="" className="h-7 w-7 shrink-0 object-contain drop-shadow" />
                          ) : cat.icon ? (
                            <LucideIcon name={cat.icon} className="h-5 w-5 shrink-0" />
                          ) : null}
                          {cat.name}
                        </button>
                      );
                    })}
                  </nav>
                ) : (
                  <p className="text-sm text-emerald-100/70">კატეგორიები ჯერ არ არის</p>
                )}
              </div>
            </aside>

            <div className="flex-1 min-w-0">
              <AnimatedShell>
                {selectedCategory ? (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      {getCategoryIcon(selectedCategory.name) ? (
                        <img src={getCategoryIcon(selectedCategory.name)!} alt="" className="h-7 w-7 object-contain sm:h-8 sm:w-8 drop-shadow" />
                      ) : selectedCategory.icon ? (
                        <LucideIcon name={selectedCategory.icon} className="h-6 w-6 text-emerald-400" />
                      ) : null}
                      <h2 className="text-lg font-bold text-white drop-shadow sm:text-xl">{selectedCategory.name}</h2>
                    </div>
                    {renderProductGrid(categoryProducts, isCategoryLoading, "ამ კატეგორიაში პროდუქტები ჯერ არ არის")}
                  </>
                ) : (
                  <>
                    <h2 className="mb-3 text-center text-lg font-bold text-white drop-shadow-lg sm:text-xl" data-testid="text-section-title"><span className="text-red-500">TOP</span>-გაყიდვადი პროდუქცია</h2>
                    {renderProductGrid(
                      products
                        ? [...products].sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0)).slice(0, 16)
                        : undefined,
                      isLoading,
                      "პროდუქტები ჯერ არ არის დამატებული"
                    )}
                  </>
                )}
              </AnimatedShell>
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />

      {isAuthenticated && !hasAdminRole && (
        <button
          onClick={() => setLocation("/live-contact")}
          className="float-above-nav fixed right-4 md:right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_4px_14px_rgba(0,0,0,0.25)] hover:bg-emerald-600 hover:shadow-[0_6px_20px_rgba(0,0,0,0.3)] active:scale-95 transition-all duration-200"
          aria-label="ცოცხალი ჩათი"
          data-testid="button-chat-bubble"
        >
          <MessageCircle className="h-6 w-6" />
          {chatUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white" data-testid="badge-chat-unread">
              {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
            </span>
          )}
        </button>
      )}

      <MobileBottomNav
        onCategoriesOpen={() => setCategoryDrawerOpen(true)}
        onGuideOpen={() => setGuideOpen(true)}
        onCartOpen={() => setCartDrawerOpen(true)}
        selectedCategory={selectedCategory}
        onGoHome={handleGoHome}
        onProfileClick={handleProfileClick}
        hasAdminRole={hasAdminRole}
        cartCount={cartCount}
        chatUnreadCount={chatUnreadCount}
      />

      <CartDrawer open={cartDrawerOpen} onOpenChange={setCartDrawerOpen} />

      <AuthLoginDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
      />

      {categories && (
        <CategoryDrawer
          open={categoryDrawerOpen}
          onOpenChange={setCategoryDrawerOpen}
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryClick={handleCategoryClick}
          onGoHome={handleGoHome}
        />
      )}

      <SearchDrawer
        open={searchDrawerOpen}
        onOpenChange={setSearchDrawerOpen}
        products={products}
        referralCode={referralCode}
      />

      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent
          className="max-w-lg max-h-[85vh] overflow-y-auto border-white/15 text-white"
          style={{
            backgroundImage: `linear-gradient(rgba(2,6,23,0.82), rgba(2,6,23,0.88)), url(${mountainSceneBg})`,
            backgroundSize: "cover",
            backgroundPosition: "right center",
          }}
        >
          <DialogHeader>
            <DialogTitle className="sr-only">გზამკვლევი</DialogTitle>
            <DialogDescription className="sr-only">ინფორმაცია</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="rounded-xl border border-white/15 bg-white/5 backdrop-blur-md overflow-hidden">
              <button
                type="button"
                onClick={() => setGuideSiteOpen(!guideSiteOpen)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-white/5 transition-colors"
                data-testid="button-guide-site"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20">
                    <BookOpen className="h-4.5 w-4.5 text-emerald-300" />
                  </div>
                  <span className="text-sm font-bold text-white">როგორ მუშაობს ჩვენი საიტი</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-white/60 transition-transform ${guideSiteOpen ? "rotate-180" : ""}`} />
              </button>
              {guideSiteOpen && (
                <div className="space-y-3 border-t border-white/10 px-4 pb-4 pt-3">
                  <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-3">
                    <h4 className="mb-1 text-sm font-bold flex items-center gap-2 text-white">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">1</span>
                      აირჩიეთ კატალოგიდან
                    </h4>
                    <p className="text-xs text-white/75 leading-relaxed">
                      დაათვალიერეთ ჩვენი პროდუქტები კატეგორიებით ან მოძებნეთ საძიებო ველით. დააჭირეთ პროდუქტის სურათს დეტალური ინფორმაციისთვის.
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-3">
                    <h4 className="mb-1 text-sm font-bold flex items-center gap-2 text-white">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">2</span>
                      შეუკვეთეთ
                    </h4>
                    <p className="text-xs text-white/75 leading-relaxed">
                      პროდუქტის გვერდზე დააჭირეთ "ყიდვა" ღილაკს, აირჩიეთ ფერი და რაოდენობა, შეავსეთ მისამართი და ტელეფონის ნომერი. შეკვეთა გაიგზავნება ავტომატურად.
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-3">
                    <h4 className="mb-1 text-sm font-bold flex items-center gap-2 text-white">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">3</span>
                      პროფილი და შეკვეთები
                    </h4>
                    <p className="text-xs text-white/75 leading-relaxed">
                      პროფილის გვერდზე ნახავთ თქვენს მონაცემებს, შეკვეთების ისტორიას და დაგროვილ კრედიტს. პროფილში შეგიძლიათ შეცვალოთ მისამართი და ტელეფონის ნომერი.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/15 bg-white/5 backdrop-blur-md overflow-hidden">
              <button
                type="button"
                onClick={() => setGuideCreditOpen(!guideCreditOpen)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-white/5 transition-colors"
                data-testid="button-guide-credit"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(255,107,53,0.2)" }}>
                    <Gift className="h-4.5 w-4.5" style={{ color: "#FFB088" }} />
                  </div>
                  <span className="text-sm font-bold text-white">როგორ დავაგროვოთ კრედიტი</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-white/60 transition-transform ${guideCreditOpen ? "rotate-180" : ""}`} />
              </button>
              {guideCreditOpen && (
                <div className="space-y-3 border-t border-white/10 px-4 pb-4 pt-3">
                  <div className="rounded-lg border border-orange-400/30 bg-orange-500/10 backdrop-blur-sm p-3">
                    <h4 className="mb-1 text-sm font-bold" style={{ color: "#FFB088" }}>გააზიარეთ</h4>
                    <p className="text-xs text-white/75 leading-relaxed">
                      აირჩიეთ ნებისმიერი პროდუქტი ჩვენს საიტზე და დააჭირეთ ღილაკს "გააზიარე Facebook-ზე".
                    </p>
                  </div>
                  <div className="rounded-lg border border-orange-400/30 bg-orange-500/10 backdrop-blur-sm p-3">
                    <h4 className="mb-1 text-sm font-bold" style={{ color: "#FFB088" }}>მოიწვიეთ მეთევზეები</h4>
                    <p className="text-xs text-white/75 leading-relaxed">
                      გააზიარეთ ბმული თქვენს კედელზე ან თემატურ სათევზაო ჯგუფებში.
                    </p>
                  </div>
                  <div className="rounded-lg border border-orange-400/30 bg-orange-500/10 backdrop-blur-sm p-3">
                    <h4 className="mb-1 text-sm font-bold" style={{ color: "#FFB088" }}>დააგროვეთ</h4>
                    <p className="text-xs text-white/75 leading-relaxed">
                      ყოველ ჯერზე, როცა ვინმე თქვენი ბმულით შემოვა და შეიძენს ნივთს (ნებისმიერი ღირებულების), თქვენს პირად პროფილში, სექციაში "ჩემი კრედიტი", ავტომატურად დაგერიცხებათ 1.50 ლარი.
                    </p>
                  </div>
                  <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 backdrop-blur-sm p-3">
                    <h4 className="mb-1 text-sm font-bold text-blue-200">🛒 როგორ გამოვიყენოთ კრედიტი?</h4>
                    <p className="text-xs text-white/75 leading-relaxed">
                      როდესაც დააგროვებთ სასურველი ნივთის შესაბამის კრედიტს, შეკვეთის გაფორმებისას აირჩიეთ "კრედიტით გადახდა". თქვენ ნივთს მიიღებთ სრულიად უფასოდ!
                    </p>
                  </div>
                  <div className="rounded-lg border border-red-400/30 bg-red-500/10 backdrop-blur-sm p-3">
                    <h4 className="mb-1.5 text-sm font-bold text-red-200">⚠️ მნიშვნელოვანი წესები</h4>
                    <ul className="space-y-1.5 text-xs text-white/75 leading-relaxed">
                      <li><span className="font-semibold text-white">მხოლოდ ნივთები:</span> ვირტუალური კრედიტის გამოყენება შესაძლებელია მხოლოდ საიტზე არსებული პროდუქციის შესაძენად.</li>
                      <li><span className="font-semibold text-white">არ გადაიცვლება ფულზე:</span> დაგროვილი კრედიტების განაღდება ან რეალურ ფულში გადაცვლა არ ხდება.</li>
                      <li><span className="font-semibold text-white">სამართლიანი თამაში:</span> კრედიტი ირიცხება მხოლოდ რეალურ გაყიდვაზე. საკუთარი რეფერალური ბმულით ნივთის შეძენა არ დაიშვება.</li>
                    </ul>
                  </div>
                  <div className="rounded-lg border border-green-400/30 bg-green-500/10 backdrop-blur-sm p-3">
                    <h4 className="mb-1.5 text-sm font-bold text-green-200">💡 რჩევები მეტი კრედიტისთვის</h4>
                    <ul className="space-y-1.5 text-xs text-white/75 leading-relaxed">
                      <li>გააზიარეთ ნივთები იმ ჯგუფებში, სადაც მეთევზეები კონკრეტულ რჩევებს ეძებენ.</li>
                      <li>დაურთეთ თქვენი პირადი რეკომენდაცია გაზიარებულ პოსტს — რეალურ გამოცდილებას უფრო მეტი ადამიანი ენდობა!</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={installDialogOpen} onOpenChange={setInstallDialogOpen}>
        <DialogContent className="max-w-md w-[92vw] p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
          <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 px-6 pt-8 pb-6 text-center">
            <div className="mx-auto mb-4 h-24 w-24 rounded-2xl bg-white/20 p-3 backdrop-blur-sm shadow-lg ring-2 ring-white/30">
              <img src={fishermanLogo} alt="spiningebi.ge" className="h-full w-full object-contain drop-shadow-lg" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">spiningebi.ge</h2>
            <p className="text-purple-200 text-sm">სათევზაო და სანადირო მაღაზია</p>
          </div>
          <div className="px-6 py-5">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-center text-lg font-bold">
                დააინსტალირეთ აპლიკაცია
              </DialogTitle>
              <DialogDescription className="text-center text-sm text-muted-foreground mt-1">
                სწრაფი წვდომა თქვენს საყვარელ პროდუქციაზე
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mb-5">
              <div className="flex items-center gap-3 rounded-lg bg-purple-50 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                  <Download className="h-4 w-4 text-purple-600" />
                </div>
                <span className="text-sm text-gray-700">ერთი კლიკით გახსნა ეკრანიდან</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-green-50 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                  <ShoppingCart className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-sm text-gray-700">სწრაფი შეკვეთა და ნავიგაცია</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <Gift className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-sm text-gray-700">შეტყობინებები აქციებზე და ფასდაკლებებზე</span>
              </div>
            </div>
            <button
              onClick={async () => {
                await installPwa();
                setInstallDialogOpen(false);
              }}
              className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3.5 text-base font-bold text-white shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all active:scale-[0.98]"
              data-testid="button-install-confirm"
            >
              <Download className="inline mr-2 h-5 w-5 -mt-0.5" />
              ჩამოტვირთვა
            </button>
            <button
              onClick={() => setInstallDialogOpen(false)}
              className="w-full mt-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-install-cancel"
            >
              არა, მადლობა
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={termsDialogOpen} onOpenChange={setTermsDialogOpen}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <ScrollText className="h-6 w-6 text-purple-600" />
              წესები და პირობები
            </DialogTitle>
            <DialogDescription className="sr-only">წესები და პირობები</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-3" data-testid="terms-dialog-content">
            {termsSections.length > 0 ? (
              termsSections
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((section) => (
                  <div key={section.id} className="rounded-lg border border-muted bg-muted/20 p-5">
                    <h4 className="mb-3 text-base font-bold text-foreground" data-testid={`terms-title-${section.id}`}>{section.title}</h4>
                    <p className="text-[15px] text-muted-foreground whitespace-pre-wrap leading-7" data-testid={`terms-content-${section.id}`}>{section.content}</p>
                  </div>
                ))
            ) : (
              <div className="rounded-lg border border-muted bg-muted/20 p-8 text-center">
                <ScrollText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-base text-muted-foreground">მალე დაემატება</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
