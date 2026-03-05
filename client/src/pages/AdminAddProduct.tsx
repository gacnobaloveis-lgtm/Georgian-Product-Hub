import { useState, useRef, useCallback } from "react";
import { useCreateProduct } from "@/hooks/use-products";
import { useUploadMedia } from "@/hooks/use-media";
import { useCategories } from "@/hooks/use-categories";
import { AnimatedShell } from "@/components/AnimatedShell";
import { GlassPanel } from "@/components/GlassPanel";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X, Star, Plus, Trash2 } from "lucide-react";
import { Link } from "wouter";

const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%23e2e8f0'%3E%3Crect width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%2394a3b8'%3E%E1%83%90%E1%83%A0%E1%83%90%3C/text%3E%3C/svg%3E";

interface ColorEntry {
  color: string;
  stock: string;
}

interface FormState {
  name: string;
  description: string;
  originalPrice: string;
  discountPrice: string;
  stock: string;
  youtubeUrl: string;
  colors: ColorEntry[];
}

const emptyForm: FormState = {
  name: "",
  description: "",
  originalPrice: "",
  discountPrice: "",
  stock: "",
  youtubeUrl: "",
  colors: [],
};

export default function AdminAddProduct() {
  const { toast } = useToast();
  const createMutation = useCreateProduct();
  const uploadMutation = useUploadMedia();
  const { data: categories } = useCategories();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedAlbum, setSelectedAlbum] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const albumInputRef = useRef<HTMLInputElement>(null);

  const setField = <K extends keyof FormState>(key: K, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  const handleAlbumUpload = useCallback(
    async (files: FileList | File[]) => {
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (imageFiles.length === 0) return;
      try {
        const uploaded = await uploadMutation.mutateAsync(imageFiles);
        const newPaths = uploaded.map((m) => m.path);
        setSelectedAlbum((prev) => [...prev, ...newPaths]);
        toast({ title: "ატვირთულია", description: `${imageFiles.length} სურათი აიტვირთა.` });
      } catch (err) {
        toast({ variant: "destructive", title: "შეცდომა", description: err instanceof Error ? err.message : "ატვირთვის შეცდომა" });
      }
    },
    [uploadMutation, toast]
  );

  const removeFromAlbum = (path: string) => {
    setSelectedAlbum((prev) => prev.filter((p) => p !== path));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim() || !form.description.trim() || !form.originalPrice.trim()) {
      toast({ variant: "destructive", title: "შეცდომა", description: "სახელი, აღწერა და საწყისი ფასი აუცილებელია." });
      return;
    }

    if (selectedAlbum.length === 0) {
      toast({ variant: "destructive", title: "შეცდომა", description: "მინიმუმ ერთი სურათი აუცილებელია." });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("description", form.description.trim());
      formData.append("originalPrice", form.originalPrice.trim().replace(",", "."));
      if (form.discountPrice.trim()) {
        formData.append("discountPrice", form.discountPrice.trim().replace(",", "."));
      }
      formData.append("stock", String(parseInt(form.stock) || 0));
      if (form.colors.length > 0) {
        const colorObj: Record<string, number> = {};
        form.colors.forEach(c => {
          if (c.color.trim()) colorObj[c.color.trim()] = Number(c.stock) || 0;
        });
        formData.append("colorStock", JSON.stringify(colorObj));
      }
      formData.append("albumImages", JSON.stringify(selectedAlbum));
      if (form.youtubeUrl.trim()) {
        formData.append("youtubeUrl", form.youtubeUrl.trim());
      }
      if (selectedCategoryId) {
        formData.append("categoryId", selectedCategoryId);
      }

      const created = await createMutation.mutateAsync(formData);
      toast({ title: "წარმატება", description: `პროდუქტი "${created.name}" დაემატა.` });
      setForm(emptyForm);
      setSelectedCategoryId("");
      setSelectedAlbum([]);
    } catch (err) {
      toast({ variant: "destructive", title: "შეცდომა", description: err instanceof Error ? err.message : "უცნობი შეცდომა" });
    }
  }

  const mainImage = selectedAlbum.length > 0 ? selectedAlbum[0] : null;
  const restImages = selectedAlbum.slice(1);

  return (
    <div className="min-h-screen bg-mesh">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <AnimatedShell className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <TopBar
              title="პროდუქტის დამატება"
              subtitle="შეავსეთ ველები და დაამატეთ ახალი პროდუქტი."
            />
            <div className="flex gap-2">
              <Link href="/admin-dashboard">
                <Button variant="outline" size="sm" data-testid="link-admin-dashboard">პანელი</Button>
              </Link>
              <Link href="/">
                <Button variant="secondary" size="sm" data-testid="link-home">მთავარი</Button>
              </Link>
            </div>
          </div>

          <GlassPanel className="p-5 sm:p-7">
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">სახელი</label>
                <Input id="name" value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="პროდუქტის სახელი" data-testid="input-name" />
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">აღწერა</label>
                <Textarea id="description" value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="პროდუქტის აღწერა" className="min-h-[100px] resize-y" data-testid="input-description" />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label htmlFor="originalPrice" className="text-sm font-medium">საწყისი ფასი (₾)</label>
                  <Input id="originalPrice" value={form.originalPrice} onChange={(e) => setField("originalPrice", e.target.value)} placeholder="99.99" data-testid="input-original-price" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="discountPrice" className="text-sm font-medium">ფასდაკლება (₾) <span className="text-muted-foreground text-xs">(არჩევითი)</span></label>
                  <Input id="discountPrice" value={form.discountPrice} onChange={(e) => setField("discountPrice", e.target.value)} placeholder="79.99" data-testid="input-discount-price" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="stock" className="text-sm font-medium">რაოდენობა</label>
                  <Input id="stock" type="number" value={form.stock} onChange={(e) => setField("stock", e.target.value)} placeholder="0" data-testid="input-stock" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">ფერები და მარაგი <span className="text-muted-foreground text-xs">(არჩევითი)</span></label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setForm(p => ({ ...p, colors: [...p.colors, { color: "", stock: "" }] }))}
                    data-testid="button-add-color"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> ფერის დამატება
                  </Button>
                </div>
                {form.colors.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={entry.color}
                      onChange={e => {
                        const updated = [...form.colors];
                        updated[idx] = { ...updated[idx], color: e.target.value };
                        setForm(p => ({ ...p, colors: updated }));
                      }}
                      placeholder="ფერი (მაგ: ოქროსფერი)"
                      className="flex-1"
                      data-testid={`input-color-name-${idx}`}
                    />
                    <Input
                      value={entry.stock}
                      onChange={e => {
                        const updated = [...form.colors];
                        updated[idx] = { ...updated[idx], stock: e.target.value };
                        setForm(p => ({ ...p, colors: updated }));
                      }}
                      placeholder="რაოდ."
                      className="w-24"
                      type="number"
                      min="0"
                      data-testid={`input-color-stock-${idx}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setForm(p => ({ ...p, colors: p.colors.filter((_, i) => i !== idx) }))}
                      data-testid={`button-remove-color-${idx}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label htmlFor="youtubeUrl" className="text-sm font-medium">YouTube ვიდეო <span className="text-muted-foreground text-xs">(არჩევითი)</span></label>
                <Input id="youtubeUrl" value={form.youtubeUrl} onChange={(e) => setField("youtubeUrl", e.target.value)} placeholder="https://www.youtube.com/watch?v=..." data-testid="input-youtube-url" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">კატეგორია <span className="text-muted-foreground text-xs">(არჩევითი)</span></label>
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="აირჩიეთ კატეგორია" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)} data-testid={`select-category-${cat.id}`}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">სურათები</label>

                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length > 0) handleAlbumUpload(e.dataTransfer.files); }}
                  onClick={() => albumInputRef.current?.click()}
                  className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}`}
                  data-testid="dropzone-album"
                >
                  {uploadMutation.isPending ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">იტვირთება...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">ჩააგდეთ ან დააწკაპუნეთ სურათების ასატვირთად</span>
                      <span className="text-xs text-muted-foreground/60">პირველი სურათი იქნება მთავარი</span>
                    </div>
                  )}
                  <input ref={albumInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files && e.target.files.length > 0) { handleAlbumUpload(e.target.files); e.target.value = ""; } }} data-testid="input-album-upload" />
                </div>

                {selectedAlbum.length > 0 && (
                  <div className="space-y-3">
                    {mainImage && (
                      <div className="relative overflow-hidden rounded-lg border-2 border-primary">
                        <img src={mainImage} alt="მთავარი" className="w-full max-h-80 object-cover" onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }} data-testid="img-main" />
                        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
                          <Star className="h-3 w-3" /> მთავარი
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromAlbum(mainImage)}
                          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                          data-testid="button-remove-main"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    {restImages.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {restImages.map((imgPath) => (
                          <div key={imgPath} className="group relative flex-shrink-0">
                            <div className="h-20 w-20 overflow-hidden rounded-lg border border-muted-foreground/20">
                              <img src={imgPath} alt="ალბომი" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }} />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFromAlbum(imgPath)}
                              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                              data-testid={`button-remove-album-${imgPath}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button type="submit" disabled={createMutation.isPending} className="w-full" data-testid="button-submit">
                {createMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> იტვირთება...</>
                ) : (
                  "დამატება"
                )}
              </Button>
            </form>
          </GlassPanel>
        </AnimatedShell>
      </div>
    </div>
  );
}
