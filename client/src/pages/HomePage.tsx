import { useState, useEffect } from "react";
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
import { ImageOff, Home, ShoppingBag, Settings, Search, SlidersHorizontal, X, LayoutGrid, ShoppingCart, Share2, UserCircle, BookOpen, ChevronDown, Gift, ArrowLeft } from "lucide-react";
import { LucideIcon } from "@/components/IconPicker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Link } from "wouter";
import { useCategories } from "@/hooks/use-categories";
import type { Product, Category } from "@shared/schema";
import wobblerIcon from "@assets/image_1771887558144.png";
import rodIcon from "@assets/image_1771887805060.png";
import reelIcon from "@assets/image_1771887952843.png";
import lineIcon from "@assets/image_1771888120512.png";
import jigIcon from "@assets/image_1771888304367.png";
import spinnerIcon from "@assets/image_1771888431502.png";
import vestIcon from "@assets/image_1772362338173.png";
import fishermanLogo from "@assets/fisherman_transparent.png";
import eyeIconPath from "@assets/image_1771961384457.png";

const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='250' fill='%23e2e8f0'%3E%3Crect width='400' height='250'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='%2394a3b8'%3E%E1%83%A1%E1%83%A3%E1%83%A0%E1%83%90%E1%83%97%E1%83%98 %E1%83%90%E1%83%A0 %E1%83%90%E1%83%A0%E1%83%98%E1%83%A1%3C/text%3E%3C/svg%3E";

function ImgWithFallback({
  src,
  alt,
  className,
  ...rest
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [errored, setErrored] = useState(false);
  return (
    <img
      src={errored || !src ? PLACEHOLDER_IMG : src}
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
    window.open(fbUrl, "_blank", "width=600,height=400");
  };

  return (
    <Link href={`/product/${product.id}`}>
      <Card className="cursor-pointer border-card-border bg-card transition-shadow hover:shadow-lg" onClick={handleClick} data-testid={`card-product-${product.id}`}>
        <CardContent className="p-2 sm:p-3">
          <div className="relative mb-2 overflow-hidden rounded-md bg-muted">
            <ImgWithFallback
              src={mainImage || undefined}
              alt={product.name}
              loading="lazy"
              className="aspect-square w-full object-cover transition-transform duration-200 hover:scale-105"
              data-testid={`img-product-main-${product.id}`}
            />
            {hasDiscount && (
              <span className="absolute left-1.5 top-1.5 z-10 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
                -{discountPct}%
              </span>
            )}
            {(product.soldCount ?? 0) > 0 && (
              <span className="absolute bottom-1.5 right-1.5 z-10 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 shadow" data-testid={`text-sold-${product.id}`}>
                გაიყიდა {product.soldCount} ც
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center justify-between gap-1">
            <h3 className="truncate text-xs font-semibold leading-tight sm:text-sm" data-testid={`text-product-name-${product.id}`}>
              {product.name}
            </h3>
            <div className="flex shrink-0 items-center gap-1 rounded bg-white px-1.5 py-0.5 shadow-sm border border-muted" data-testid={`text-views-${product.id}`}>
              <img src={eyeIconPath} alt="" className="h-3 w-3 rotate-180" />
              <span className="text-[10px] font-semibold text-black">{formatViews(product.viewCount ?? 0)}</span>
            </div>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {hasDiscount ? (
              <>
                <span className="text-xs font-bold text-foreground sm:text-sm" data-testid={`text-price-discount-${product.id}`}>
                  {formatPrice(product.discountPrice)}
                </span>
                <span className="text-[10px] text-muted-foreground line-through sm:text-xs" data-testid={`text-price-original-${product.id}`}>
                  {formatPrice(product.originalPrice)}
                </span>
              </>
            ) : (
              <span className="text-xs font-bold text-foreground sm:text-sm" data-testid={`text-price-${product.id}`}>
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleShare}
            className="mt-1 flex items-center gap-1.5 animate-pulse-share"
            data-testid={`button-share-${product.id}`}
          >
            <span className="text-[10px] font-bold sm:text-xs" style={{ color: "#FF6B35" }}>დააგროვე კრედიტი</span>
            <Share2 className="h-3.5 w-3.5 shrink-0" style={{ color: "#FF6B35" }} />
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
}: {
  onCategoriesOpen: () => void;
  onGuideOpen: () => void;
  onCartOpen: () => void;
  selectedCategory: Category | null;
  onGoHome: () => void;
  onProfileClick: () => void;
  hasAdminRole: boolean;
  cartCount: number;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-border bg-card/95 backdrop-blur-md md:hidden" style={{ height: "56px", paddingBottom: "env(safe-area-inset-bottom)" }} data-testid="mobile-bottom-nav">
      <button
        onClick={onGoHome}
        className={`flex min-h-[40px] flex-1 flex-col items-center justify-center gap-0.5 text-xs font-bold transition-colors ${!selectedCategory ? "text-primary" : "text-muted-foreground"}`}
        data-testid="nav-home"
      >
        <Home className="h-5 w-5" />
        <span>მთავარი</span>
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
        className="flex min-h-[40px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground transition-colors"
        data-testid="nav-profile"
      >
        <UserCircle className="h-4 w-4" />
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
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl px-0">
        <SheetHeader className="px-5 pb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => onOpenChange(false)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted transition-colors" data-testid="button-categories-back">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <SheetTitle className="text-lg font-bold">კატეგორიები</SheetTitle>
          </div>
          <SheetDescription className="text-sm text-muted-foreground">აირჩიეთ კატეგორია პროდუქციის სანახავად</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <button
            onClick={() => { onGoHome(); onOpenChange(false); }}
            className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-base font-medium transition-colors ${
              !selectedCategory
                ? "bg-primary/10 text-primary font-semibold"
                : "text-foreground hover:bg-muted"
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
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-muted"
                  }`}
                  data-testid={`drawer-cat-${cat.id}`}
                >
                  {icon ? <img src={icon} alt="" className="h-7 w-7 shrink-0 object-contain" /> : cat.icon ? <LucideIcon name={cat.icon} className="h-5 w-5 shrink-0" /> : null}
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
      <SheetContent side="top" className="h-[85vh] px-0">
        <SheetHeader className="px-5 pb-2">
          <div className="flex items-center gap-3">
            <button onClick={() => onOpenChange(false)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted transition-colors" data-testid="button-search-back">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <SheetTitle className="text-lg font-bold">ძებნა</SheetTitle>
          </div>
          <SheetDescription className="text-sm text-muted-foreground">მოძებნეთ კატალოგში</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="მოძებნე..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-input bg-background pl-10 pr-4 text-base outline-none ring-ring focus:ring-2"
              autoFocus
              data-testid="input-search"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" data-testid="button-clear-search">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {query.trim().length === 0 ? (
            <p className="pt-6 text-center text-sm text-muted-foreground">ჩაწერეთ სახელი ძებნისთვის</p>
          ) : filtered.length === 0 ? (
            <p className="pt-6 text-center text-sm text-muted-foreground">არაფერი მოიძებნა</p>
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
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const { user, isAuthenticated } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const hasAdminRole = !!(user && user.role && ["admin", "moderator", "sales_admin"].includes(user.role));
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [searchDrawerOpen, setSearchDrawerOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideSiteOpen, setGuideSiteOpen] = useState(false);
  const [guideCreditOpen, setGuideCreditOpen] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const { totalCount: cartCount } = useCart();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("guide") === "credit") {
      setGuideOpen(true);
      setGuideCreditOpen(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
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
    <div className="min-h-screen bg-mesh pb-20 md:pb-0">
      <div className="relative mb-4 overflow-hidden rounded-none sm:mb-8 sm:rounded-b-2xl">
        <img
          src="/images/hero-fishing.png"
          alt="მეთევზეობა"
          className="h-36 w-full object-cover sm:h-56 lg:h-64"
          data-testid="img-hero"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-center px-4 sm:px-12 lg:px-20">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-wide text-white drop-shadow-lg sm:gap-3 sm:text-4xl lg:text-5xl" data-testid="text-hero-title">
            <img src={fishermanLogo} alt="" className="h-10 w-10 rounded-full border-2 border-emerald-500 bg-emerald-500 object-contain shadow-lg sm:h-14 sm:w-14 lg:h-16 lg:w-16" data-testid="img-logo" />
            spiningebi.ge
          </h1>
          <p className="mt-1 max-w-lg text-sm text-white/80 drop-shadow sm:mt-2 sm:text-lg">
            საუკეთესო თევზაობის აქსესუარები და აღჭურვილობა
          </p>
        </div>
      </div>

      <div className="mx-auto hidden max-w-6xl px-4 py-6 sm:px-6 md:block lg:px-8">
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-center gap-8">
            <button onClick={handleGoHome} data-testid="link-nav-home">
              <span className={`flex min-h-[44px] items-center gap-2 text-base font-semibold ${!selectedCategory ? "text-primary" : "text-foreground hover:text-primary"} transition-colors`}>
                <Home className="h-5 w-5" />
                მთავარი
              </span>
            </button>
            <button onClick={() => setGuideOpen(true)} data-testid="link-nav-guide">
              <span className="flex min-h-[44px] items-center gap-2 text-base font-semibold text-muted-foreground hover:text-primary transition-colors">
                <BookOpen className="h-5 w-5" />
                გზამკვლევი
              </span>
            </button>
          </div>
          <div className="flex items-center gap-5">
            <button
              onClick={() => setCartDrawerOpen(true)}
              className="relative flex min-h-[44px] items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-cart-desktop"
            >
              <div className="relative">
                <ShoppingCart className="h-4 w-4" />
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
              className="flex min-h-[44px] items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-profile-desktop"
            >
              <UserCircle className="h-4 w-4" />
              პროფილი
            </button>
            {hasAdminRole && (
              <Link href="/admin-login">
                <span className="flex min-h-[44px] items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground" data-testid="link-admin-panel">
                  <Settings className="h-4 w-4" />
                  ადმინ პანელი
                </span>
              </Link>
            )}
          </div>
        </div>
        <hr className="border-t border-muted" />
      </div>

      <div className="mx-auto max-w-6xl px-3 py-3 sm:px-6 sm:py-6 md:mb-10 lg:px-8 lg:pt-0 lg:-mt-4">
        <div className="flex flex-col gap-4 md:gap-6 lg:flex-row lg:items-start lg:gap-6">
          <aside className="hidden w-full shrink-0 lg:sticky lg:top-6 lg:block lg:w-64 lg:self-start lg:mt-10">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2.5 text-base font-bold text-foreground">
                <ShoppingBag className="h-5 w-5 text-primary" />
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
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-foreground hover:bg-[#f0ecf6] hover:text-primary"
                        }`}
                        data-testid={`sidebar-item-${cat.id}`}
                      >
                        {icon ? (
                          <img src={icon} alt="" className="h-7 w-7 shrink-0 object-contain" />
                        ) : cat.icon ? (
                          <LucideIcon name={cat.icon} className="h-5 w-5 shrink-0" />
                        ) : null}
                        {cat.name}
                      </button>
                    );
                  })}
                </nav>
              ) : (
                <p className="text-sm text-muted-foreground">კატეგორიები ჯერ არ არის</p>
              )}
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <AnimatedShell>
              {selectedCategory ? (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    {getCategoryIcon(selectedCategory.name) ? (
                      <img src={getCategoryIcon(selectedCategory.name)!} alt="" className="h-7 w-7 object-contain sm:h-8 sm:w-8" />
                    ) : selectedCategory.icon ? (
                      <LucideIcon name={selectedCategory.icon} className="h-6 w-6 text-primary" />
                    ) : null}
                    <h2 className="text-lg font-bold text-foreground sm:text-xl">{selectedCategory.name}</h2>
                  </div>
                  {renderProductGrid(categoryProducts, isCategoryLoading, "ამ კატეგორიაში პროდუქტები ჯერ არ არის")}
                </>
              ) : (
                <>
                  <h2 className="mb-3 text-center text-lg font-bold text-foreground sm:text-xl" data-testid="text-section-title">TOP-გაყიდვადი პროდუქტი</h2>
                  {renderProductGrid(
                    products
                      ? [...products].sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0)).slice(0, window.innerWidth >= 1024 ? 9 : 8)
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

      <MobileBottomNav
        onCategoriesOpen={() => setCategoryDrawerOpen(true)}
        onGuideOpen={() => setGuideOpen(true)}
        onCartOpen={() => setCartDrawerOpen(true)}
        selectedCategory={selectedCategory}
        onGoHome={handleGoHome}
        onProfileClick={handleProfileClick}
        hasAdminRole={hasAdminRole}
        cartCount={cartCount}
      />

      <CartDrawer open={cartDrawerOpen} onOpenChange={setCartDrawerOpen} />

      <AuthLoginDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        returnTo="/profile"
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
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">გზამკვლევი</DialogTitle>
            <DialogDescription className="sr-only">ინფორმაცია</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="rounded-xl border border-muted overflow-hidden">
              <button
                type="button"
                onClick={() => setGuideSiteOpen(!guideSiteOpen)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                data-testid="button-guide-site"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <BookOpen className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <span className="text-sm font-bold">როგორ მუშაობს ჩვენი საიტი</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${guideSiteOpen ? "rotate-180" : ""}`} />
              </button>
              {guideSiteOpen && (
                <div className="space-y-3 border-t border-muted px-4 pb-4 pt-3">
                  <div className="rounded-lg border border-muted bg-muted/20 p-3">
                    <h4 className="mb-1 text-sm font-bold flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">1</span>
                      აირჩიეთ კატალოგიდან
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      დაათვალიერეთ ჩვენი პროდუქტები კატეგორიებით ან მოძებნეთ საძიებო ველით. დააჭირეთ პროდუქტის სურათს დეტალური ინფორმაციისთვის.
                    </p>
                  </div>
                  <div className="rounded-lg border border-muted bg-muted/20 p-3">
                    <h4 className="mb-1 text-sm font-bold flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">2</span>
                      შეუკვეთეთ
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      პროდუქტის გვერდზე დააჭირეთ "ყიდვა" ღილაკს, აირჩიეთ ფერი და რაოდენობა, შეავსეთ მისამართი და ტელეფონის ნომერი. შეკვეთა გაიგზავნება ავტომატურად.
                    </p>
                  </div>
                  <div className="rounded-lg border border-muted bg-muted/20 p-3">
                    <h4 className="mb-1 text-sm font-bold flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">3</span>
                      პროფილი და შეკვეთები
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      პროფილის გვერდზე ნახავთ თქვენს მონაცემებს, შეკვეთების ისტორიას და დაგროვილ კრედიტს. პროფილში შეგიძლიათ შეცვალოთ მისამართი და ტელეფონის ნომერი.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-muted overflow-hidden">
              <button
                type="button"
                onClick={() => setGuideCreditOpen(!guideCreditOpen)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                data-testid="button-guide-credit"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(255,107,53,0.1)" }}>
                    <Gift className="h-4.5 w-4.5" style={{ color: "#FF6B35" }} />
                  </div>
                  <span className="text-sm font-bold">როგორ დავაგროვოთ კრედიტი</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${guideCreditOpen ? "rotate-180" : ""}`} />
              </button>
              {guideCreditOpen && (
                <div className="space-y-3 border-t border-muted px-4 pb-4 pt-3">
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                    <h4 className="mb-1 text-sm font-bold" style={{ color: "#FF6B35" }}>გააზიარეთ</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      აირჩიეთ ნებისმიერი პროდუქტი ჩვენს საიტზე და დააჭირეთ ღილაკს "გააზიარე Facebook-ზე".
                    </p>
                  </div>
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                    <h4 className="mb-1 text-sm font-bold" style={{ color: "#FF6B35" }}>მოიწვიეთ მეთევზეები</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      გააზიარეთ ბმული თქვენს კედელზე ან თემატურ სათევზაო ჯგუფებში.
                    </p>
                  </div>
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                    <h4 className="mb-1 text-sm font-bold" style={{ color: "#FF6B35" }}>დააგროვეთ</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      ყოველ ჯერზე, როცა ვინმე თქვენი ბმულით შემოვა და შეიძენს ნივთს (ნებისმიერი ღირებულების), თქვენს პირად პროფილში, სექციაში "ჩემი კრედიტი", ავტომატურად დაგერიცხებათ 1.50 ლარი.
                    </p>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <h4 className="mb-1 text-sm font-bold text-blue-700">🛒 როგორ გამოვიყენოთ კრედიტი?</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      როდესაც დააგროვებთ სასურველი ნივთის შესაბამის კრედიტს, შეკვეთის გაფორმებისას აირჩიეთ "კრედიტით გადახდა". თქვენ ნივთს მიიღებთ სრულიად უფასოდ!
                    </p>
                  </div>
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <h4 className="mb-1.5 text-sm font-bold text-red-700">⚠️ მნიშვნელოვანი წესები</h4>
                    <ul className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
                      <li><span className="font-semibold text-foreground">მხოლოდ ნივთები:</span> ვირტუალური კრედიტის გამოყენება შესაძლებელია მხოლოდ საიტზე არსებული პროდუქციის შესაძენად.</li>
                      <li><span className="font-semibold text-foreground">არ გადაიცვლება ფულზე:</span> დაგროვილი კრედიტების განაღდება ან რეალურ ფულში გადაცვლა არ ხდება.</li>
                      <li><span className="font-semibold text-foreground">სამართლიანი თამაში:</span> კრედიტი ირიცხება მხოლოდ რეალურ გაყიდვაზე. საკუთარი რეფერალური ბმულით ნივთის შეძენა არ დაიშვება.</li>
                    </ul>
                  </div>
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                    <h4 className="mb-1.5 text-sm font-bold text-green-700">💡 რჩევები მეტი კრედიტისთვის</h4>
                    <ul className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
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
    </div>
  );
}
