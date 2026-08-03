import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Pencil, Trash2, Plus, ImagePlus, X } from "lucide-react";
import { useAdminStatus } from "@/hooks/use-admin";
import { useUploadMedia } from "@/hooks/use-media";
import { useToast } from "@/hooks/use-toast";
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
  createdAt: string;
}

const cardCls = "rounded-2xl border border-white/20 bg-white/25 p-5 shadow-xl backdrop-blur-md";
const inputCls =
  "w-full rounded-lg border border-white/30 bg-slate-900/70 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400 placeholder:text-white/40";
const shadowTxt = "[text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]";

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

function BlogEditor({
  initial,
  onClose,
}: {
  initial?: Blog;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.imageUrl ?? null);
  const upload = useUploadMedia();
  const qc = useQueryClient();
  const { toast } = useToast();

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(initial ? `/api/admin/blogs/${initial.id}` : "/api/admin/blogs", {
        method: initial ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, content, imageUrl }),
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
        data-testid="input-blog-title"
      />
      <textarea
        className={`${inputCls} min-h-[180px]`}
        placeholder="ტექსტი…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        data-testid="input-blog-content"
      />
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
            <BlogEditor initial={editing} onClose={() => setEditing(null)} />
          ) : (
            <article className={cardCls}>
              <h2 className={`text-xl font-bold text-white ${shadowTxt}`} data-testid="text-blog-title">
                {single.title}
              </h2>
              <p className="mt-1 text-xs text-emerald-100/70">{formatDate(single.createdAt)}</p>
              {single.imageUrl && (
                <img
                  src={single.imageUrl}
                  alt={single.title}
                  className="mt-4 w-full rounded-xl border border-white/20"
                />
              )}
              <div className="mt-4 space-y-3">
                {single.content.split(/\n+/).map((p, i) => (
                  <p key={i} className={`text-sm leading-relaxed text-white ${shadowTxt}`}>
                    {p}
                  </p>
                ))}
              </div>
              {isAdmin && (
                <div className="mt-5 flex gap-2 border-t border-white/10 pt-4">
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
            </article>
          )
        ) : (
          <>
            {/* სია */}
            {isAdmin &&
              (editing === "new" ? (
                <div className="mb-4">
                  <BlogEditor onClose={() => setEditing(null)} />
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
                        <p className="mt-0.5 text-xs text-emerald-100/70">{formatDate(b.createdAt)}</p>
                        <p className={`mt-1 line-clamp-2 text-sm text-white/80 ${shadowTxt}`}>{b.content}</p>
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
