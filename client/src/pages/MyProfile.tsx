import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AnimatedShell } from "@/components/AnimatedShell";
import { GlassPanel } from "@/components/GlassPanel";
import { TopBar } from "@/components/TopBar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { User, MapPin, Phone, Mail, ShoppingBag, ChevronDown, ChevronUp, ArrowLeft, Package, Save, Pencil, Wallet, LogOut, Truck } from "lucide-react";
import { Link } from "wouter";
import type { Order } from "@shared/models/auth";
import { AuthLoginDialog } from "@/components/AuthLoginDialog";

function CreditRateInfo() {
  const { data } = useQuery<{ credit_to_gel: string }>({
    queryKey: ["/api/credit-info"],
  });
  const rate = data?.credit_to_gel ? Number(data.credit_to_gel) : null;
  if (rate === null) return null;
  return (
    <p className="mt-1 text-[11px] text-green-700" data-testid="text-credit-rate">
      1 კრედიტი = {rate.toFixed(2)} ₾
    </p>
  );
}

const GEORGIAN_CITIES = [
  "თბილისი", "ქუთაისი", "ბათუმი", "რუსთავი", "ფოთი",
  "ზუგდიდი", "გორი", "თელავი", "ახალციხე", "ოზურგეთი",
  "სენაკი", "ხაშური", "სამტრედია", "მარნეული", "ქობულეთი",
  "წყალტუბო", "საგარეჯო", "გარდაბანი", "ბოლნისი", "ზესტაფონი",
];

export default function MyProfile() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    city: "",
    address: "",
    phone: "",
  });

  const { data: profile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile", { credentials: "include" });
      if (!res.ok) throw new Error("პროფილის ჩატვირთვა ვერ მოხერხდა");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: myOrders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders/my"],
    queryFn: async () => {
      const res = await fetch("/api/orders/my", { credentials: "include" });
      if (!res.ok) throw new Error("შეკვეთების ჩატვირთვა ვერ მოხერხდა");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const hasDetails = profile?.firstName && profile?.lastName && profile?.city && profile?.address && profile?.phone;

  useEffect(() => {
    if (profile) {
      setForm({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        city: profile.city || "",
        address: profile.address || "",
        phone: profile.phone || "",
      });
    }
  }, [profile]);

  async function handleSave() {
    if (!form.firstName.trim()) {
      toast({ variant: "destructive", title: "შეცდომა", description: "შეიყვანეთ სახელი" });
      return;
    }
    if (!form.lastName.trim()) {
      toast({ variant: "destructive", title: "შეცდომა", description: "შეიყვანეთ გვარი" });
      return;
    }
    if (!form.city) {
      toast({ variant: "destructive", title: "შეცდომა", description: "აირჩიეთ ქალაქი" });
      return;
    }
    if (!form.address.trim()) {
      toast({ variant: "destructive", title: "შეცდომა", description: "შეიყვანეთ მისამართი" });
      return;
    }
    if (!form.phone.trim()) {
      toast({ variant: "destructive", title: "შეცდომა", description: "შეიყვანეთ ტელეფონის ნომერი" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("შენახვა ვერ მოხერხდა");
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({ title: "წარმატება", description: "პროფილი განახლდა" });
      setEditing(false);
    } catch (err) {
      toast({ variant: "destructive", title: "შეცდომა", description: err instanceof Error ? err.message : "შენახვა ვერ მოხერხდა" });
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-mesh">
        <TopBar />
        <div className="mx-auto max-w-2xl px-4 py-10">
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-mesh">
        <TopBar />
        <div className="mx-auto max-w-2xl px-4 py-10">
          <GlassPanel className="p-8 text-center">
            <User className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h2 className="mt-4 text-lg font-semibold">ავტორიზაცია</h2>
            <p className="mt-2 text-sm text-muted-foreground">პროფილის სანახავად საჭიროა ავტორიზაცია</p>
            <button
              onClick={() => setAuthDialogOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
              data-testid="button-login-profile"
            >
              შესვლა
            </button>
          </GlassPanel>
          <AuthLoginDialog
            open={authDialogOpen}
            onOpenChange={setAuthDialogOpen}
            returnTo="/profile"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh">
      <TopBar />
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <AnimatedShell className="space-y-4 sm:space-y-6">
          <Link href="/">
            <button className="flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-900 transition-colors" data-testid="link-back-home">
              <ArrowLeft className="h-4 w-4" />
              მთავარზე დაბრუნება
            </button>
          </Link>

          <GlassPanel className="p-5 sm:p-7">
            <div className="flex items-center gap-3 mb-5">
              {profile?.profileImageUrl ? (
                <img src={profile.profileImageUrl} alt="" className="h-14 w-14 rounded-full object-cover border-2 border-primary/20" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {(profile?.firstName?.[0] || user?.firstName?.[0] || "?").toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold" data-testid="text-profile-title">ჩემი პროფილი</h1>
                <p className="text-sm text-muted-foreground">{profile?.email || user?.email || ""}</p>
              </div>
            </div>

            {profileLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-3/4" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-lg border border-muted bg-muted/20 p-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">ელ.ფოსტა (Google)</p>
                    <p className="font-medium" data-testid="text-profile-email">
                      {profile?.email || "არ არის მითითებული"}
                    </p>
                  </div>
                </div>

              </div>
            )}
          </GlassPanel>

          <GlassPanel className="p-5 sm:p-7">
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
                <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">ჩემი კრედიტი</p>
                  <p className="text-lg font-bold text-green-600" data-testid="text-profile-credit">
                    ₾{Number(profile?.myCredit || 0).toFixed(2)}
                  </p>
                  <CreditRateInfo />
                </div>
              </div>

            </div>
          </GlassPanel>

          <GlassPanel className="p-5 sm:p-7">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                მიწოდების მონაცემები
              </h2>
              {hasDetails && !editing && (
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)} data-testid="button-edit-details">
                  <Pencil className="mr-1 h-3.5 w-3.5" /> რედაქტირება
                </Button>
              )}
            </div>

            {!hasDetails || editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">სახელი</label>
                    <Input
                      value={form.firstName}
                      onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
                      placeholder="სახელი"
                      className="min-h-[44px]"
                      data-testid="input-profile-firstname"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">გვარი</label>
                    <Input
                      value={form.lastName}
                      onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
                      placeholder="გვარი"
                      className="min-h-[44px]"
                      data-testid="input-profile-lastname"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">ქვეყანა</label>
                  <Input value="საქართველო" disabled className="min-h-[44px] bg-muted" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">ქალაქი</label>
                  <Select value={form.city} onValueChange={v => setForm(p => ({ ...p, city: v }))}>
                    <SelectTrigger className="min-h-[44px]" data-testid="select-profile-city">
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
                  <label className="text-xs font-medium">მისამართი (ქუჩა, ბინა, რაიონი, სოფელი)</label>
                  <Input
                    value={form.address}
                    onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                    placeholder="ქუჩა, ბინა, რაიონი, სოფელი"
                    className="min-h-[44px]"
                    data-testid="input-profile-address"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">ტელეფონის ნომერი</label>
                  <Input
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+995 5XX XXX XXX"
                    className="min-h-[44px]"
                    data-testid="input-profile-phone"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <Button onClick={handleSave} disabled={saving} className="min-h-[44px] flex-1" data-testid="button-save-profile">
                    {saving ? "ინახება..." : <><Save className="mr-1.5 h-4 w-4" /> შენახვა</>}
                  </Button>
                  {editing && (
                    <Button variant="ghost" onClick={() => { setEditing(false); if (profile) setForm({ firstName: profile.firstName || "", lastName: profile.lastName || "", city: profile.city || "", address: profile.address || "", phone: profile.phone || "" }); }} className="min-h-[44px]" data-testid="button-cancel-edit-profile">
                      გაუქმება
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-lg border border-muted bg-muted/20 p-3">
                  <User className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">სახელი, გვარი</p>
                    <p className="font-medium" data-testid="text-profile-fullname">
                      {[profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-muted bg-muted/20 p-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">ქვეყანა, ქალაქი, მისამართი</p>
                    <p className="font-medium" data-testid="text-profile-address">
                      საქართველო, {[profile?.city, profile?.address].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-muted bg-muted/20 p-3">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">ტელეფონი</p>
                    <p className="font-medium" data-testid="text-profile-phone">
                      {profile?.phone || "—"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </GlassPanel>

          <GlassPanel className="overflow-hidden">
            <button
              onClick={() => setOrdersOpen(!ordersOpen)}
              className="flex w-full items-center justify-between p-5 sm:p-7 text-left hover:bg-muted/30 transition-colors"
              data-testid="button-toggle-orders"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                <span className="text-base font-semibold">შეძენილი ნივთები</span>
                {myOrders && myOrders.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary" data-testid="text-orders-count">
                    {myOrders.length}
                  </span>
                )}
              </div>
              {ordersOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
            </button>

            {ordersOpen && (
              <div className="border-t border-muted px-5 pb-5 sm:px-7 sm:pb-7">
                {ordersLoading ? (
                  <div className="space-y-3 pt-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : !myOrders || myOrders.length === 0 ? (
                  <div className="py-8 text-center">
                    <Package className="mx-auto h-10 w-10 text-muted-foreground/30" />
                    <p className="mt-2 text-sm text-muted-foreground">ჯერ არაფერი გიყიდიათ</p>
                  </div>
                ) : (
                  <div className="space-y-3 pt-4">
                    {myOrders.map((order, i) => (
                      <div
                        key={order.id}
                        className="rounded-lg border border-muted bg-muted/20 p-3 sm:p-4"
                        data-testid={`card-order-${i}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm sm:text-base" data-testid={`text-order-name-${i}`}>
                              {order.selectedColor && (
                                <span className="text-primary">{order.selectedColor} </span>
                              )}
                              {order.productName}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span data-testid={`text-order-qty-${i}`}>{order.quantity} ც.</span>
                              <span data-testid={`text-order-price-${i}`} className="font-semibold text-foreground">
                                ₾{parseFloat(order.productPrice).toFixed(2)}
                              </span>
                              <span data-testid={`text-order-date-${i}`}>
                                {order.createdAt ? new Date(order.createdAt).toLocaleDateString("ka-GE", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                }) : ""}
                              </span>
                            </div>
                          </div>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium inline-flex items-center gap-1 ${
                            order.status === "shipped" ? "bg-green-50 text-green-700" :
                            order.status === "completed" ? "bg-green-50 text-green-700" :
                            order.status === "cancelled" ? "bg-red-50 text-red-700" :
                            "bg-yellow-50 text-yellow-700"
                          }`} data-testid={`text-order-status-${i}`}>
                            {order.status === "shipped" ? (<><Truck className="h-3 w-3" /> გაგზავნილი</>) :
                             order.status === "completed" ? "შესრულებული" :
                             order.status === "cancelled" ? "გაუქმებული" :
                             "მუშავდება"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </GlassPanel>

          <div className="mt-6">
            <Button
              variant="outline"
              className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => { window.location.href = "/api/logout"; }}
              data-testid="button-logout"
            >
              <LogOut className="mr-2 h-4 w-4" />
              საიტიდან გასვლა
            </Button>
          </div>
        </AnimatedShell>
      </div>
    </div>
  );
}
