import { useState, useEffect } from "react";
import { useProducts, useDeleteProduct, useUpdateProduct } from "@/hooks/use-products";
import { AnimatedShell } from "@/components/AnimatedShell";
import { GlassPanel } from "@/components/GlassPanel";
import { TopBar } from "@/components/TopBar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Pencil, Trash2, X, Check, Upload, ImageOff, Plus, Settings, FolderPlus, LogOut, Users, ShoppingBag, Gauge, Shield, Truck, BarChart3, Globe, ExternalLink, Paintbrush } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/use-categories";
import { IconPicker, LucideIcon } from "@/components/IconPicker";
import { useAdminLogout, useAdminStatus } from "@/hooks/use-admin";
import { useAdminUsers, useUpdateUser, useDeleteUser } from "@/hooks/use-users";
import type { Product } from "@shared/schema";
import type { User, Order } from "@shared/models/auth";
import { VisualSection } from "@/components/VisualSection";

const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' fill='%23e2e8f0'%3E%3Crect width='80' height='80'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%2394a3b8'%3E%E1%83%90%E1%83%A0%E1%83%90%E1%83%A1%E1%83%A3%E1%83%A0%E1%83%90%E1%83%97%E1%83%98%3C/text%3E%3C/svg%3E";

function ImgWithFallback({ src, alt, className, ...rest }: React.ImgHTMLAttributes<HTMLImageElement>) {
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

interface ColorEntry {
  color: string;
  stock: string;
}

interface EditFormState {
  name: string;
  description: string;
  originalPrice: string;
  discountPrice: string;
  stock: string;
  youtubeUrl: string;
  colors: ColorEntry[];
  imageFile: File | null;
  imagePreview: string | null;
}

function ProductRow({ product }: { product: Product }) {
  const { toast } = useToast();
  const deleteMutation = useDeleteProduct();
  const updateMutation = useUpdateProduct();
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  function parseColors(cs: string | null): ColorEntry[] {
    try {
      const obj = JSON.parse(cs || "{}");
      return Object.entries(obj).map(([color, stock]) => ({ color, stock: String(stock) }));
    } catch { return []; }
  }

  const [editForm, setEditForm] = useState<EditFormState>({
    name: product.name,
    description: product.description,
    originalPrice: product.originalPrice,
    discountPrice: product.discountPrice || "",
    stock: String(product.stock ?? 0),
    youtubeUrl: product.youtubeUrl || "",
    colors: parseColors(product.colorStock),
    imageFile: null,
    imagePreview: null,
  });

  function startEdit() {
    setEditForm({
      name: product.name,
      description: product.description,
      originalPrice: product.originalPrice,
      discountPrice: product.discountPrice || "",
      stock: String(product.stock ?? 0),
      youtubeUrl: product.youtubeUrl || "",
      colors: parseColors(product.colorStock),
      imageFile: null,
      imagePreview: null,
    });
    setIsEditing(true);
    setConfirmDelete(false);
  }

  function cancelEdit() {
    setIsEditing(false);
    setEditForm({
      name: product.name,
      description: product.description,
      originalPrice: product.originalPrice,
      discountPrice: product.discountPrice || "",
      stock: String(product.stock ?? 0),
      youtubeUrl: product.youtubeUrl || "",
      colors: parseColors(product.colorStock),
      imageFile: null,
      imagePreview: null,
    });
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setEditForm((prev) => ({
      ...prev,
      imageFile: file,
      imagePreview: file ? URL.createObjectURL(file) : null,
    }));
  }

  async function handleSave() {
    const formData = new FormData();
    formData.append("name", editForm.name);
    formData.append("description", editForm.description);
    formData.append("originalPrice", editForm.originalPrice.replace(",", "."));
    if (editForm.discountPrice.trim()) {
      formData.append("discountPrice", editForm.discountPrice.replace(",", "."));
    }
    formData.append("stock", String(parseInt(editForm.stock) || 0));
    const colorStockObj: Record<string, number> = {};
    editForm.colors.forEach((c) => {
      if (c.color.trim()) colorStockObj[c.color.trim()] = parseInt(c.stock) || 0;
    });
    formData.append("colorStock", JSON.stringify(colorStockObj));
    formData.append("youtubeUrl", editForm.youtubeUrl.trim());
    if (editForm.imageFile) {
      formData.append("image", editForm.imageFile);
    }

    try {
      await updateMutation.mutateAsync({ id: product.id, formData });
      toast({ title: "წარმატება", description: `"${editForm.name}" განახლდა` });
      setIsEditing(false);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "შეცდომა",
        description: err instanceof Error ? err.message : "განახლება ვერ მოხერხდა",
      });
    }
  }

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(product.id);
      toast({ title: "წაშლილია", description: `"${product.name}" წაიშალა` });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "შეცდომა",
        description: err instanceof Error ? err.message : "წაშლა ვერ მოხერხდა",
      });
    }
  }

  const formatPrice = (price: string | null) => {
    if (!price) return "—";
    return `${Number(price).toLocaleString("ka-GE", { minimumFractionDigits: 2 })} ₾`;
  };

  if (isEditing) {
    return (
      <Card className="border-primary/30 bg-card" data-testid={`card-edit-product-${product.id}`}>
        <CardContent className="p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-primary">რედაქტირება — ID #{product.id}</h3>
            <Button variant="ghost" size="sm" onClick={cancelEdit} data-testid={`button-cancel-edit-${product.id}`}>
              <X className="mr-1 h-4 w-4" /> გაუქმება
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">სახელი</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                data-testid={`input-edit-name-${product.id}`}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">აღწერა</label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                data-testid={`input-edit-desc-${product.id}`}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">საწყისი ფასი (₾)</label>
              <Input
                value={editForm.originalPrice}
                onChange={(e) => setEditForm((p) => ({ ...p, originalPrice: e.target.value }))}
                data-testid={`input-edit-price-${product.id}`}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">ფასდაკლება (₾)</label>
              <Input
                value={editForm.discountPrice}
                onChange={(e) => setEditForm((p) => ({ ...p, discountPrice: e.target.value }))}
                placeholder="არჩევითი"
                data-testid={`input-edit-discount-${product.id}`}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">რაოდენობა</label>
              <Input
                type="number"
                value={editForm.stock}
                onChange={(e) => setEditForm((p) => ({ ...p, stock: e.target.value }))}
                placeholder="0"
                data-testid={`input-edit-stock-${product.id}`}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">სურათის შეცვლა (არჩევითი)</label>
              <div className="flex items-center gap-3">
                <ImgWithFallback
                  src={editForm.imagePreview || product.imageUrl || undefined}
                  alt={product.name}
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 px-3 py-2 text-xs text-muted-foreground hover:border-primary">
                  <Upload className="h-3.5 w-3.5" />
                  {editForm.imageFile ? editForm.imageFile.name : "ახალი სურათი..."}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                    data-testid={`input-edit-image-${product.id}`}
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">თუ არ აირჩევთ ახალ სურათს, ძველი შენარჩუნდება.</p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">ფერები და მარაგი</label>
              <div className="space-y-2">
                {editForm.colors.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={c.color}
                      onChange={(e) => {
                        const arr = [...editForm.colors];
                        arr[i] = { ...arr[i], color: e.target.value };
                        setEditForm((p) => ({ ...p, colors: arr }));
                      }}
                      placeholder="ფერი (მაგ: ოქროსფერი)"
                      className="flex-1"
                      data-testid={`input-edit-color-name-${product.id}-${i}`}
                    />
                    <Input
                      type="number"
                      min="0"
                      value={c.stock}
                      onChange={(e) => {
                        const arr = [...editForm.colors];
                        arr[i] = { ...arr[i], stock: e.target.value };
                        setEditForm((p) => ({ ...p, colors: arr }));
                      }}
                      placeholder="რაოდენობა"
                      className="w-24"
                      data-testid={`input-edit-color-stock-${product.id}-${i}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const arr = editForm.colors.filter((_, idx) => idx !== i);
                        setEditForm((p) => ({ ...p, colors: arr }));
                      }}
                      data-testid={`button-remove-edit-color-${product.id}-${i}`}
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditForm((p) => ({ ...p, colors: [...p.colors, { color: "", stock: "0" }] }))}
                  data-testid={`button-add-edit-color-${product.id}`}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> ფერის დამატება
                </Button>
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">YouTube ვიდეო <span className="text-muted-foreground/60">(არჩევითი)</span></label>
              <Input
                value={editForm.youtubeUrl}
                onChange={(e) => setEditForm((p) => ({ ...p, youtubeUrl: e.target.value }))}
                placeholder="https://www.youtube.com/watch?v=... ან /shorts/..."
                data-testid={`input-edit-youtube-${product.id}`}
              />
              {editForm.youtubeUrl.trim() && (
                <p className="text-xs text-muted-foreground">
                  მხარდაჭერილი ფორმატები: youtube.com/watch?v=..., youtube.com/shorts/..., youtu.be/...
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending || !editForm.name.trim() || !editForm.originalPrice.trim()}
              data-testid={`button-save-edit-${product.id}`}
            >
              {updateMutation.isPending ? "ინახება..." : <><Check className="mr-1 h-4 w-4" /> შენახვა</>}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-card-border bg-card" data-testid={`card-product-row-${product.id}`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <ImgWithFallback
            src={product.imageUrl || undefined}
            alt={product.name}
            className="h-20 w-20 shrink-0 rounded-lg object-cover"
            data-testid={`img-product-thumb-${product.id}`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold" data-testid={`text-product-name-${product.id}`}>
                  {product.name}
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2" data-testid={`text-product-desc-${product.id}`}>
                  {product.description}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startEdit}
                  data-testid={`button-edit-${product.id}`}
                >
                  <Pencil className="mr-1 h-3.5 w-3.5" /> რედაქტირება
                </Button>
                {confirmDelete ? (
                  <div className="flex gap-1">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-confirm-delete-${product.id}`}
                    >
                      {deleteMutation.isPending ? "..." : "დიახ"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmDelete(false)}
                      data-testid={`button-cancel-delete-${product.id}`}
                    >
                      არა
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDelete(true)}
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    data-testid={`button-delete-${product.id}`}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> წაშლა
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-sm font-bold" data-testid={`text-price-${product.id}`}>
                {product.discountPrice && Number(product.discountPrice) < Number(product.originalPrice) ? (
                  <>
                    <span className="text-foreground">{formatPrice(product.discountPrice)}</span>
                    <span className="ml-2 text-xs font-normal text-muted-foreground line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                  </>
                ) : (
                  formatPrice(product.originalPrice)
                )}
              </span>
              {product.imageUrl && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                  სურათი ✓
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SiteManagement() {
  const { toast } = useToast();
  const { data: cats, isLoading } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState<string | null>(null);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconPickerForId, setIconPickerForId] = useState<number | null>(null);

  async function handleAdd() {
    if (!newName.trim()) return;
    try {
      await createMutation.mutateAsync({ name: newName.trim(), icon: newIcon });
      setNewName("");
      setNewIcon(null);
      toast({ title: "დამატებულია" });
    } catch (err) {
      toast({ variant: "destructive", title: "შეცდომა", description: err instanceof Error ? err.message : "შეცდომა" });
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "წაშლილია" });
    } catch (err) {
      toast({ variant: "destructive", title: "შეცდომა", description: err instanceof Error ? err.message : "შეცდომა" });
    }
  }

  async function handleIconSelect(iconName: string | null) {
    if (iconPickerForId !== null) {
      try {
        await updateMutation.mutateAsync({ id: iconPickerForId, icon: iconName });
        toast({ title: iconName ? "აიქონი შეცვლილია" : "აიქონი წაშლილია" });
      } catch (err) {
        toast({ variant: "destructive", title: "შეცდომა" });
      }
      setIconPickerForId(null);
    } else {
      setNewIcon(iconName);
    }
  }

  return (
    <GlassPanel className="p-5 sm:p-7">
      <div className="mb-4 flex items-center gap-2">
        <Settings className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">საიტის მართვა</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">პროდუქციის ოთახები (კატეგორიები)</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setIconPickerForId(null);
                setIconPickerOpen(true);
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-input bg-background hover:bg-accent transition-colors"
              title="აიქონის არჩევა"
              data-testid="button-pick-new-icon"
            >
              {newIcon ? (
                <LucideIcon name={newIcon} className="h-4 w-4 text-primary" />
              ) : (
                <Plus className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ახალი კატეგორიის სახელი..."
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              data-testid="input-category-name"
            />
            <Button onClick={handleAdd} disabled={createMutation.isPending || !newName.trim()} data-testid="button-add-category">
              <FolderPlus className="mr-1 h-4 w-4" /> დამატება
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !cats || cats.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted-foreground">კატეგორიები ჯერ არ არის დამატებული</p>
        ) : (
          <div className="space-y-2">
            {cats.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between rounded-lg border border-card-border bg-card px-4 py-2.5" data-testid={`category-row-${cat.id}`}>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIconPickerForId(cat.id);
                      setIconPickerOpen(true);
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 transition-colors"
                    title="აიქონის შეცვლა"
                    data-testid={`button-pick-icon-${cat.id}`}
                  >
                    {cat.icon ? (
                      <LucideIcon name={cat.icon} className="h-4 w-4 text-primary" />
                    ) : (
                      <Plus className="h-3 w-3 text-muted-foreground" />
                    )}
                  </button>
                  <span className="text-sm font-medium" data-testid={`text-category-${cat.id}`}>{cat.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handleDelete(cat.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-category-${cat.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <IconPicker
        open={iconPickerOpen}
        onOpenChange={setIconPickerOpen}
        value={iconPickerForId !== null ? (cats?.find((c) => c.id === iconPickerForId)?.icon ?? null) : newIcon}
        onSelect={handleIconSelect}
      />
    </GlassPanel>
  );
}

function AnalyticsSection() {
  const [days, setDays] = useState(7);
  const { data, isLoading } = useQuery<{ sources: { domain: string; count: number }[]; total: number; days: number }>({
    queryKey: [`/api/admin/analytics?days=${days}`],
  });

  const maxCount = data?.sources?.[0]?.count || 1;

  return (
    <GlassPanel className="p-5 sm:p-7">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">ტრაფიკის წყაროები</h2>
        </div>
        <div className="flex gap-1.5">
          {[1, 7, 30, 90].map((d) => (
            <Button
              key={d}
              variant={days === d ? "default" : "outline"}
              size="sm"
              onClick={() => setDays(d)}
              className="text-xs px-2.5 min-h-[32px]"
              data-testid={`button-analytics-${d}d`}
            >
              {d === 1 ? "დღეს" : `${d} დღე`}
            </Button>
          ))}
        </div>
      </div>

      <div className="mb-5 rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
        <p className="text-xs text-muted-foreground mb-1">სულ ვიზიტები</p>
        <p className="text-3xl font-bold text-primary" data-testid="text-total-visits">{data?.total ?? "—"}</p>
        <p className="text-xs text-muted-foreground mt-1">ბოლო {days === 1 ? "24 საათი" : `${days} დღე`}</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : !data?.sources || data.sources.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">ამ პერიოდში ვიზიტები არ არის</p>
      ) : (
        <div className="space-y-2.5">
          {data.sources.map((source, idx) => {
            const pct = Math.round((source.count / (data.total || 1)) * 100);
            const barWidth = Math.max((source.count / maxCount) * 100, 4);
            return (
              <div key={idx} className="rounded-lg border border-card-border bg-card p-3" data-testid={`analytics-row-${idx}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {source.domain === "პირდაპირი შესვლა" ? (
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                    <span className="text-sm font-medium truncate" data-testid={`text-source-${idx}`}>{source.domain}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{pct}%</span>
                    <span className="text-sm font-bold min-w-[40px] text-right" data-testid={`text-count-${idx}`}>{source.count}</span>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassPanel>
  );
}

function ProductsSection() {
  const { data: products, isLoading } = useProducts();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">პროდუქტების მართვა</h2>
        <Link href="/admin-add">
          <Button size="sm" data-testid="link-add-product">
            <Plus className="mr-1 h-4 w-4" /> ახლის დამატება
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-card-border bg-card">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-20 w-20 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !products || products.length === 0 ? (
        <GlassPanel className="p-10">
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
            <ImageOff className="mb-3 h-12 w-12 opacity-30" />
            <p className="text-lg font-medium">პროდუქტები ჯერ არ არის</p>
            <p className="mt-1 text-sm">დაამატეთ პირველი პროდუქტი „ახლის დამატება" ღილაკზე დაჭერით.</p>
          </div>
        </GlassPanel>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground" data-testid="text-product-count">
            სულ: {products.length} პროდუქტი
          </p>
          {products.map((product) => (
            <ProductRow key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

function UserRow({ user, index, canDelete = true }: { user: User; index: number; canDelete?: boolean }) {
  const { toast } = useToast();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    email: user.email || "",
    city: (user as any).city || "",
    address: user.address || "",
    phone: user.phone || "",
  });

  function startEdit() {
    setEditForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      city: (user as any).city || "",
      address: user.address || "",
      phone: user.phone || "",
    });
    setIsEditing(true);
    setConfirmDelete(false);
  }

  async function handleSave() {
    try {
      await updateMutation.mutateAsync({ id: user.id, data: editForm });
      toast({ title: "წარმატება", description: "მომხმარებელი განახლდა" });
      setIsEditing(false);
    } catch (err) {
      toast({ variant: "destructive", title: "შეცდომა", description: err instanceof Error ? err.message : "განახლება ვერ მოხერხდა" });
    }
  }

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(user.id);
      toast({ title: "წაშლილია", description: "მომხმარებელი წაიშალა" });
    } catch (err) {
      toast({ variant: "destructive", title: "შეცდომა", description: err instanceof Error ? err.message : "წაშლა ვერ მოხერხდა" });
    }
  }

  if (isEditing) {
    return (
      <tr className="border-b border-muted/50 bg-muted/20" data-testid={`row-user-edit-${index}`}>
        <td className="px-3 py-3 font-medium align-top">{index + 1}</td>
        <td className="px-3 py-3" colSpan={3}>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">სახელი</label>
              <Input value={editForm.firstName} onChange={(e) => setEditForm(p => ({ ...p, firstName: e.target.value }))} data-testid={`input-edit-user-firstname-${index}`} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">გვარი</label>
              <Input value={editForm.lastName} onChange={(e) => setEditForm(p => ({ ...p, lastName: e.target.value }))} data-testid={`input-edit-user-lastname-${index}`} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">ელ.ფოსტა</label>
              <Input value={editForm.email} onChange={(e) => setEditForm(p => ({ ...p, email: e.target.value }))} data-testid={`input-edit-user-email-${index}`} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">ქალაქი</label>
              <Input value={editForm.city} onChange={(e) => setEditForm(p => ({ ...p, city: e.target.value }))} data-testid={`input-edit-user-city-${index}`} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">მისამართი</label>
              <Input value={editForm.address} onChange={(e) => setEditForm(p => ({ ...p, address: e.target.value }))} data-testid={`input-edit-user-address-${index}`} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">ტელეფონი</label>
              <Input value={editForm.phone} onChange={(e) => setEditForm(p => ({ ...p, phone: e.target.value }))} data-testid={`input-edit-user-phone-${index}`} />
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} data-testid={`button-cancel-edit-user-${index}`}>
              <X className="mr-1 h-3.5 w-3.5" /> გაუქმება
            </Button>
            <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending} data-testid={`button-save-user-${index}`}>
              {updateMutation.isPending ? "ინახება..." : <><Check className="mr-1 h-3.5 w-3.5" /> შენახვა</>}
            </Button>
          </div>
        </td>
        <td className="px-3 py-3"></td>
      </tr>
    );
  }

  return (
    <tr key={user.id} className="border-b border-muted/50 transition-colors hover:bg-muted/30" data-testid={`row-user-${index}`}>
      <td className="px-3 py-3 font-medium">{index + 1}</td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2.5">
          {user.profileImageUrl ? (
            <img src={user.profileImageUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {(user.firstName?.[0] || user.email?.[0] || "?").toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-medium" data-testid={`text-user-name-${index}`}>
              {[user.firstName, user.lastName].filter(Boolean).join(" ") || "—"}
            </p>
            <p className="text-xs text-muted-foreground" data-testid={`text-user-email-${index}`}>
              {user.email || "—"}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="space-y-0.5 text-xs">
          <p><span className="text-muted-foreground">ქალაქი:</span> {(user as any).city || "—"}</p>
          <p><span className="text-muted-foreground">მისამართი:</span> {user.address || "—"}</p>
          <p><span className="text-muted-foreground">ტელეფონი:</span> {user.phone || "—"}</p>
        </div>
      </td>
      <td className="px-3 py-3 text-xs text-muted-foreground">
        {user.createdAt ? new Date(user.createdAt).toLocaleDateString("ka-GE", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }) : "—"}
      </td>
      <td className="px-3 py-3">
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={startEdit} data-testid={`button-edit-user-${index}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {canDelete && (confirmDelete ? (
            <div className="flex gap-1">
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteMutation.isPending} data-testid={`button-confirm-delete-user-${index}`}>
                {deleteMutation.isPending ? "..." : "დიახ"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)} data-testid={`button-cancel-delete-user-${index}`}>
                არა
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} data-testid={`button-delete-user-${index}`}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          ))}
        </div>
      </td>
    </tr>
  );
}

function UsersSection() {
  const { data: usersList, isLoading } = useAdminUsers();
  const { data: adminStatus } = useAdminStatus();
  const canDeleteUsers = adminStatus?.role === "admin" || !!(adminStatus as any)?.isAdmin;

  return (
    <GlassPanel className="p-5 sm:p-7">
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">რეგისტრირებული მომხმარებლები</h2>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : !usersList || usersList.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">მომხმარებლები ჯერ არ არის რეგისტრირებული</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="table-users">
            <thead>
              <tr className="border-b border-muted">
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">№</th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">მომხმარებელი</th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">დეტალები</th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">თარიღი</th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">მოქმედება</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map((user, index) => (
                <UserRow key={user.id} user={user} index={index} canDelete={canDeleteUsers} />
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground" data-testid="text-users-count">
            სულ: {usersList.length} მომხმარებელი
          </p>
        </div>
      )}
    </GlassPanel>
  );
}

function OrdersSection() {
  const { toast } = useToast();
  const { data: ordersList, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/admin/orders"],
    queryFn: async () => {
      const res = await fetch("/api/admin/orders", { credentials: "include" });
      if (!res.ok) throw new Error("შეცდომა");
      return res.json();
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/admin/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("შეცდომა");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({ title: "სტატუსი განახლდა" });
    },
    onError: () => {
      toast({ title: "შეცდომა", variant: "destructive" });
    },
  });

  return (
    <GlassPanel className="p-5 sm:p-7">
      <div className="mb-4 flex items-center gap-2">
        <ShoppingBag className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">შეკვეთები</h2>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : !ordersList || ordersList.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">შეკვეთები ჯერ არ არის</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="table-orders">
            <thead>
              <tr className="border-b border-muted">
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">№</th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">პროდუქტი</th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">რაოდ.</th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">ფერი</th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">მომხმარებელი</th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">მისამართი</th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">ტელეფონი</th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">ფასი</th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">თარიღი</th>
                <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">გაგზავნილი</th>
              </tr>
            </thead>
            <tbody>
              {ordersList.map((order, index) => {
                const isShipped = order.status === "shipped";
                return (
                <tr key={order.id} className="border-b border-muted/50 transition-colors hover:bg-muted/30" data-testid={`row-order-${index}`}>
                  <td className="px-3 py-3 font-medium">{index + 1}</td>
                  <td className="px-3 py-3 font-medium" data-testid={`text-order-product-${index}`}>{order.productName}</td>
                  <td className="px-3 py-3 text-center" data-testid={`text-order-qty-${index}`}>{order.quantity || 1}</td>
                  <td className="px-3 py-3 text-xs" data-testid={`text-order-color-${index}`}>{(order as any).selectedColor || "—"}</td>
                  <td className="px-3 py-3" data-testid={`text-order-user-${index}`}>{order.fullName}</td>
                  <td className="px-3 py-3 text-xs">
                    <p>{order.city}, {order.country}</p>
                    <p className="text-muted-foreground">{order.address}</p>
                  </td>
                  <td className="px-3 py-3 text-xs" data-testid={`text-order-phone-${index}`}>{order.phone}</td>
                  <td className="px-3 py-3 font-medium text-primary" data-testid={`text-order-price-${index}`}>₾{Number(order.productPrice).toFixed(2)}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString("ka-GE", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }) : "—"}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      data-testid={`toggle-order-shipped-${index}`}
                      disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ id: order.id, status: isShipped ? "pending" : "shipped" })}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
                        isShipped ? "bg-green-500" : "bg-gray-300"
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        isShipped ? "translate-x-6" : "translate-x-1"
                      }`} />
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground" data-testid="text-orders-count">
            სულ: {ordersList.length} შეკვეთა
          </p>
        </div>
      )}
    </GlassPanel>
  );
}

function AutoDravaSection() {
  const { data: products, isLoading } = useProducts();
  const updateProduct = useUpdateProduct();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editField, setEditField] = useState<"soldCount" | "viewCount">("soldCount");
  const [editValue, setEditValue] = useState("");
  const [activeTab, setActiveTab] = useState<"stats" | "referrals" | "settings" | "contact">("stats");

  const { data: referralLogs, isLoading: logsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/referral-logs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/referral-logs", { credentials: "include" });
      if (!res.ok) throw new Error("შეცდომა");
      return res.json();
    },
  });

  const { data: settings } = useQuery<{ referral_credit_amount: string; credit_to_gel: string }>({
    queryKey: ["/api/admin/settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      if (!res.ok) throw new Error("შეცდომა");
      return res.json();
    },
  });

  const [creditAmount, setCreditAmount] = useState("");
  const [creditToGel, setCreditToGel] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (settings) {
      setCreditAmount(settings.referral_credit_amount);
      setCreditToGel(settings.credit_to_gel);
    }
  }, [settings]);

  const totalSold = products ? products.reduce((sum, p) => sum + (p.soldCount || 0), 0) : 0;
  const totalViews = products ? products.reduce((sum, p) => sum + (p.viewCount || 0), 0) : 0;

  function startEdit(product: Product, field: "soldCount" | "viewCount") {
    setEditingId(product.id);
    setEditField(field);
    setEditValue(String(field === "soldCount" ? (product.soldCount || 0) : (product.viewCount || 0)));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
  }

  async function saveEdit(productId: number) {
    const val = parseInt(editValue);
    if (isNaN(val) || val < 0) {
      toast({ title: "შეცდომა", description: "მიუთითეთ სწორი რიცხვი", variant: "destructive" });
      return;
    }
    const formData = new FormData();
    formData.append(editField, String(val));
    updateProduct.mutate(
      { id: productId, formData },
      {
        onSuccess: () => {
          toast({ title: "განახლდა" });
          cancelEdit();
        },
        onError: () => {
          toast({ title: "შეცდომა", variant: "destructive" });
        },
      }
    );
  }

  async function saveSettings() {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          referral_credit_amount: creditAmount,
          credit_to_gel: creditToGel,
        }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
        toast({ title: "წარმატება", description: "პარამეტრები შეინახა" });
      } else {
        toast({ variant: "destructive", title: "შეცდომა" });
      }
    } catch {
      toast({ variant: "destructive", title: "კავშირის შეცდომა" });
    } finally {
      setSavingSettings(false);
    }
  }

  const formatViews = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`;
    return String(count);
  };

  return (
    <GlassPanel className="p-5 sm:p-7">
      <div className="mb-4 flex items-center gap-2">
        <Gauge className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">ავტო-ძრავა</h2>
      </div>

      <div className="mb-4 flex gap-2">
        <Button
          variant={activeTab === "stats" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("stats")}
          data-testid="tab-stats"
        >
          სტატისტიკა
        </Button>
        <Button
          variant={activeTab === "referrals" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("referrals")}
          data-testid="tab-referrals"
        >
          გადაზიარებები
        </Button>
        <Button
          variant={activeTab === "settings" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("settings")}
          data-testid="tab-settings"
        >
          კრედიტის მართვა
        </Button>
        <Button
          variant={activeTab === "contact" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("contact")}
          data-testid="tab-contact"
        >
          საკონტაქტო ინფო
        </Button>
      </div>

      {activeTab === "stats" && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
              <p className="text-xs text-muted-foreground">სულ გაყიდული</p>
              <p className="text-2xl font-bold text-primary" data-testid="text-total-sold">{totalSold}</p>
              <p className="text-[10px] text-muted-foreground">ნივთი</p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 text-center">
              <p className="text-xs text-muted-foreground">სულ ნახვები</p>
              <p className="text-2xl font-bold text-blue-600" data-testid="text-total-views">{formatViews(totalViews)}</p>
              <p className="text-[10px] text-muted-foreground">კლიკი</p>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !products || products.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">პროდუქტები ჯერ არ არის</p>
          ) : (
            <div className="space-y-2">
              {products.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-muted bg-muted/20 px-4 py-3"
                  data-testid={`row-sold-product-${product.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="shrink-0 text-xs font-bold text-muted-foreground">{index + 1}.</span>
                    <span className="truncate text-sm font-medium">{product.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {editingId === product.id ? (
                      <>
                        <Input
                          type="number"
                          min={0}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-20 h-8 text-sm text-center"
                          data-testid={`input-edit-count-${product.id}`}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => saveEdit(product.id)}
                          disabled={updateProduct.isPending}
                          className="h-8 w-8 p-0"
                          data-testid={`button-save-count-${product.id}`}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelEdit}
                          className="h-8 w-8 p-0"
                          data-testid={`button-cancel-count-${product.id}`}
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(product, "viewCount")}
                          className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-600 hover:bg-blue-100 transition-colors"
                          data-testid={`button-edit-views-${product.id}`}
                        >
                          👁 {formatViews(product.viewCount || 0)}
                        </button>
                        <button
                          onClick={() => startEdit(product, "soldCount")}
                          className="flex items-center gap-1 rounded-md bg-green-100 px-2 py-1 text-xs font-bold text-green-700 hover:bg-green-200 transition-colors"
                          data-testid={`button-edit-sold-${product.id}`}
                        >
                          🛒 {product.soldCount || 0} ც
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "referrals" && (
        <div>
          <h3 className="mb-3 text-sm font-semibold">გადაზიარებების ისტორია</h3>
          {logsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !referralLogs || referralLogs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">გადაზიარებები ჯერ არ არის</p>
          ) : (
            <div className="space-y-2">
              {referralLogs.map((log: any, i: number) => (
                <div
                  key={log.id}
                  className="rounded-lg border border-muted bg-muted/20 p-3"
                  data-testid={`referral-log-${log.id}`}
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate" data-testid={`text-referrer-${log.id}`}>
                        <span className="text-muted-foreground">გამზიარებელი:</span> {log.referrerName}
                      </p>
                      <p className="text-xs truncate" data-testid={`text-buyer-${log.id}`}>
                        <span className="text-muted-foreground">მყიდველი:</span> {log.buyerName}
                      </p>
                      <p className="text-xs truncate">
                        <span className="text-muted-foreground">პროდუქტი:</span> {log.productName}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-medium text-primary">₾{Number(log.productPrice).toFixed(2)}</span>
                      <span className="inline-flex items-center rounded-full bg-green-100 border border-green-200 px-2 py-0.5 text-[10px] font-bold text-green-700">
                        +{Number(log.creditAwarded).toFixed(0)} კრედიტი
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {log.createdAt ? new Date(log.createdAt).toLocaleDateString("ka-GE", {
                          day: "numeric", month: "short", year: "numeric"
                        }) : ""}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              <p className="mt-2 text-xs text-muted-foreground">
                სულ: {referralLogs.length} გადაზიარება, {referralLogs.reduce((s: number, l: any) => s + Number(l.creditAwarded || 0), 0)} კრედიტი გაცემული
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === "settings" && (
        <div>
          <h3 className="mb-4 text-sm font-semibold">კრედიტის პარამეტრები</h3>

          <div className="space-y-4">
            <div className="rounded-lg border border-muted bg-muted/20 p-4">
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                რამდენ კრედიტს მიიღებს გამზიარებელი ერთ გაყიდვაზე
              </label>
              <Input
                type="number"
                min={0}
                value={creditAmount || settings?.referral_credit_amount || "5"}
                onChange={(e) => setCreditAmount(e.target.value)}
                className="min-h-[44px]"
                data-testid="input-credit-amount"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                მაგ: 5 = გამზიარებელი მიიღებს 5 კრედიტს ყოველ გაყიდვაზე
              </p>
            </div>

            <div className="rounded-lg border border-muted bg-muted/20 p-4">
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                1 კრედიტი = რამდენი ₾ (ლარის ეკვივალენტი)
              </label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={creditToGel || settings?.credit_to_gel || "1"}
                onChange={(e) => setCreditToGel(e.target.value)}
                className="min-h-[44px]"
                data-testid="input-credit-to-gel"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                მაგ: 1 = ერთი კრედიტი = 1₾; 0.5 = ერთი კრედიტი = 0.50₾
              </p>
            </div>

            {creditAmount && creditToGel && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                <p className="text-xs text-orange-800 font-medium">
                  მაგალითი: თუ პროდუქტი გაიყიდა — გამზიარებელი მიიღებს{" "}
                  <span className="font-bold">{creditAmount} კრედიტს</span> ={" "}
                  <span className="font-bold">₾{(Number(creditAmount) * Number(creditToGel)).toFixed(2)}</span>
                </p>
              </div>
            )}

            <Button
              onClick={saveSettings}
              disabled={savingSettings}
              className="w-full min-h-[44px]"
              data-testid="button-save-settings"
            >
              {savingSettings ? "ინახება..." : "შენახვა"}
            </Button>
          </div>
        </div>
      )}

      {activeTab === "contact" && (
        <ContactInfoEditor />
      )}
    </GlassPanel>
  );
}

function ContactInfoEditor() {
  const { toast } = useToast();
  const { data: contact } = useQuery<{ phone: string; email: string; whatsapp: string; address: string; workHours: string; dayOff: string }>({
    queryKey: ["/api/contact-info"],
  });

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [workHours, setWorkHours] = useState("");
  const [dayOff, setDayOff] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (contact) {
      setPhone(contact.phone);
      setEmail(contact.email);
      setWhatsapp(contact.whatsapp);
      setAddress(contact.address);
      setWorkHours(contact.workHours);
      setDayOff(contact.dayOff);
    }
  }, [contact]);

  async function saveContact() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/contact-info", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone, email, whatsapp, address, workHours, dayOff }),
      });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: ["/api/contact-info"] });
      toast({ title: "შენახულია", description: "საკონტაქტო ინფორმაცია განახლდა" });
    } catch {
      toast({ title: "შეცდომა", description: "ვერ შეინახა", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">საკონტაქტო ინფორმაცია</h3>
      <div className="rounded-lg border border-muted bg-muted/20 p-4 space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">ტელეფონი</label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="min-h-[44px]" data-testid="input-contact-phone" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">ელ-ფოსტა</label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} className="min-h-[44px]" data-testid="input-contact-email" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">WhatsApp ნომერი</label>
          <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="min-h-[44px]" data-testid="input-contact-whatsapp" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">მისამართი</label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} className="min-h-[44px]" data-testid="input-contact-address" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">სამუშაო საათები</label>
          <Input value={workHours} onChange={(e) => setWorkHours(e.target.value)} className="min-h-[44px]" data-testid="input-contact-workhours" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">დასვენების დღე</label>
          <Input value={dayOff} onChange={(e) => setDayOff(e.target.value)} className="min-h-[44px]" data-testid="input-contact-dayoff" />
        </div>
      </div>
      <Button onClick={saveContact} disabled={saving} className="w-full min-h-[44px]" data-testid="button-save-contact">
        {saving ? "ინახება..." : "შენახვა"}
      </Button>
    </div>
  );
}

function StatusesSection() {
  const { toast } = useToast();
  const { data: allUsers, isLoading } = useAdminUsers();
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = search.trim().length > 0
    ? (allUsers || []).filter(u => {
        const q = search.toLowerCase();
        const fullName = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
        return (u.email && u.email.toLowerCase().includes(q)) || fullName.includes(q);
      })
    : [];

  const getRoleLabel = (role: string | null) => {
    if (role === "admin") return "ადმინი";
    if (role === "moderator") return "მოდერატორი";
    if (role === "sales_admin") return "გაყიდვების ადმინი";
    return "მომხმარებელი";
  };

  const getRoleBadgeClass = (role: string | null) => {
    if (role === "admin") return "bg-red-100 text-red-700 border-red-200";
    if (role === "moderator") return "bg-blue-100 text-blue-700 border-blue-200";
    if (role === "sales_admin") return "bg-green-100 text-green-700 border-green-200";
    return "bg-gray-100 text-gray-600 border-gray-200";
  };

  async function handleRoleChange(userId: string, newRole: string) {
    setUpdatingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
        toast({ title: "წარმატება", description: `როლი შეიცვალა: ${getRoleLabel(newRole)}` });
      } else {
        const data = await res.json();
        toast({ variant: "destructive", title: "შეცდომა", description: data.message || "შეცვლა ვერ მოხერხდა" });
      }
    } catch {
      toast({ variant: "destructive", title: "შეცდომა", description: "კავშირის შეცდომა" });
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <GlassPanel className="p-5 sm:p-7">
      <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        სტატუსების მართვა
      </h2>

      <div className="mb-4">
        <Input
          placeholder="მოძებნეთ ემაილით ან სახელით..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="min-h-[44px]"
          data-testid="input-status-search"
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : search.trim().length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">ჩაწერეთ ემაილი ან სახელი მოსაძებნად</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">მომხმარებელი ვერ მოიძებნა</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(user => (
            <div
              key={user.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-muted bg-muted/20 p-3"
              data-testid={`status-user-${user.id}`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate" data-testid={`text-status-name-${user.id}`}>
                  {user.firstName || ""} {user.lastName || ""}
                </p>
                <p className="text-xs text-muted-foreground truncate" data-testid={`text-status-email-${user.id}`}>
                  {user.email || "ემაილი არ არის"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${getRoleBadgeClass(user.role)}`} data-testid={`badge-role-${user.id}`}>
                  {getRoleLabel(user.role)}
                </span>

                <select
                  value={user.role || "user"}
                  onChange={e => handleRoleChange(user.id, e.target.value)}
                  disabled={updatingId === user.id}
                  className="rounded border border-muted bg-background px-2 py-1 text-xs min-h-[32px]"
                  data-testid={`select-role-${user.id}`}
                >
                  <option value="user">მომხმარებელი</option>
                  <option value="moderator">მოდერატორი</option>
                  <option value="sales_admin">გაყიდვების ადმინი</option>
                  <option value="admin">ადმინი</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
        <p className="text-xs text-blue-800 font-medium mb-1">როლების აღწერა:</p>
        <ul className="text-[10px] text-blue-700 space-y-0.5">
          <li><span className="font-semibold">ადმინი</span> — სრული წვდომა ყველა სექციაზე</li>
          <li><span className="font-semibold">მოდერატორი</span> — წვდომა: პროდუქტები, მომხმარებლები, შეკვეთები</li>
          <li><span className="font-semibold">გაყიდვების ადმინი</span> — წვდომა: შეკვეთების ნახვა და მართვა</li>
          <li><span className="font-semibold">მომხმარებელი</span> — ჩვეულებრივი მომხმარებელი, ადმინ პანელზე წვდომა არ აქვს</li>
        </ul>
      </div>
    </GlassPanel>
  );
}

type AdminSection = null | "products" | "site" | "users" | "orders" | "autodrava" | "statuses" | "visual";

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<AdminSection>(null);
  const logout = useAdminLogout();
  const [, setLocation] = useLocation();
  const { data: adminStatus } = useAdminStatus();
  const currentRole = adminStatus?.role || null;
  const isFullAdmin = currentRole === "admin";
  const isSalesAdmin = currentRole === "sales_admin";
  const isModerator = currentRole === "moderator";

  async function handleLogout() {
    await logout();
    setLocation("/");
  }

  if (activeSection === "products") {
    return (
      <div className="min-h-screen bg-mesh">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <AnimatedShell className="space-y-6">
            <div className="flex items-center justify-between">
              <TopBar title="ადმინ პანელი" subtitle="პროდუქტების მართვა" />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setActiveSection(null)} data-testid="button-back">
                  უკან
                </Button>
                <Link href="/">
                  <Button variant="ghost" size="sm" data-testid="link-homepage">მთავარი</Button>
                </Link>
              </div>
            </div>
            <ProductsSection />
          </AnimatedShell>
        </div>
      </div>
    );
  }

  if (activeSection === "users") {
    return (
      <div className="min-h-screen bg-mesh">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <AnimatedShell className="space-y-6">
            <div className="flex items-center justify-between">
              <TopBar title="ადმინ პანელი" subtitle="მომხმარებლები" />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setActiveSection(null)} data-testid="button-back">
                  უკან
                </Button>
                <Link href="/">
                  <Button variant="ghost" size="sm" data-testid="link-homepage">მთავარი</Button>
                </Link>
              </div>
            </div>
            <UsersSection />
          </AnimatedShell>
        </div>
      </div>
    );
  }

  if (activeSection === "orders") {
    return (
      <div className="min-h-screen bg-mesh">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <AnimatedShell className="space-y-6">
            <div className="flex items-center justify-between">
              <TopBar title="ადმინ პანელი" subtitle="შეკვეთები" />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setActiveSection(null)} data-testid="button-back">
                  უკან
                </Button>
                <Link href="/">
                  <Button variant="ghost" size="sm" data-testid="link-homepage">მთავარი</Button>
                </Link>
              </div>
            </div>
            <OrdersSection />
          </AnimatedShell>
        </div>
      </div>
    );
  }

  if (activeSection === "visual") {
    return (
      <div className="min-h-screen bg-mesh">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <AnimatedShell className="space-y-6">
            <div className="flex items-center justify-between">
              <TopBar title="ადმინ პანელი" subtitle="ვიზუალი" />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setActiveSection(null)} data-testid="button-back">
                  უკან
                </Button>
                <Link href="/">
                  <Button variant="ghost" size="sm" data-testid="link-homepage">მთავარი</Button>
                </Link>
              </div>
            </div>
            <VisualSection />
          </AnimatedShell>
        </div>
      </div>
    );
  }

  if (activeSection === "analytics") {
    return (
      <div className="min-h-screen bg-mesh">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <AnimatedShell className="space-y-6">
            <div className="flex items-center justify-between">
              <TopBar title="ადმინ პანელი" subtitle="ანალიტიკა" />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setActiveSection(null)} data-testid="button-back">
                  უკან
                </Button>
                <Link href="/">
                  <Button variant="ghost" size="sm" data-testid="link-homepage">მთავარი</Button>
                </Link>
              </div>
            </div>
            <AnalyticsSection />
          </AnimatedShell>
        </div>
      </div>
    );
  }

  if (activeSection === "autodrava") {
    return (
      <div className="min-h-screen bg-mesh">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <AnimatedShell className="space-y-6">
            <div className="flex items-center justify-between">
              <TopBar title="ადმინ პანელი" subtitle="ავტო-ძრავა" />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setActiveSection(null)} data-testid="button-back">
                  უკან
                </Button>
                <Link href="/">
                  <Button variant="ghost" size="sm" data-testid="link-homepage">მთავარი</Button>
                </Link>
              </div>
            </div>
            <AutoDravaSection />
          </AnimatedShell>
        </div>
      </div>
    );
  }

  if (activeSection === "statuses" && isFullAdmin) {
    return (
      <div className="min-h-screen bg-mesh">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <AnimatedShell className="space-y-6">
            <div className="flex items-center justify-between">
              <TopBar title="ადმინ პანელი" subtitle="სტატუსების მართვა" />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setActiveSection(null)} data-testid="button-back">
                  უკან
                </Button>
                <Link href="/">
                  <Button variant="ghost" size="sm" data-testid="link-homepage">მთავარი</Button>
                </Link>
              </div>
            </div>
            <StatusesSection />
          </AnimatedShell>
        </div>
      </div>
    );
  }

  if (activeSection === "site") {
    return (
      <div className="min-h-screen bg-mesh">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <AnimatedShell className="space-y-6">
            <div className="flex items-center justify-between">
              <TopBar title="ადმინ პანელი" subtitle="საიტის მართვა" />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setActiveSection(null)} data-testid="button-back">
                  უკან
                </Button>
                <Link href="/">
                  <Button variant="ghost" size="sm" data-testid="link-homepage">მთავარი</Button>
                </Link>
              </div>
            </div>
            <SiteManagement />
          </AnimatedShell>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <AnimatedShell className="space-y-8">
          <div className="flex items-center justify-between">
            <TopBar title={isSalesAdmin ? "გაყიდვების პანელი" : "ადმინ პანელი"} subtitle="აირჩიეთ სასურველი სექცია" />
            <div className="flex gap-2">
              <Link href="/">
                <Button variant="ghost" size="sm" data-testid="link-homepage">მთავარი</Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-logout">
                <LogOut className="mr-1 h-3.5 w-3.5" /> გასვლა
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {!isSalesAdmin && (
              <Card
                className="cursor-pointer border-card-border bg-card transition-all hover:shadow-lg hover:border-primary/40"
                onClick={() => setActiveSection("products")}
                data-testid="card-section-products"
              >
                <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Plus className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">დამატება</h3>
                  <p className="text-sm text-muted-foreground">პროდუქტების დამატება, რედაქტირება და წაშლა</p>
                </CardContent>
              </Card>
            )}

            <Card
              className="cursor-pointer border-card-border bg-card transition-all hover:shadow-lg hover:border-primary/40"
              onClick={() => setActiveSection("orders")}
              data-testid="card-section-orders"
            >
              <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <ShoppingBag className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">შეკვეთები</h3>
                <p className="text-sm text-muted-foreground">მომხმარებლების შეკვეთების ნახვა და მართვა</p>
              </CardContent>
            </Card>

            {isFullAdmin && (
              <Card
                className="cursor-pointer border-card-border bg-card transition-all hover:shadow-lg hover:border-primary/40"
                onClick={() => setActiveSection("site")}
                data-testid="card-section-site"
              >
                <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Settings className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">საიტის მართვა</h3>
                  <p className="text-sm text-muted-foreground">კატეგორიების და საიტის პარამეტრების მართვა</p>
                </CardContent>
              </Card>
            )}

            {!isSalesAdmin && (
              <Card
                className="cursor-pointer border-card-border bg-card transition-all hover:shadow-lg hover:border-primary/40"
                onClick={() => setActiveSection("users")}
                data-testid="card-section-users"
              >
                <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Users className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">მომხმარებლები</h3>
                  <p className="text-sm text-muted-foreground">რეგისტრირებული მომხმარებლების ნახვა</p>
                </CardContent>
              </Card>
            )}

            {isFullAdmin && (
              <Card
                className="cursor-pointer border-card-border bg-card transition-all hover:shadow-lg hover:border-primary/40"
                onClick={() => setActiveSection("statuses")}
                data-testid="card-section-statuses"
              >
                <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Shield className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">სტატუსები</h3>
                  <p className="text-sm text-muted-foreground">მომხმარებლების როლების მართვა</p>
                </CardContent>
              </Card>
            )}

            {isFullAdmin && (
              <Card
                className="cursor-pointer border-card-border bg-card transition-all hover:shadow-lg hover:border-primary/40"
                onClick={() => setActiveSection("autodrava")}
                data-testid="card-section-autodrava"
              >
                <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Gauge className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">ავტო-ძრავა</h3>
                  <p className="text-sm text-muted-foreground">გაყიდული ნივთების ავტომატური აღრიცხვა და რედაქტირება</p>
                </CardContent>
              </Card>
            )}

            {isFullAdmin && (
              <Card
                className="cursor-pointer border-card-border bg-card transition-all hover:shadow-lg hover:border-primary/40"
                onClick={() => setActiveSection("visual")}
                data-testid="card-section-visual"
              >
                <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Paintbrush className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">ვიზუალი</h3>
                  <p className="text-sm text-muted-foreground">ლოგოები და ტექსტის სტილის რედაქტორი</p>
                </CardContent>
              </Card>
            )}

            {isFullAdmin && (
              <Card
                className="cursor-pointer border-card-border bg-card transition-all hover:shadow-lg hover:border-primary/40"
                onClick={() => setActiveSection("analytics")}
                data-testid="card-section-analytics"
              >
                <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <BarChart3 className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">ანალიტიკა</h3>
                  <p className="text-sm text-muted-foreground">ტრაფიკის წყაროები — რომელი საიტებიდან მოდიან ვიზიტორები</p>
                </CardContent>
              </Card>
            )}

          </div>
        </AnimatedShell>
      </div>
    </div>
  );
}
