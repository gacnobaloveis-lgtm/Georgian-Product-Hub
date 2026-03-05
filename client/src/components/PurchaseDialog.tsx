import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, ShoppingBag, AlertCircle, Pencil, Check, Coins } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

const GEORGIAN_CITIES = [
  "თბილისი", "ქუთაისი", "ბათუმი", "რუსთავი", "ფოთი", "ზუგდიდი",
  "გორი", "თელავი", "ახალციხე", "ოზურგეთი", "სენაკი", "ხაშური",
  "სამტრედია", "მარნეული", "ქობულეთი", "წყალტუბო", "საგარეჯო",
  "გარდაბანი", "ბოლნისი", "ზესტაფონი",
];

interface PurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: number;
  productName: string;
  productPrice: string;
  quantity: number;
  selectedColor: string | null;
}

interface ProfileData {
  firstName: string | null;
  lastName: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  myCredit?: string | null;
}

interface EditForm {
  fullName: string;
  city: string;
  address: string;
  phone: string;
}

export function PurchaseDialog({ open, onOpenChange, productId, productName, productPrice, quantity, selectedColor }: PurchaseDialogProps) {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [creditSubmitting, setCreditSubmitting] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({ fullName: "", city: "", address: "", phone: "" });
  const [hasPendingOrders, setHasPendingOrders] = useState(false);
  const [userCredit, setUserCredit] = useState(0);
  const [creditToGel, setCreditToGel] = useState(1);

  const unitPrice = Number(productPrice);
  const total = unitPrice * quantity;
  const creditNeeded = total / creditToGel;
  const hasEnoughCredit = userCredit >= creditNeeded;

  useEffect(() => {
    if (open && isAuthenticated && user) {
      setProfileLoading(true);
      setEditing(false);
      setHasPendingOrders(false);
      Promise.all([
        fetch("/api/profile", { credentials: "include" }).then(res => res.ok ? res.json() : null),
        fetch("/api/orders/my", { credentials: "include" }).then(res => res.ok ? res.json() : []),
        fetch("/api/credit-info", { credentials: "include" }).then(res => res.ok ? res.json() : { credit_to_gel: "1" }),
      ])
        .then(([profileData, orders, creditInfo]) => {
          setProfile(profileData);
          if (profileData && !isProfileComplete(profileData)) {
            startEditing(profileData);
          }
          const pending = Array.isArray(orders) && orders.some((o: any) => o.status === "pending");
          setHasPendingOrders(pending);
          setUserCredit(Number(profileData?.myCredit || 0));
          setCreditToGel(Number(creditInfo?.credit_to_gel || 1));
        })
        .catch(() => {})
        .finally(() => setProfileLoading(false));
    }
  }, [open, isAuthenticated, user]);

  function isProfileComplete(p: ProfileData | null): boolean {
    return !!(
      p?.firstName?.trim() &&
      p?.lastName?.trim() &&
      p?.city?.trim() &&
      p?.address?.trim() &&
      p?.phone?.trim()
    );
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

  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
  const profileComplete = isProfileComplete(profile);

  async function handleCreditPurchase() {
    if (!isAuthenticated || !profile || !profileComplete || !hasEnoughCredit) return;

    setCreditSubmitting(true);
    try {
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
          fullName: fullName.trim(),
          city: profile.city,
          address: profile.address!.trim(),
          phone: profile.phone!.trim(),
        }),
      });

      if (res.ok) {
        toast({ title: "შეკვეთა მიღებულია!", description: `"${productName}" (${quantity} ც.) კრედიტით შეძენილია.` });
        queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        onOpenChange(false);
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

  async function handleSubmit() {
    if (!isAuthenticated || !profile || !profileComplete) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          productId,
          productName,
          productPrice: String(total),
          quantity,
          selectedColor,
          fullName: fullName.trim(),
          city: profile.city,
          address: profile.address!.trim(),
          phone: profile.phone!.trim(),
        }),
      });

      if (res.ok) {
        toast({ title: "შეკვეთა მიღებულია!", description: `"${productName}" (${quantity} ც.) წარმატებით შეუკვეთეთ.` });
        onOpenChange(false);
      } else {
        const data = await res.json();
        toast({ variant: "destructive", title: "შეცდომა", description: data.message || "შეკვეთა ვერ მოხერხდა" });
      }
    } catch {
      toast({ variant: "destructive", title: "შეცდომა", description: "კავშირის შეცდომა" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            შეკვეთა
          </DialogTitle>
        </DialogHeader>

        <div className="mb-3 rounded-lg border border-muted bg-muted/30 p-3 space-y-2">
          <p className="text-sm font-medium" data-testid="text-order-product">{productName}</p>
          {selectedColor && (
            <p className="text-xs text-muted-foreground" data-testid="text-order-color">ფერი: <span className="font-medium text-foreground">{selectedColor}</span></p>
          )}

          <div className="space-y-1 text-sm">
            <div className="flex justify-between" data-testid="text-order-unit-price">
              <span className="text-muted-foreground">ფასი ({quantity} ც.):</span>
              <span className="font-medium">₾{total.toFixed(2)}</span>
            </div>
            <hr className="border-muted" />
            <div className="flex justify-between" data-testid="text-order-total">
              <span className="font-semibold">სულ:</span>
              <span className="text-lg font-bold text-primary">₾{total.toFixed(2)}</span>
            </div>
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
                data-testid="input-order-fullname"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">ქალაქი</label>
              <Select value={editForm.city} onValueChange={v => setEditForm(prev => ({ ...prev, city: v }))}>
                <SelectTrigger className="min-h-[44px]" data-testid="select-order-city">
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
                data-testid="input-order-address"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">ტელეფონი</label>
              <Input
                value={editForm.phone}
                onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+995 5XX XXX XXX"
                className="min-h-[44px]"
                data-testid="input-order-phone"
              />
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="min-h-[44px] w-full"
              data-testid="button-save-profile-inline"
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
                  data-testid="button-edit-inline"
                >
                  <Pencil className="h-3 w-3" />
                  რედაქტირება
                </button>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">სახელი და გვარი</span>
                  <span className="text-sm font-medium" data-testid="text-order-fullname">{fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">ქალაქი</span>
                  <span className="text-sm font-medium" data-testid="text-order-city">{profile?.city}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">მისამართი</span>
                  <span className="text-sm font-medium" data-testid="text-order-address">{profile?.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">ტელეფონი</span>
                  <span className="text-sm font-medium" data-testid="text-order-phone">{profile?.phone}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => hasPendingOrders ? handleSubmit() : setConfirmOpen(true)}
              disabled={submitting || creditSubmitting || authLoading}
              className="min-h-[44px] w-full"
              data-testid="button-order-submit"
            >
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> იგზავნება...</>
              ) : (
                `შეკვეთა — ₾${total.toFixed(2)}`
              )}
            </Button>

            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-2">
              <Button
                onClick={() => {
                  if (hasEnoughCredit) {
                    handleCreditPurchase();
                  } else {
                    toast({ variant: "destructive", title: "კრედიტი არასაკმარისია", description: "როგორ დავაგროვო კრედიტი — ნახეთ გზამკვლევში" });
                  }
                }}
                disabled={creditSubmitting || submitting || authLoading}
                variant="outline"
                className="min-h-[44px] w-full border-amber-300 bg-amber-100 hover:bg-amber-200 text-amber-900"
                data-testid="button-order-credit"
              >
                {creditSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> იგზავნება...</>
                ) : (
                  <><Coins className="mr-2 h-4 w-4" /> კრედიტით შეძენა</>
                )}
              </Button>
            </div>

          </div>
        )}
      </DialogContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base" data-testid="text-confirm-title">შეკვეთის დადასტურება</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed" data-testid="text-confirm-message">
              შეგახსენებთ, რომ ტრანსპორტირების საფასური (11.50 ლარი) ანაზღაურდება კურიერთან. სანამ თქვენი ამანათი საწყობიდან გამოვა, გაქვთ შანსი ამავე საკურიერო ფასში დაამატოთ სხვა ნივთებიც. ისარგებლეთ ამ შესაძლებლობით, სანამ ნივთი დამუშავების პროცესშია!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-confirm-no">არა</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setConfirmOpen(false); handleSubmit(); }}
              data-testid="button-confirm-yes"
            >
              კი
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
