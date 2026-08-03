import { useMemo, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, BookOpen, Pencil, Trash2, Plus, ImagePlus, X, Share2,
  ShoppingBag, MessageCircle, Reply, Send,
} from "lucide-react";
import { useAdminStatus } from "@/hooks/use-admin";
import { useUploadMedia } from "@/hooks/use-media";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AuthLoginDialog } from "@/components/AuthLoginDialog";
import mountainSceneBg from "@assets/mountain-scene-bg.webp";

const PAGE_BG_STYLE: React.CSSProperties = {
  backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.55), rgba(2, 6, 23, 0.65)), url(${mountainSceneBg})`,
  backgroundSize: "cover",
  backgroundPosition: "right center",
  backgroundAttachment: typeof window !== "undefined" && window.innerWidth >= 768 ? "fixed" : "scroll",
};

interface Blog {
  id: number;
  title: string;
  content: string;
  imageUrl: string | null;
  authorName: string | null;
  titleColor: string | null;
  textColor: string | null;
  fontSize: number | null;
  createdAt: string;
}

interface BlogComment {
  id: number;
  blogId: number;
  parentId: number | null;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

interface ProductLite {
  id: number;
  name: string;
  imageUrl: string | null;
  originalPrice: string;
  discountPrice: string | null;
}

const cardCls = "rounded-2xl border border-white/20 bg-white/25 p-5 shadow-xl backdrop-blur-md";
const inputCls =
  "w-full rounded-lg border border-white/30 bg-slate-900/70 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400 placeholder:text-white/40";
const shadowTxt = "[text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]";
const PRODUCT_TOKEN = /\[(?:product|პროდუქტი):(\d+)\]/g;

const KA_MONTHS = [
  "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
  "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი",
];

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return `${d.getDate()} ${KA_MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
  } catch {
    return "";
  }
}

// ── ჩაშენებული პროდუქტის ბარათი ─────────────────────────────
function InlineProductCard({ product, side }: { product: ProductLite; side: "left" | "right" }) {
  const [, setLocation] = useLocation();
  const price = Number(product.discountPrice ?? product.originalPrice);
  return (
    <button
      type="button"
      onClick={() => setLocation(`/products/${product.id}`)}
      className={`${side === "right" ? "float-right ml-4" : "float-left mr-4"} mb-2 block w-36 overflow-hidden rounded-xl border border-emerald-400/40 bg-slate-900/70 text-left shadow-lg backdrop-blur-md transition hover:border-emerald-300 sm:w-44`}
      data-testid={`card-blog-product-${product.id}`}
    >
      {product.imageUrl && (
        <img src={product.imageUrl} alt={product.name} className="h-28 w-full object-cover sm:h-32" />
      )}
      <div className="p-2">
        <p className="line-clamp-2 text-xs font-semibold text-white">{product.name}</p>
        <p className="mt-1 text-sm font-bold text-emerald-300">₾{price.toFixed(2)}</p>
        <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-emerald-100/80">
          <ShoppingBag className="h-3 w-3" /> ნახვა →
        </p>
      </div>
    </button>
  );
}

// კონტენტის დარენდერება: ტექსტი + [პროდუქტი:ID] ბარათები მონაცვლეობით მარჯვნივ/მარცხნივ
function BlogContent({
  content,
  products,
  textColor,
  fontSize,
}: {
  content: string;
  products: ProductLite[];
  textColor?: string | null;
  fontSize?: number | null;
}) {
  const parts = useMemo(() => {
    const out: Array<{ type: "text"; text: string } | { type: "product"; id: number }> = [];
    let last = 0;
    for (const m of content.matchAll(PRODUCT_TOKEN)) {
      const idx = m.index ?? 0;
      if (idx > last) out.push({ type: "text", text: content.slice(last, idx) });
      out.push({ type: "product", id: parseInt(m[1], 10) });
      last = idx + m[0].length;
    }
    if (last < content.length) out.push({ type: "text", text: content.slice(last) });
    return out;
  }, [content]);

  let cardIndex = 0;
  return (
    <div className="mt-4">
      {parts.map((part, i) => {
        if (part.type === "product") {
          const p = products.find((x) => x.id === part.id);
          if (!p) return null;
          const side = cardIndex % 2 === 0 ? "right" : "left";
          cardIndex++;
          return <InlineProductCard key={i} product={p} side={side} />;
        }
        return part.text
          .split(/\n+/)
          .filter((t) => t.trim())
          .map((t, j) => (
            <p
              key={`${i}-${j}`}
              className={`mb-3 leading-relaxed ${shadowTxt}`}
              style={{ color: textColor || "#ffffff", fontSize: `${fontSize || 14}px` }}
            >
              {t}
            </p>
          ));
      })}
      <div className="clear-both" />
    </div>
  );
}

// ── რედაქტორი ────────────────────────────────────────────────
function BlogEditor({
  initial,
  products,
  onClose,
}: {
  initial?: Blog;
  products: ProductLite[];
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.imageUrl ?? null);
  const [authorName, setAuthorName] = useState(initial?.authorName ?? "");
  const [titleColor, setTitleColor] = useState(initial?.titleColor ?? "#ffffff");
  const [textColor, setTextColor] = useState(initial?.textColor ?? "#ffffff");
  const [fontSize, setFontSize] = useState(initial?.fontSize ?? 14);
  const [pickProduct, setPickProduct] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const upload = useUploadMedia();
  const qc = useQueryClient();
  const { toast } = useToast();

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(initial ? `/api/admin/blogs/${initial.id}` : "/api/admin/blogs", {
        method: initial ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, content, imageUrl, titleColor, textColor, fontSize, authorName }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "შენახვა ვერ მოხერხდა");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/blogs"] });
      toast({ title: initial ? "ბლოგი განახლდა ✓" : "ბლოგი დაემატა ✓" });
      onClose();
    },
    onError: (e: Error) => toast({ title: "შეცდომა", description: e.message, variant: "destructive" }),
  });

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const media = await upload.mutateAsync([file]);
      if (media[0]?.path) setImageUrl(media[0].path);
    } catch (err: any) {
      toast({ title: "ფოტოს ატვირთვა ვერ მოხერხდა", description: err?.message, variant: "destructive" });
    }
    e.target.value = "";
  }

  function insertProductToken() {
    const id = parseInt(pickProduct, 10);
    if (!id) return;
    const token = `\n[პროდუქტი:${id}]\n`;
    const ta = textareaRef.current;
    if (ta) {
      const pos = ta.selectionStart ?? content.length;
      setContent(content.slice(0, pos) + token + content.slice(pos));
    } else {
      setContent(content + token);
    }
    setPickProduct("");
  }

  return (
    <div className={`${cardCls} space-y-3`}>
      <p className={`text-sm font-bold text-white ${shadowTxt}`}>
        {initial ? "ბლოგის რედაქტირება" : "ახალი ბლოგი"}
      </p>
      <input
        className={inputCls}
        placeholder="სათაური"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ color: titleColor }}
        data-testid="input-blog-title"
      />
      <textarea
        ref={textareaRef}
        className={`${inputCls} min-h-[180px]`}
        placeholder="ტექსტი…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        style={{ color: textColor, fontSize: `${fontSize}px` }}
        data-testid="input-blog-content"
      />
      {/* ფერები და შრიფტის ზომა */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-white/15 bg-slate-900/40 p-3">
        <label className="flex items-center gap-2 text-xs text-white/80">
          სათაურის ფერი
          <input
            type="color"
            value={titleColor}
            onChange={(e) => setTitleColor(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border border-white/30 bg-transparent"
            data-testid="input-title-color"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-white/80">
          ტექსტის ფერი
          <input
            type="color"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border border-white/30 bg-transparent"
            data-testid="input-text-color"
          />
        </label>
        <div className="flex items-center gap-2 text-xs text-white/80">
          შრიფტი
          <button
            type="button"
            onClick={() => setFontSize((s) => Math.max(12, s - 1))}
            className="h-8 w-8 rounded-lg bg-white/10 text-base font-bold text-white hover:bg-white/20"
            data-testid="button-font-smaller"
          >
            −
          </button>
          <span className="w-10 text-center font-bold text-white">{fontSize}px</span>
          <button
            type="button"
            onClick={() => setFontSize((s) => Math.min(24, s + 1))}
            className="h-8 w-8 rounded-lg bg-white/10 text-base font-bold text-white hover:bg-white/20"
            data-testid="button-font-bigger"
          >
            +
          </button>
        </div>
      </div>
      {/* პროდუქტის ბარათის ჩასმა ტექსტში */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/15 bg-slate-900/40 p-2">
        <ShoppingBag className="h-4 w-4 shrink-0 text-emerald-300" />
        <select
          value={pickProduct}
          onChange={(e) => setPickProduct(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-white/30 bg-slate-900/70 px-2 py-2 text-xs text-white outline-none focus:border-emerald-400"
          data-testid="select-blog-product"
        >
          <option value="">— აირჩიე პროდუქტი ტექსტში ჩასასმელად —</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (₾{Number(p.discountPrice ?? p.originalPrice).toFixed(2)})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={insertProductToken}
          disabled={!pickProduct}
          className="rounded-lg bg-emerald-500/80 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-40"
          data-testid="button-blog-insert-product"
        >
          ჩასმა
        </button>
        <p className="w-full text-[10px] text-white/50">ბარათი ჩაჯდება იქ, სადაც კურსორია — ტექსტი გარს შემოუვლის</p>
      </div>
      {imageUrl ? (
        <div className="relative inline-block">
          <img src={imageUrl} alt="" className="max-h-48 rounded-lg border border-white/20" />
          <button
            type="button"
            onClick={() => setImageUrl(null)}
            className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white"
            data-testid="button-blog-remove-image"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-white/30 bg-slate-900/50 px-3 py-2 text-sm text-white transition hover:bg-slate-900/70">
          <ImagePlus className="h-4 w-4 text-emerald-300" />
          {upload.isPending ? "იტვირთება…" : "ფოტოს დამატება"}
          <input type="file" accept="image/*" className="hidden" onChange={handleImage} disabled={upload.isPending} />
        </label>
      )}
      <input
        className={`${inputCls} max-w-xs`}
        placeholder="ავტორის სახელი / ნიკნეიმი"
        value={authorName}
        onChange={(e) => setAuthorName(e.target.value)}
        maxLength={60}
        data-testid="input-blog-author"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={save.isPending || !title.trim() || !content.trim()}
          onClick={() => save.mutate()}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
          data-testid="button-blog-save"
        >
          {save.isPending ? "ინახება…" : "შენახვა"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
        >
          გაუქმება
        </button>
      </div>
    </div>
  );
}

// ── კომენტარები ──────────────────────────────────────────────
function CommentForm({
  blogId,
  parentId,
  onDone,
  autoFocus,
}: {
  blogId: number;
  parentId?: number;
  onDone?: () => void;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();

  const post = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/blogs/${blogId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: text, parentId: parentId ?? null }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "ვერ გაიგზავნა");
      return res.json();
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: [`/api/blogs/${blogId}/comments`] });
      onDone?.();
    },
    onError: (e: Error) => toast({ title: "შეცდომა", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="flex items-end gap-2">
      <textarea
        className={`${inputCls} min-h-[44px] flex-1`}
        placeholder={parentId ? "პასუხი…" : "დაწერე კომენტარი…"}
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus={autoFocus}
        data-testid={parentId ? `input-reply-${parentId}` : "input-comment"}
      />
      <button
        type="button"
        disabled={!text.trim() || post.isPending}
        onClick={() => post.mutate()}
        className="rounded-lg bg-emerald-500 p-2.5 text-white transition hover:bg-emerald-600 disabled:opacity-40"
        data-testid={parentId ? `button-reply-send-${parentId}` : "button-comment-send"}
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
}

function CommentsSection({ blogId }: { blogId: number }) {
  const { isRealUser } = useAuth();
  const { data: adminData } = useAdminStatus();
  const isAdmin = !!adminData?.isAdmin;
  const [loginOpen, setLoginOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: comments = [] } = useQuery<BlogComment[]>({
    queryKey: [`/api/blogs/${blogId}/comments`],
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/blog-comments/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("წაშლა ვერ მოხერხდა");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/blogs/${blogId}/comments`] }),
    onError: (e: Error) => toast({ title: "შეცდომა", description: e.message, variant: "destructive" }),
  });

  const roots = comments.filter((c) => !c.parentId);
  const replies = (id: number) => comments.filter((c) => c.parentId === id);

  function CommentItem({ c, isReply }: { c: BlogComment; isReply?: boolean }) {
    return (
      <div className={`${isReply ? "ml-8 border-l-2 border-emerald-400/30 pl-3" : ""}`}>
        <div className="rounded-xl bg-slate-900/50 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-emerald-300">{c.userName}</p>
            <p className="text-[10px] text-white/50">{formatDate(c.createdAt)}</p>
          </div>
          <p className={`mt-1 whitespace-pre-wrap text-sm text-white ${shadowTxt}`}>{c.content}</p>
          <div className="mt-1.5 flex items-center gap-3">
            {!isReply && (
              <button
                onClick={() => {
                  if (!isRealUser) return setLoginOpen(true);
                  setReplyTo(replyTo === c.id ? null : c.id);
                }}
                className="flex items-center gap-1 text-[11px] font-semibold text-emerald-200/80 hover:text-white"
                data-testid={`button-reply-${c.id}`}
              >
                <Reply className="h-3 w-3" /> პასუხი
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => del.mutate(c.id)}
                className="flex items-center gap-1 text-[11px] font-semibold text-red-300/80 hover:text-red-200"
                data-testid={`button-comment-delete-${c.id}`}
              >
                <Trash2 className="h-3 w-3" /> წაშლა
              </button>
            )}
          </div>
        </div>
        {!isReply && replyTo === c.id && (
          <div className="ml-8 mt-2">
            <CommentForm blogId={blogId} parentId={c.id} autoFocus onDone={() => setReplyTo(null)} />
          </div>
        )}
        {!isReply && (
          <div className="mt-2 space-y-2">
            {replies(c.id).map((r) => (
              <CommentItem key={r.id} c={r} isReply />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-5 border-t border-white/10 pt-4">
      <p className={`mb-3 flex items-center gap-2 text-sm font-bold text-white ${shadowTxt}`}>
        <MessageCircle className="h-4 w-4 text-emerald-300" />
        კომენტარები ({comments.length})
      </p>
      <div className="space-y-3">
        {roots.map((c) => (
          <CommentItem key={c.id} c={c} />
        ))}
      </div>
      <div className="mt-4">
        {isRealUser ? (
          <CommentForm blogId={blogId} />
        ) : (
          <button
            onClick={() => setLoginOpen(true)}
            className="w-full rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/25"
            data-testid="button-comment-login"
          >
            კომენტარის დასაწერად გაიარე ავტორიზაცია
          </button>
        )}
      </div>
      <AuthLoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
}

// ── მთავარი გვერდი ───────────────────────────────────────────
export default function BlogPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/guide/blog/:id");
  const blogId = params?.id ? parseInt(params.id, 10) : null;
  const { data: adminData } = useAdminStatus();
  const isAdmin = !!adminData?.isAdmin;
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Blog | "new" | null>(null);

  const { data: blogs = [], isLoading } = useQuery<Blog[]>({
    queryKey: ["/api/blogs"],
  });
  const { data: products = [] } = useQuery<ProductLite[]>({
    queryKey: ["/api/products"],
  });
  const { data: fbConfig } = useQuery<{ appId: string | null }>({
    queryKey: ["/api/facebook/app-id"],
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/blogs/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("წაშლა ვერ მოხერხდა");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/blogs"] });
      toast({ title: "ბლოგი წაიშალა" });
      if (blogId) setLocation("/guide/blog");
    },
    onError: (e: Error) => toast({ title: "შეცდომა", description: e.message, variant: "destructive" }),
  });

  async function shareOnFacebook(title: string) {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${title} | spiningebi.ge`, url });
      } catch {}
      return;
    }
    const appId = fbConfig?.appId;
    const fbUrl = appId
      ? `https://www.facebook.com/dialog/share?app_id=${appId}&display=popup&href=${encodeURIComponent(url)}&redirect_uri=${encodeURIComponent(url)}`
      : `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    const popup = window.open(fbUrl, "_blank", "width=626,height=600,noopener=no");
    if (!popup) window.location.href = fbUrl;
  }

  const single = blogId ? blogs.find((b) => b.id === blogId) : null;

  return (
    <div className="min-h-screen" style={PAGE_BG_STYLE}>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <button
          onClick={() => (blogId ? setLocation("/guide/blog") : setLocation("/guide"))}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-emerald-100/80 transition-colors hover:text-white"
          data-testid="button-blog-back"
        >
          <ArrowLeft className="h-4 w-4" />
          {blogId ? "ბლოგები" : "გზამკვლევი"}
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-full bg-emerald-500/20 p-3 ring-1 ring-emerald-400/40 backdrop-blur-md">
            <BookOpen className="h-6 w-6 text-emerald-300" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold text-white ${shadowTxt}`}>ბლოგი</h1>
            <p className={`text-sm text-emerald-100/80 ${shadowTxt}`}>საინტერესო სტატიები თევზაობაზე</p>
          </div>
        </div>

        {/* ერთი სტატია */}
        {blogId ? (
          isLoading ? (
            <p className={`text-white ${shadowTxt}`}>იტვირთება…</p>
          ) : !single ? (
            <p className={`text-white ${shadowTxt}`}>სტატია ვერ მოიძებნა</p>
          ) : editing && editing !== "new" ? (
            <BlogEditor initial={editing} products={products} onClose={() => setEditing(null)} />
          ) : (
            <article className={cardCls}>
              <h2
                className={`text-xl font-bold ${shadowTxt}`}
                style={{ color: single.titleColor || "#ffffff" }}
                data-testid="text-blog-title"
              >
                {single.title}
              </h2>
              <p className="mt-1 text-xs text-emerald-100/70">
                {formatDate(single.createdAt)}
                {single.authorName && <span className="font-semibold"> · ✍️ {single.authorName}</span>}
              </p>
              {single.imageUrl && (
                <img
                  src={single.imageUrl}
                  alt={single.title}
                  className="mt-4 w-full rounded-xl border border-white/20"
                />
              )}
              <BlogContent
                content={single.content}
                products={products}
                textColor={single.textColor}
                fontSize={single.fontSize}
              />
              <button
                type="button"
                onClick={() => shareOnFacebook(single.title)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1877F2] px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#166FE5] active:scale-[0.98]"
                data-testid="button-blog-share-fb"
              >
                <Share2 className="h-4 w-4" />
                გააზიარე ფეისბუქზე
              </button>
              {isAdmin && (
                <div className="mt-4 flex gap-2 border-t border-white/10 pt-4">
                  <button
                    onClick={() => setEditing(single)}
                    className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20"
                    data-testid="button-blog-edit"
                  >
                    <Pencil className="h-3.5 w-3.5" /> რედაქტირება
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("წავშალო ეს ბლოგი?")) del.mutate(single.id);
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/30"
                    data-testid="button-blog-delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> წაშლა
                  </button>
                </div>
              )}
              <CommentsSection blogId={single.id} />
            </article>
          )
        ) : (
          <>
            {/* სია */}
            {isAdmin &&
              (editing === "new" ? (
                <div className="mb-4">
                  <BlogEditor products={products} onClose={() => setEditing(null)} />
                </div>
              ) : (
                <button
                  onClick={() => setEditing("new")}
                  className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-4 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-emerald-500/30"
                  data-testid="button-blog-add"
                >
                  <Plus className="h-4 w-4 text-emerald-300" /> ახალი ბლოგის დამატება
                </button>
              ))}

            {isLoading ? (
              <p className={`text-white ${shadowTxt}`}>იტვირთება…</p>
            ) : blogs.length === 0 ? (
              <div className={cardCls}>
                <p className={`text-sm text-white ${shadowTxt}`}>ბლოგები ჯერ არ არის დამატებული</p>
              </div>
            ) : (
              <div className="space-y-4">
                {blogs.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setLocation(`/guide/blog/${b.id}`)}
                    className={`${cardCls} block w-full text-left transition hover:bg-white/30`}
                    data-testid={`card-blog-${b.id}`}
                  >
                    <div className="flex gap-4">
                      {b.imageUrl && (
                        <img
                          src={b.imageUrl}
                          alt=""
                          className="h-20 w-20 shrink-0 rounded-lg border border-white/20 object-cover"
                        />
                      )}
                      <div className="min-w-0">
                        <p className={`font-bold text-white ${shadowTxt}`}>{b.title}</p>
                        <p className="mt-0.5 text-xs text-emerald-100/70">
                          {formatDate(b.createdAt)}
                          {b.authorName && <span className="font-semibold"> · ✍️ {b.authorName}</span>}
                        </p>
                        <p className={`mt-1 line-clamp-2 text-sm text-white/80 ${shadowTxt}`}>
                          {b.content.replace(PRODUCT_TOKEN, "")}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
