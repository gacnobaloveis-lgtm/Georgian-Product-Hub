import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { FlittPaymentDialog } from "@/components/FlittPaymentDialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart, CartItem } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { AuthLoginDialog } from "@/components/AuthLoginDialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Trash2, Minus, Plus, ShoppingBag, Check, Loader2, Pencil, AlertCircle, CheckSquare, Square } from "lucide-react";
import { SiVisa, SiMastercard } from "react-icons/si";

const GEORGIAN_CITIES = [
  "თბილისი", "ქუთაისი", "ბათუმი", "რუსთავი", "ფოთი", "ზუგდიდი",
  "გორი", "თელავი", "ახალციხე", "ოზურგეთი", "სენაკი", "ხაშური",
  "სამტრედია", "მარნეული", "ქობულეთი", "წყალტუბო", "საგარეჯო",
  "გარდაბანი", "ბოლნისი", "ზესტაფონი",
];

const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%23f1f5f9'%3E%3Crect width='100' height='100'/%3E%3C/svg%3E";

interface ProfileData {
  firstName: string | null;
  lastName: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
}

interface EditForm {
  fullName: string;
  city: string;
  address: string;
  phone: string;
}

function cartKey(item: { productId: number; selectedColor: string | null }) {
  return `${item.productId}_${item.selectedColor || "default"}`;
}

export function CartDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { items, removeItem, updateQuantity, clearItems } = useCart();
  const { isRealUser } = useAuth();
  const { toast } = useToast();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({ fullName: "", city: "", address: "", phone: "" });
  const [tbcSubmitting, setTbcSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [flittPay, setFlittPay] = useState<{ orderId: number; amount: number; description: string } | null>(null);
  const [, navigate] = useLocation();
  const confirmedItemsRef = useRef<CartItem[]>([]);
  const pendingCheckoutItemsRef = useRef<CartItem[]>([]);

  useEffect(() => {
    const validKeys = new Set(items.map(i => cartKey(i)));
    setSelected(prev => {
      const filtered = new Set([...prev].filter(k => validKeys.has(k)));
      if (filtered.size !== prev.size) return filtered;
      return prev;
    });
  }, [items]);

  function toggleSelect(item: CartItem) {
    const key = cartKey(item);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const itemKeys = new Set(items.map(i => cartKey(i)));
  const activeSelected = new Set([...selected].filter(k => itemKeys.has(k)));

  function toggleSelectAll() {
    if (activeSelected.size === items.length && items.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map(i => cartKey(i))));
    }
  }

  const selectedItems = items.filter(i => activeSelected.has(cartKey(i)));
  const checkoutItems = checkoutMode && pendingCheckoutItemsRef.current.length > 0
    ? pendingCheckoutItemsRef.current
    : selectedItems;
  const selectedTotal = checkoutItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  function isProfileComplete(p: ProfileData | null): boolean {
    return !!(p?.firstName?.trim() && p?.lastName?.trim() && p?.city?.trim() && p?.address?.trim() && p?.phone?.trim());
  }

  function startEditing(p: ProfileData | null) {
    setEditForm({
      fullName: "",
      city: p?.city || "",
      address: p?.address || "",
      phone: p?.phone || "",
    });
    setEditing(true);
  }

  function handleBuySelected() {
    if (selectedItems.length === 0) {
      toast({ variant: "destructive", title: "აირჩიეთ ნივთები", description: "მონიშნეთ ნივთები შესაძენად" });
      return;
    }
    pendingCheckoutItemsRef.current = selectedItems;
    if (!isRealUser) {
      setAuthDialogOpen(true);
      return;
    }
    enterCheckout();
  }

  async function handleRegistered() {
    setAuthDialogOpen(false);
    await new Promise(r => setTimeout(r, 150));
    await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
    enterCheckout();
  }

  function enterCheckout() {
    const itemsToCheckout = pendingCheckoutItemsRef.current.length > 0
      ? pendingCheckoutItemsRef.current
      : selectedItems;
    if (itemsToCheckout.length === 0) {
      toast({ variant: "destructive", title: "კალათა ცარიელია", description: "დაბრუნდით და მონიშნეთ ნივთები" });
      return;
    }
    setCheckoutMode(true);
    setProfileLoading(true);
    setEditing(false);
    fetch("/api/profile", { credentials: "include" })
      .then(res => res.ok ? res.json() : null)
      .then(profileData => {
        setProfile(profileData);
        if (!isProfileComplete(profileData)) {
          startEditing(profileData);
        }
      })
      .catch(() => {
        setProfile(null);
        startEditing(null);
      })
      .finally(() => setProfileLoading(false));
  }

  async function handleSaveProfile() {
    const nameParts = editForm.fullName.trim().split(/\s+/);
    if (nameParts.length < 2 || !nameParts[0] || !nameParts[1]) {
      toast({ variant: "destructive", title: "შეცდომა", description: "შეიყვანეთ სახელი და გვარი" });
      return;
    }
    if (!editForm.city) {
      toast({ variant: "destructive", title: "შეცდომა", description: "აირჩიეთ ქალაქი" });
      return;
    }
    if (!editForm.address.trim()) {
      toast({ variant: "destructive", title: "შეცდომა", description: "შეიყვანეთ მისამართი" });
      return;
    }
    if (!editForm.phone.trim()) {
      toast({ variant: "destructive", title: "შეცდომა", description: "შეიყვანეთ ტელეფონის ნომერი" });
      return;
    }

    setSaving(true);
    try {
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ");
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName,
          lastName,
          city: editForm.city,
          address: editForm.address.trim(),
          phone: editForm.phone.trim(),
        }),
      });
      if (res.ok) {
        const updated: ProfileData = { firstName, lastName, city: editForm.city, address: editForm.address.trim(), phone: editForm.phone.trim() };
        setProfile(updated);
        setEditing(false);
        queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
        toast({ title: "შენახულია" });
      } else {
        toast({ variant: "destructive", title: "შეცდომა", description: "შენახვა ვერ მოხერხდა" });
      }
    } catch {
      toast({ variant: "destructive", title: "შეცდომა", description: "კავშირის შეცდომა" });
    } finally {
      setSaving(false);
    }
  }

  async function handleTbcPay() {
    if (!profile || !isProfileComplete(profile)) return;

    setTbcSubmitting(true);
    const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
    const itemsToOrder = confirmedItemsRef.current;
    const totalAmount = itemsToOrder.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const createdOrderIds: number[] = [];

    try {
      for (const item of itemsToOrder) {
        const total = item.price * item.quantity;
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            productId: item.productId,
            productName: item.name,
            productPrice: String(total),
            quantity: item.quantity,
            selectedColor: item.selectedColor,
            fullName: fullName.trim(),
            city: profile.city,
            address: profile.address!.trim(),
            phone: profile.phone!.trim(),
          }),
        });
        if (res.ok) {
          const order = await res.json();
          if (order?.id) createdOrderIds.push(order.id);
        }
      }

      if (createdOrderIds.length === 0) {
        toast({ variant: "destructive", title: "შეცდომა", description: "შეკვეთა ვერ შეიქმნა" });
        setTbcSubmitting(false);
        return;
      }

      const description = itemsToOrder.length === 1
        ? `spiningebi.ge — ${itemsToOrder[0].name} (${itemsToOrder[0].quantity} ც.)`
        : `spiningebi.ge — ${itemsToOrder.length} ნივთი`;

      clearItems(itemsToOrder.map(i => ({ productId: i.productId, selectedColor: i.selectedColor })));
      setSelected(new Set());
      setFlittPay({ orderId: createdOrderIds[0], amount: totalAmount, description });
      setTbcSubmitting(false);
      onOpenChange(false);
    } catch {
      toast({ variant: "destructive", title: "შეცდომა", description: "კავშირის შეცდომა" });
      setTbcSubmitting(false);
    }
  }

  const profileComplete = isProfileComplete(profile);
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { if (!v) { setCheckoutMode(false); setSelected(new Set()); } onOpenChange(v); }}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl px-0 flex flex-col">
          <SheetHeader className="px-5 pb-3 shrink-0">
            <div className="flex items-center gap-3">
              {checkoutMode ? (
                <button onClick={() => setCheckoutMode(false)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted transition-colors" data-testid="button-checkout-back">
                  <ArrowLeft className="h-5 w-5" />
                </button>
              ) : (
                <button onClick={() => onOpenChange(false)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted transition-colors" data-testid="button-cart-close">
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <SheetTitle className="text-lg font-bold">
                {checkoutMode ? "შეკვეთის გაფორმება" : `კალათა (${items.length})`}
              </SheetTitle>
            </div>
            <SheetDescription className="sr-only">
              {checkoutMode ? "შეკვეთის გაფორმება" : "კალათაში არსებული ნივთები"}
            </SheetDescription>
          </SheetHeader>

          {!checkoutMode ? (
            <>
              {items.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">კალათა ცარიელია</p>
                </div>
              ) : (
                <>
                  <div className="px-5 pb-2 shrink-0">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="button-select-all"
                    >
                      {activeSelected.size === items.length && items.length > 0 ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                      {activeSelected.size === items.length && items.length > 0 ? "ყველას მოხსნა" : "ყველას მონიშვნა"}
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
                    {items.map(item => {
                      const key = cartKey(item);
                      const isSelected = activeSelected.has(key);
                      return (
                        <div
                          key={key}
                          className={`flex gap-3 rounded-xl border p-3 transition-colors ${isSelected ? "border-primary bg-primary/5" : "border-muted"}`}
                          data-testid={`cart-item-${item.productId}`}
                        >
                          <button
                            onClick={() => toggleSelect(item)}
                            className="shrink-0 mt-1"
                            data-testid={`button-select-${item.productId}`}
                          >
                            {isSelected ? (
                              <CheckSquare className="h-5 w-5 text-primary" />
                            ) : (
                              <Square className="h-5 w-5 text-muted-foreground" />
                            )}
                          </button>

                          <img
                            src={item.imageUrl || PLACEHOLDER_IMG}
                            alt={item.name}
                            className="h-16 w-16 rounded-lg object-cover shrink-0"
                            onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }}
                          />

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            {item.selectedColor && (
                              <p className="text-xs text-muted-foreground">ფერი: {item.selectedColor}</p>
                            )}
                            <p className="text-sm font-bold text-primary mt-0.5">₾{(item.price * item.quantity).toFixed(2)}</p>

                            <div className="flex items-center gap-2 mt-1.5">
                              <button
                                onClick={() => updateQuantity(item.productId, item.selectedColor, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-muted hover:bg-muted transition-colors disabled:opacity-30"
                                data-testid={`button-cart-minus-${item.productId}`}
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.productId, item.selectedColor, item.quantity + 1)}
                                disabled={item.quantity >= item.maxStock}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-muted hover:bg-muted transition-colors disabled:opacity-30"
                                data-testid={`button-cart-plus-${item.productId}`}
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          <button
                            onClick={() => { removeItem(item.productId, item.selectedColor); setSelected(prev => { const next = new Set(prev); next.delete(key); return next; }); }}
                            className="shrink-0 self-start text-muted-foreground hover:text-red-500 transition-colors"
                            data-testid={`button-cart-remove-${item.productId}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {selected.size > 0 && (
                    <div className="shrink-0 border-t border-muted px-5 py-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">მონიშნული: {selectedItems.length} ნივთი</span>
                        <span className="font-bold text-primary">₾{selectedTotal.toFixed(2)}</span>
                      </div>
                      <Button
                        onClick={handleBuySelected}
                        className="min-h-[44px] w-full"
                        data-testid="button-cart-buy"
                      >
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        ყიდვა ({selectedItems.length})
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
              <div className="rounded-lg border border-muted bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground mb-2">შეკვეთის შემადგენლობა</p>
                {checkoutItems.map(item => (
                  <div key={cartKey(item)} className="flex justify-between text-sm">
                    <span className="truncate flex-1 mr-2">
                      {item.name}
                      {item.selectedColor ? ` (${item.selectedColor})` : ""} × {item.quantity}
                    </span>
                    <span className="font-medium shrink-0">₾{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <hr className="border-muted" />
                <div className="flex justify-between">
                  <span className="font-semibold text-sm">სულ:</span>
                  <span className="text-lg font-bold text-primary">₾{selectedTotal.toFixed(2)}</span>
                </div>
              </div>

              {profileLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : editing ? (
                <div className="space-y-3">
                  {!profileComplete && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-amber-800">შეავსეთ ყველა ველი შეკვეთის გასაფორმებლად</p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">სახელი და გვარი</label>
                    <Input
                      value={editForm.fullName}
                      onChange={e => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                      placeholder="სახელი გვარი"
                      className="min-h-[44px]"
                      data-testid="input-cart-fullname"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">ქალაქი</label>
                    <Select value={editForm.city} onValueChange={v => setEditForm(prev => ({ ...prev, city: v }))}>
                      <SelectTrigger className="min-h-[44px]" data-testid="select-cart-city">
                        <SelectValue placeholder="აირჩიეთ ქალაქი" />
                      </SelectTrigger>
                      <SelectContent>
                        {GEORGIAN_CITIES.map(city => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">მისამართი</label>
                    <Input
                      value={editForm.address}
                      onChange={e => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="ქუჩა, ბინა, რაიონი"
                      className="min-h-[44px]"
                      data-testid="input-cart-address"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">ტელეფონი</label>
                    <Input
                      value={editForm.phone}
                      onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+995 5XX XXX XXX"
                      className="min-h-[44px]"
                      data-testid="input-cart-phone"
                    />
                  </div>

                  <Button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="min-h-[44px] w-full"
                    data-testid="button-cart-save-profile"
                  >
                    {saving ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> ინახება...</>
                    ) : (
                      <><Check className="mr-2 h-4 w-4" /> შენახვა</>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg border border-muted bg-muted/20 p-3 space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-muted-foreground">მიწოდების ინფორმაცია</span>
                      <button
                        type="button"
                        onClick={() => startEditing(profile)}
                        className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
                        data-testid="button-cart-edit-profile"
                      >
                        <Pencil className="h-3 w-3" />
                        რედაქტირება
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">სახელი და გვარი</span>
                        <span className="text-sm font-medium">{fullName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">ქალაქი</span>
                        <span className="text-sm font-medium">{profile?.city}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">მისამართი</span>
                        <span className="text-sm font-medium">{profile?.address}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">ტელეფონი</span>
                        <span className="text-sm font-medium">{profile?.phone}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => { confirmedItemsRef.current = [...checkoutItems]; setConfirmOpen(true); }}
                    disabled={tbcSubmitting}
                    className="min-h-[44px] w-full rounded-md border-2 border-slate-200 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2"
                    data-testid="button-cart-submit"
                  >
                    {tbcSubmitting ? (
                      <div className="flex items-center justify-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                        <Loader2 className="h-4 w-4 animate-spin" /> მიმდინარეობს...
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="flex items-center gap-3">
                          <SiVisa className="h-6 w-auto text-[#1A1F71]" style={{ fontSize: 38 }} />
                          <SiMastercard className="h-6 w-auto" style={{ fontSize: 34, color: "#EB001B" }} />
                        </div>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          ბარათით გადახდა — ₾{selectedTotal.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base" data-testid="text-cart-confirm-title">შეკვეთის დადასტურება</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed" data-testid="text-cart-confirm-message">
              {profile?.city?.trim().toLowerCase() === "ქუთაისი" ? (
                `ქუთაისში მიტანა უფასოა! ${checkoutItems.length} ნივთის შეკვეთა — ₾${selectedTotal.toFixed(2)}. გსურთ გაგრძელება?`
              ) : (
                `ბანკის ბარათს დაამატებთ საყიდლად. გაითვალისწინეთ, საკურიერო მომსახურეობა — 10.50 ₾. ${checkoutItems.length} ნივთის შეკვეთა — ₾${selectedTotal.toFixed(2)}. გსურთ გაგრძელება?`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cart-confirm-no">არა</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setConfirmOpen(false); handleTbcPay(); }}
              data-testid="button-cart-confirm-yes"
            >
              კი
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AuthLoginDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        onRegistered={handleRegistered}
      />

      {flittPay && (
        <FlittPaymentDialog
          open={!!flittPay}
          amount={flittPay.amount}
          orderId={flittPay.orderId}
          description={flittPay.description}
          onClose={() => setFlittPay(null)}
          onSuccess={() => {
            setFlittPay(null);
            onOpenChange(false);
            navigate("/profile?orders=open");
          }}
        />
      )}
    </>
  );
}
