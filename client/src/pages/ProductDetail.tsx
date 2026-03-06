import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Play, X, ShoppingCart, Minus, Plus, Coins, AlertCircle, Loader2, Home } from "lucide-react";
import { Link } from "wouter";
import type { Product } from "@shared/schema";
import { PurchaseDialog } from "@/components/PurchaseDialog";
import { AuthLoginDialog } from "@/components/AuthLoginDialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/use-cart";
import { queryClient } from "@/lib/queryClient";

const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' fill='%23f1f5f9'%3E%3Crect width='600' height='400'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='18' fill='%2394a3b8'%3E%E1%83%A1%E1%83%A3%E1%83%A0%E1%83%90%E1%83%97%E1%83%98 %E1%83%90%E1%83%A0 %E1%83%90%E1%83%A0%E1%83%98%E1%83%A1%3C/text%3E%3C/svg%3E";

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

function formatPrice(price: string | null) {
  if (!price) return "";
  return `₾${Number(price).toFixed(2)}`;
}

function extractYoutubeId(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function CreditPurchaseSection({
  userCredit,
  creditToGel,
  total,
  productId,
  productName,
  quantity,
  selectedColor,
  hasColors,
  creditSubmitting,
  setCreditSubmitting,
  onClose,
}: {
  userCredit: number;
  creditToGel: number;
  total: number;
  productId: number;
  productName: string;
  quantity: number;
  selectedColor: string | null;
  hasColors: boolean;
  creditSubmitting: boolean;
  setCreditSubmitting: (v: boolean) => void;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const creditNeeded = total / creditToGel;
  const hasEnoughCredit = userCredit >= creditNeeded;

  async function handleCreditBuy() {
    if (hasColors && !selectedColor) {
      toast({ variant: "destructive", title: "შეარჩიეთ ფერი" });
      return;
    }

    const profileRes = await fetch("/api/profile", { credentials: "include" });
    if (!profileRes.ok) {
      toast({ variant: "destructive", title: "შეცდომა", description: "პროფილი ვერ მოიძებნა" });
      return;
    }
    const profile = await profileRes.json();
    if (!profile.firstName || !profile.lastName || !profile.city || !profile.address || !profile.phone) {
      toast({ variant: "destructive", title: "შეცდომა", description: "გთხოვთ შეავსოთ პროფილი (სახელი, ქალაქი, მისამართი, ტელეფონი)" });
      return;
    }

    setCreditSubmitting(true);
    try {
      const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
      const res = await fetch("/api/orders/credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          productId,
          productName,
          productPrice: String(total),
          quantity,
          selectedColor,
          fullName,
          city: profile.city,
          address: profile.address,
          phone: profile.phone,
        }),
      });
      if (res.ok) {
        toast({ title: "შეკვეთა მიღებულია!", description: `"${productName}" (${quantity} ც.) კრედიტით შეძენილია.` });
        queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      } else {
        const data = await res.json();
        toast({ variant: "destructive", title: "შეცდომა", description: data.message || "შეკვეთა ვერ მოხერხდა" });
      }
    } catch {
      toast({ variant: "destructive", title: "შეცდომა", description: "კავშირის შეცდომა" });
    } finally {
      setCreditSubmitting(false);
    }
  }

  return (
    <div className="mt-3 sm:mt-4 rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Coins className="h-4 w-4 text-amber-600" />
        <span className="text-sm font-semibold text-amber-800">კრედიტით შეძენა</span>
      </div>
      <div className="text-xs text-amber-700 space-y-0.5">
        <div className="flex justify-between">
          <span>თქვენი კრედიტი:</span>
          <span className="font-semibold" data-testid="text-user-credit">{userCredit.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>საჭირო კრედიტი:</span>
          <span className="font-semibold" data-testid="text-credit-needed">{creditNeeded.toFixed(2)}</span>
        </div>
      </div>
      {hasEnoughCredit ? (
        <button
          onClick={handleCreditBuy}
          disabled={creditSubmitting}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-100 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-200 disabled:opacity-50"
          data-testid="button-credit-buy"
        >
          {creditSubmitting ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> იგზავნება...</>
          ) : (
            <><Coins className="h-4 w-4" /> კრედიტით შეძენა — {creditNeeded.toFixed(2)} კრედიტი</>
          )}
        </button>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-start gap-2 text-xs text-red-600">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span className="font-bold">როგორ დავაგროვო კრედიტი</span>
          </div>
          <Link href="/?guide=credit">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors" data-testid="link-view-credit">
              ნახვა →
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}

export default function ProductDetail() {
  const [, params] = useRoute("/product/:id");
  const productId = params?.id;

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["/api/products", productId],
    queryFn: async () => {
      const res = await fetch(`/api/products/${productId}`, { credentials: "include" });
      if (!res.ok) throw new Error("პროდუქტი ვერ მოიძებნა");
      return res.json();
    },
    enabled: !!productId,
  });

  const [selectedImage, setSelectedImage] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [creditSubmitting, setCreditSubmitting] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { addItem, items: cartItems } = useCart();

  const userCredit = Number((user as any)?.myCredit || 0);

  const { data: creditInfo } = useQuery<{ credit_to_gel: string }>({
    queryKey: ["/api/credit-info"],
    queryFn: async () => {
      const res = await fetch("/api/credit-info");
      return res.ok ? res.json() : { credit_to_gel: "1" };
    },
  });
  const creditToGel = Number(creditInfo?.credit_to_gel || 1);

  useEffect(() => {
    if (isAuthenticated && product) {
      const returnTo = sessionStorage.getItem("returnToProduct");
      if (returnTo && String(returnTo) === String(product.id)) {
        sessionStorage.removeItem("returnToProduct");
        setPurchaseOpen(true);
      }
    }
  }, [isAuthenticated, product]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 lg:gap-8">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-40 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-lg text-gray-500">პროდუქტი ვერ მოიძებნა</p>
          <Link href="/" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-green-700 hover:text-green-900" data-testid="link-back-home">მთავარზე დაბრუნება</Link>
        </div>
      </div>
    );
  }

  let albumImages: string[] = [];
  try {
    albumImages = JSON.parse(product.albumImages || "[]");
  } catch {
    albumImages = [];
  }

  if (albumImages.length === 0 && product.imageUrl) {
    albumImages = [product.imageUrl];
  }

  const currentImage = albumImages[selectedImage] || product.imageUrl || null;
  const hasDiscount = product.discountPrice && Number(product.discountPrice) < Number(product.originalPrice);
  const youtubeId = extractYoutubeId(product.youtubeUrl);

  let colorStock: Record<string, number> = {};
  try { colorStock = JSON.parse(product.colorStock || "{}"); } catch {}
  const colorNames = Object.keys(colorStock);
  const hasColors = colorNames.length > 0;
  const selectedColorStock = selectedColor ? (colorStock[selectedColor] ?? 0) : null;
  const isSelectedColorOutOfStock = selectedColorStock !== null && selectedColorStock <= 0;
  const generalStock = product.stock ?? 0;
  const rawMaxQuantity = selectedColorStock !== null ? selectedColorStock : (hasColors ? 0 : generalStock);
  const cartKey = `${product.id}_${selectedColor || "default"}`;
  const inCartQty = cartItems.find(ci => `${ci.productId}_${ci.selectedColor || "default"}` === cartKey)?.quantity || 0;
  const maxQuantity = Math.max(0, rawMaxQuantity - inCartQty);

  const totalStock = hasColors ? Object.values(colorStock).reduce((a, b) => a + b, 0) : generalStock;
  const allOutOfStock = totalStock <= 0;

  const COLOR_STYLES: Record<string, { bg: string; border: string; shadow?: string }> = {
    "ოქროსფერი": { bg: "linear-gradient(135deg, #FFD700, #FFC107, #FFB300)", border: "#DAA520", shadow: "0 0 6px 1px rgba(255, 215, 0, 0.6)" },
    "ოქროს ფერი": { bg: "linear-gradient(135deg, #FFD700, #FFC107, #FFB300)", border: "#DAA520", shadow: "0 0 6px 1px rgba(255, 215, 0, 0.6)" },
    "ვერცხლისფერი": { bg: "linear-gradient(135deg, #E0E0E0, #C0C0C0, #A8A8A8)", border: "#999", shadow: "0 0 5px 1px rgba(192, 192, 192, 0.5)" },
    "ვერცხლის ფერი": { bg: "linear-gradient(135deg, #E0E0E0, #C0C0C0, #A8A8A8)", border: "#999", shadow: "0 0 5px 1px rgba(192, 192, 192, 0.5)" },
    "მწვანე": { bg: "#22c55e", border: "#16a34a", shadow: "0 0 5px 1px rgba(34, 197, 94, 0.4)" },
    "მწვანე ფერი": { bg: "#22c55e", border: "#16a34a", shadow: "0 0 5px 1px rgba(34, 197, 94, 0.4)" },
    "შავი": { bg: "#1a1a1a", border: "#444" },
    "თეთრი": { bg: "#ffffff", border: "#d1d5db" },
    "ლურჯი": { bg: "#3b82f6", border: "#2563eb", shadow: "0 0 5px 1px rgba(59, 130, 246, 0.4)" },
    "წითელი": { bg: "#ef4444", border: "#dc2626", shadow: "0 0 5px 1px rgba(239, 68, 68, 0.4)" },
    "ნარინჯისფერი": { bg: "#f97316", border: "#ea580c", shadow: "0 0 5px 1px rgba(249, 115, 22, 0.4)" },
    "ვარდისფერი": { bg: "#ec4899", border: "#db2777", shadow: "0 0 5px 1px rgba(236, 72, 153, 0.4)" },
    "იასამნისფერი": { bg: "#a855f7", border: "#9333ea", shadow: "0 0 5px 1px rgba(168, 85, 247, 0.4)" },
    "ყვითელი": { bg: "#eab308", border: "#ca8a04", shadow: "0 0 5px 1px rgba(234, 179, 8, 0.4)" },
    "ყავისფერი": { bg: "#92400e", border: "#78350f" },
  };

  function getColorDotStyle(colorName: string): React.CSSProperties {
    const style = COLOR_STYLES[colorName];
    if (style) {
      return {
        background: style.bg,
        borderColor: style.border,
        boxShadow: style.shadow || "none",
        borderWidth: "2px",
        borderStyle: "solid",
      };
    }
    return {
      background: "#e5e7eb",
      borderColor: "#d1d5db",
      borderWidth: "2px",
      borderStyle: "solid",
    };
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-4 sm:mb-6">
          <nav className="flex items-center gap-2 text-xs sm:text-sm" data-testid="breadcrumb">
            <Link href="/" className="flex items-center gap-1.5 font-bold text-gray-700 hover:text-primary" data-testid="link-breadcrumb-home">
              <Home className="h-4 w-4" />
              მთავარი
            </Link>
          </nav>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:gap-8">
          <div className="space-y-2 sm:space-y-4">
            <div className="overflow-hidden rounded-lg border border-gray-100 bg-white">
              {showVideo && youtubeId ? (
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&origin=${encodeURIComponent(window.location.origin)}&enablejsapi=1&rel=0`}
                    title="YouTube ვიდეო"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    className="absolute inset-0 h-full w-full"
                    data-testid="iframe-youtube"
                  />
                </div>
              ) : (
                <ImgWithFallback
                  src={currentImage || undefined}
                  alt={product.name}
                  className="w-full object-contain"
                  style={{ maxHeight: "500px" }}
                  data-testid="img-product-main"
                />
              )}
            </div>

          </div>

          <div className="space-y-2 sm:space-y-5">
            <h1 className="text-base font-bold text-gray-900 sm:text-2xl lg:text-3xl" data-testid="text-product-name">
              {product.name}
            </h1>

            <div className="space-y-1" data-testid="text-product-price">
              {hasDiscount ? (
                <div className="flex flex-wrap items-baseline gap-1 sm:gap-3">
                  <span className="text-lg font-bold text-gray-900 sm:text-3xl">
                    {formatPrice(product.discountPrice)}
                  </span>
                  <span className="text-xs text-gray-400 line-through sm:text-lg">
                    {formatPrice(product.originalPrice)}
                  </span>
                </div>
              ) : (
                <span className="text-lg font-bold text-gray-900 sm:text-3xl">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>

            <hr className="hidden border-gray-100 lg:block" />

            <div className="hidden lg:block prose prose-sm max-w-none text-base text-gray-800" data-testid="text-product-description-desktop">
              {product.description.split("\n").map((line, i) => (
                <p key={i} className="mb-1">{line}</p>
              ))}
            </div>

            {hasColors && (
              <div className="hidden lg:block mt-2" data-testid="color-selector-desktop">
                <label className="text-sm font-medium text-gray-700 mb-2 block">ფერი:</label>
                <div className="flex flex-wrap gap-2">
                  {colorNames.map(color => {
                    const stock = colorStock[color];
                    const isOut = stock <= 0;
                    const isActive = selectedColor === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => { setSelectedColor(isActive ? null : color); setQuantity(1); }}
                        className={`relative flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm transition-all ${
                          isActive ? "border-primary shadow-md" : "border-gray-200 hover:border-gray-300"
                        } ${isOut ? "opacity-50" : ""}`}
                        data-testid={`button-color-desktop-${color}`}
                      >
                        <span className="inline-block h-5 w-5 rounded-full" style={getColorDotStyle(color)} />
                        <span>{color}</span>
                        <span className={`text-xs ${isOut ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                          {isOut ? "ამოწურულია" : `(${stock})`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="hidden lg:flex items-center gap-4 mt-2">
              <label className="text-sm font-medium text-gray-700">რაოდენობა:</label>
              <div className="flex items-center rounded-xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    if (hasColors && !selectedColor) {
                      toast({ variant: "destructive", title: "შეარჩიეთ ფერი" });
                      return;
                    }
                    setQuantity(q => Math.max(1, q - 1));
                  }}
                  className="flex h-10 w-10 items-center justify-center text-gray-500 hover:text-gray-800 transition-colors"
                  data-testid="button-qty-minus-desktop"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-[40px] text-center text-base font-semibold" data-testid="text-quantity-desktop">{quantity}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (hasColors && !selectedColor) {
                      toast({ variant: "destructive", title: "შეარჩიეთ ფერი" });
                      return;
                    }
                    setQuantity(q => Math.min(maxQuantity, q + 1));
                  }}
                  disabled={!!(selectedColor || !hasColors) && quantity >= maxQuantity}
                  className={`flex h-10 w-10 items-center justify-center transition-colors ${(!hasColors || selectedColor) && quantity >= maxQuantity ? "text-gray-300 cursor-not-allowed" : "text-gray-500 hover:text-gray-800"}`}
                  data-testid="button-qty-plus-desktop"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {(albumImages.length > 1 || youtubeId) && (
          <div className="flex flex-wrap gap-2 sm:gap-3 mt-3 sm:mt-4">
            {albumImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => { setSelectedImage(idx); setShowVideo(false); }}
                className={`overflow-hidden rounded-lg border-2 transition-all ${
                  idx === selectedImage && !showVideo ? "border-green-500 shadow-md" : "border-gray-200 hover:border-gray-300"
                }`}
                data-testid={`button-thumb-${idx}`}
              >
                <ImgWithFallback
                  src={img}
                  alt={`${product.name} - ${idx + 1}`}
                  loading="lazy"
                  className="h-14 w-14 object-cover sm:h-24 sm:w-24"
                />
              </button>
            ))}
            {youtubeId && (
              <button
                onClick={() => setShowVideo(true)}
                className={`relative overflow-hidden rounded-lg border-2 transition-all ${
                  showVideo ? "border-green-500 shadow-md" : "border-gray-200 hover:border-gray-300"
                }`}
                data-testid="button-thumb-video"
              >
                <img
                  src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
                  alt="ვიდეო"
                  className="h-14 w-14 object-cover sm:h-24 sm:w-24"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play className="h-4 w-4 fill-white text-white sm:h-6 sm:w-6" />
                </div>
              </button>
            )}
          </div>
        )}

        <div className="prose prose-sm max-w-none text-xs text-gray-800 sm:text-base mt-3 sm:mt-4 lg:hidden" data-testid="text-product-description">
          {product.description.split("\n").map((line, i) => (
            <p key={i} className="mb-1">{line}</p>
          ))}
        </div>

        {hasColors && (
          <div className="mt-3 sm:mt-4 lg:hidden" data-testid="color-selector-mobile">
            <label className="text-sm font-medium text-gray-700 mb-2 block">ფერი:</label>
            <div className="flex flex-wrap gap-2">
              {colorNames.map(color => {
                const stock = colorStock[color];
                const isOut = stock <= 0;
                const isActive = selectedColor === color;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => { setSelectedColor(isActive ? null : color); setQuantity(1); }}
                    className={`relative flex items-center gap-1.5 rounded-lg border-2 px-2.5 py-1.5 text-xs transition-all ${
                      isActive ? "border-primary shadow-md" : "border-gray-200 hover:border-gray-300"
                    } ${isOut ? "opacity-50" : ""}`}
                    data-testid={`button-color-mobile-${color}`}
                  >
                    <span className="inline-block h-4 w-4 rounded-full" style={getColorDotStyle(color)} />
                    <span>{color}</span>
                    <span className={`text-[10px] ${isOut ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                      {isOut ? "ამოწურულია" : `(${stock})`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-3 sm:mt-4 flex items-center gap-4 lg:hidden">
          <label className="text-sm font-medium text-gray-700">რაოდენობა:</label>
          <div className="flex items-center rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => {
                if (hasColors && !selectedColor) {
                  toast({ variant: "destructive", title: "შეარჩიეთ ფერი" });
                  return;
                }
                setQuantity(q => Math.max(1, q - 1));
              }}
              className="flex h-10 w-10 items-center justify-center text-gray-500 hover:text-gray-800 transition-colors"
              data-testid="button-qty-minus"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-[40px] text-center text-base font-semibold" data-testid="text-quantity">{quantity}</span>
            <button
              type="button"
              onClick={() => {
                if (hasColors && !selectedColor) {
                  toast({ variant: "destructive", title: "შეარჩიეთ ფერი" });
                  return;
                }
                setQuantity(q => Math.min(maxQuantity, q + 1));
              }}
              disabled={!!(selectedColor || !hasColors) && quantity >= maxQuantity}
              className={`flex h-10 w-10 items-center justify-center transition-colors ${(!hasColors || selectedColor) && quantity >= maxQuantity ? "text-gray-300 cursor-not-allowed" : "text-gray-500 hover:text-gray-800"}`}
              data-testid="button-qty-plus"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-2 sm:gap-3 mt-3 sm:mt-4">
          <button
            onClick={() => {
              if (hasColors && !selectedColor) {
                toast({ variant: "destructive", title: "შეარჩიეთ ფერი" });
                return;
              }
              if (maxQuantity <= 0) {
                toast({ variant: "destructive", title: "მარაგი ამოწურულია" });
                return;
              }
              const effectivePrice = Number(hasDiscount ? product.discountPrice : product.originalPrice);
              const qtyToAdd = Math.min(quantity, maxQuantity);
              if (qtyToAdd <= 0) {
                toast({ variant: "destructive", title: "მარაგი ამოწურულია" });
                return;
              }
              addItem({
                productId: product.id,
                name: product.name,
                price: effectivePrice,
                imageUrl: product.imageUrl || "",
                quantity: qtyToAdd,
                selectedColor,
                maxStock: rawMaxQuantity,
              });
              setQuantity(1);
              toast({ title: "კალათაში დაემატა", description: `"${product.name}" (${qtyToAdd} ც.)` });
            }}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-primary bg-white text-sm font-semibold text-primary transition-colors hover:bg-primary/5 sm:text-base"
            data-testid="button-add-cart"
          >
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
            კალათა
          </button>
          <button
            onClick={() => {
              if (hasColors && !selectedColor) {
                toast({ variant: "destructive", title: "შეარჩიეთ ფერი" });
                return;
              }
              if (!isAuthenticated) {
                sessionStorage.setItem("returnToProduct", String(product.id));
                setAuthDialogOpen(true);
                return;
              }
              setPurchaseOpen(true);
            }}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:text-base"
            data-testid="button-buy-now"
          >
            ყიდვა
          </button>
        </div>

        {isAuthenticated && (
          <CreditPurchaseSection
            userCredit={userCredit}
            creditToGel={creditToGel}
            total={Number(hasDiscount ? product.discountPrice : product.originalPrice) * quantity}
            productId={product.id}
            productName={product.name}
            quantity={quantity}
            selectedColor={selectedColor}
            hasColors={hasColors}
            creditSubmitting={creditSubmitting}
            setCreditSubmitting={setCreditSubmitting}
            onClose={() => {}}
          />
        )}

        <div className="mt-6 sm:mt-8">
          <Link href="/">
            <button className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-900" data-testid="link-back">
              <ArrowLeft className="h-4 w-4" />
              უკან დაბრუნება
            </button>
          </Link>
        </div>

        <PurchaseDialog
          open={purchaseOpen}
          onOpenChange={setPurchaseOpen}
          productId={product.id}
          productName={product.name}
          productPrice={hasDiscount ? product.discountPrice! : product.originalPrice}
          quantity={quantity}
          selectedColor={selectedColor}
        />

        <AuthLoginDialog
          open={authDialogOpen}
          onOpenChange={setAuthDialogOpen}
        />
      </div>
    </div>
  );
}
