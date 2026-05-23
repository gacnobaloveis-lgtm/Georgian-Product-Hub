import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ThumbsUp, ThumbsDown, MessageCircle, X, Send, Loader2, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface ReactionData { likes: number; dislikes: number; mine: "like" | "dislike" | null; }
interface CommentRow { id: number; text: string; createdAt: string; userId: string; firstName: string | null; lastName: string | null; }

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ka-GE", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return ""; }
}

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1000;
    return (k >= 10 ? Math.floor(k) : Math.floor(k * 10) / 10) + "k";
  }
  const m = n / 1_000_000;
  return (m >= 10 ? Math.floor(m) : Math.floor(m * 10) / 10) + "M";
}

function displayName(c: { firstName: string | null; lastName: string | null }) {
  const n = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
  return n || "მომხმარებელი";
}

export function ProductReviews({ productId }: { productId: number }) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const reactionsKey = ["/api/products", productId, "reactions"] as const;
  const commentsKey = ["/api/products", productId, "comments"] as const;

  const reactions = useQuery<ReactionData>({
    queryKey: reactionsKey,
    queryFn: async () => {
      const r = await fetch(`/api/products/${productId}/reactions`, { credentials: "include" });
      if (!r.ok) throw new Error("err");
      return r.json();
    },
  });

  const comments = useQuery<CommentRow[]>({
    queryKey: commentsKey,
    queryFn: async () => {
      const r = await fetch(`/api/products/${productId}/comments`, { credentials: "include" });
      if (!r.ok) throw new Error("err");
      return r.json();
    },
    enabled: open,
  });

  const reactMutation = useMutation({
    mutationFn: async (newType: "like" | "dislike" | null) => {
      const r = await fetch(`/api/products/${productId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: newType }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.message || "შეცდომა");
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: reactionsKey }),
    onError: (e: any) => toast({ variant: "destructive", title: "შეცდომა", description: e.message }),
  });

  const commentMutation = useMutation({
    mutationFn: async (txt: string) => {
      const r = await fetch(`/api/products/${productId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: txt }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.message || "შეცდომა");
      }
      return r.json() as Promise<CommentRow>;
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: commentsKey });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "შეცდომა", description: e.message }),
  });

  const handleReact = (t: "like" | "dislike") => {
    if (!isAuthenticated) {
      toast({ variant: "destructive", title: "გთხოვთ გაიაროთ ავტორიზაცია" });
      return;
    }
    const next = reactions.data?.mine === t ? null : t;
    reactMutation.mutate(next);
  };

  const mine = reactions.data?.mine;
  const likes = reactions.data?.likes ?? 0;
  const dislikes = reactions.data?.dislikes ?? 0;
  const commentCount = comments.data?.length ?? 0;

  return (
    <>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3" data-testid="product-reviews-bar">
        <button
          type="button"
          onClick={() => handleReact("like")}
          disabled={reactMutation.isPending || !isAuthenticated}
          className={`flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs sm:text-sm font-semibold backdrop-blur-md shadow-sm transition-colors ${
            mine === "like"
              ? "border-emerald-500/80 bg-emerald-500/40 text-white"
              : "border-emerald-400/60 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20"
          } ${!isAuthenticated ? "opacity-60 cursor-not-allowed" : ""}`}
          data-testid="button-like"
          title={isAuthenticated ? "მომწონს" : "გაიარეთ ავტორიზაცია"}
        >
          <ThumbsUp className="h-4 w-4" />
          <span className="tabular-nums">{likes}</span>
        </button>
        <button
          type="button"
          onClick={() => handleReact("dislike")}
          disabled={reactMutation.isPending || !isAuthenticated}
          className={`flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs sm:text-sm font-semibold backdrop-blur-md shadow-sm transition-colors ${
            mine === "dislike"
              ? "border-red-500/80 bg-red-500/40 text-white"
              : "border-red-400/60 bg-red-500/10 text-red-700 hover:bg-red-500/20"
          } ${!isAuthenticated ? "opacity-60 cursor-not-allowed" : ""}`}
          data-testid="button-dislike"
          title={isAuthenticated ? "არ მომწონს" : "გაიარეთ ავტორიზაცია"}
        >
          <ThumbsDown className="h-4 w-4" />
          <span className="tabular-nums">{dislikes}</span>
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-white/60 bg-white/20 px-2.5 py-2 text-xs sm:text-sm font-semibold text-blue-700 backdrop-blur-md shadow-sm transition-colors hover:bg-white/30"
          data-testid="button-open-comments"
          title="კომენტარები"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="tabular-nums">კომ {formatCount(commentCount)}</span>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={() => setOpen(false)} data-testid="modal-reviews">
          <div className="w-full sm:max-w-lg max-h-[90vh] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-base font-semibold">შეფასებები და კომენტარები</h3>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-800" data-testid="button-close-reviews">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {comments.isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
              ) : (comments.data ?? []).length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-8">ჯერ კომენტარები არ არის. დაწერეთ პირველი!</p>
              ) : (
                comments.data!.map((c) => (
                  <div key={c.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3" data-testid={`comment-${c.id}`}>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <UserCircle2 className="h-4 w-4" />
                      <span className="font-semibold text-gray-800" data-testid={`comment-author-${c.id}`}>{displayName(c)}</span>
                      <span className="text-gray-400">•</span>
                      <span>{formatDate(c.createdAt)}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-gray-800 whitespace-pre-wrap break-words" data-testid={`comment-text-${c.id}`}>{c.text}</p>
                  </div>
                ))
              )}
            </div>

            <div className="border-t px-4 py-3 space-y-2">
              {isAuthenticated ? (
                <>
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="დაწერეთ თქვენი კომენტარი..."
                    rows={2}
                    maxLength={1000}
                    data-testid="input-comment"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => { if (text.trim()) commentMutation.mutate(text.trim()); }}
                      disabled={commentMutation.isPending || !text.trim()}
                      className="bg-blue-600 hover:bg-blue-700"
                      data-testid="button-submit-comment"
                    >
                      {commentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="mr-1 h-4 w-4" /> გაგზავნა</>}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-800" data-testid="text-login-required">
                  კომენტარის დასაწერად და შესაფასებლად გთხოვთ <a href="/api/login" className="font-semibold underline">გაიაროთ ავტორიზაცია</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
