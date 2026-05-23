import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ThumbsUp, ThumbsDown, MessageCircle, X, Send, Loader2, UserCircle2, Pencil, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { AuthLoginDialog } from "@/components/AuthLoginDialog";

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

export function ProductReviews({ productId, onOpenChange }: { productId: number; onOpenChange?: (open: boolean) => void }) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, _setOpen] = useState(false);
  const setOpen = (v: boolean) => { _setOpen(v); onOpenChange?.(v); };
  const [text, setText] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [modalHeight, setModalHeight] = useState<number>(() => Math.round(window.innerHeight * 0.55));
  const dragStateRef = useRef<{ startY: number; startH: number } | null>(null);

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

  const editMutation = useMutation({
    mutationFn: async ({ id, text }: { id: number; text: string }) => {
      const r = await fetch(`/api/products/${productId}/comments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.message || "შეცდომა");
      }
    },
    onSuccess: () => {
      setEditingId(null);
      setEditText("");
      qc.invalidateQueries({ queryKey: commentsKey });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "შეცდომა", description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/products/${productId}/comments/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.message || "შეცდომა");
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: commentsKey }),
    onError: (e: any) => toast({ variant: "destructive", title: "შეცდომა", description: e.message }),
  });

  const handleReact = (t: "like" | "dislike") => {
    if (!isAuthenticated) {
      setLoginOpen(true);
      return;
    }
    const next = reactions.data?.mine === t ? null : t;
    reactMutation.mutate(next);
  };

  const startDrag = (clientY: number) => {
    dragStateRef.current = { startY: clientY, startH: modalHeight };
  };
  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      const s = dragStateRef.current;
      if (!s) return;
      const y = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const delta = s.startY - y;
      const next = Math.max(220, Math.min(window.innerHeight * 0.95, s.startH + delta));
      setModalHeight(next);
    };
    const onEnd = () => { dragStateRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, []);

  const mine = reactions.data?.mine;
  const likes = reactions.data?.likes ?? 0;
  const dislikes = reactions.data?.dislikes ?? 0;
  const commentCount = comments.data?.length ?? 0;
  const myUserId = (user as any)?.id ?? null;

  return (
    <>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3" data-testid="product-reviews-bar">
        <button
          type="button"
          onClick={() => handleReact("like")}
          disabled={reactMutation.isPending}
          className={`flex items-center justify-center gap-1.5 rounded-xl border-2 px-2.5 py-2 text-xs sm:text-sm font-semibold backdrop-blur-md shadow-sm transition-colors ${
            mine === "like"
              ? "border-emerald-600 bg-emerald-600/90 text-white"
              : "border-emerald-500 bg-white/80 text-emerald-700 hover:bg-emerald-50"
          }`}
          data-testid="button-like"
          title={isAuthenticated ? "მომწონს" : "გაიარეთ ავტორიზაცია"}
        >
          <ThumbsUp className="h-4 w-4" />
          <span className="tabular-nums">{likes}</span>
        </button>
        <button
          type="button"
          onClick={() => handleReact("dislike")}
          disabled={reactMutation.isPending}
          className={`flex items-center justify-center gap-1.5 rounded-xl border-2 px-2.5 py-2 text-xs sm:text-sm font-semibold backdrop-blur-md shadow-sm transition-colors ${
            mine === "dislike"
              ? "border-red-600 bg-red-600/90 text-white"
              : "border-red-500 bg-white/80 text-red-700 hover:bg-red-50"
          }`}
          data-testid="button-dislike"
          title={isAuthenticated ? "არ მომწონს" : "გაიარეთ ავტორიზაცია"}
        >
          <ThumbsDown className="h-4 w-4" />
          <span className="tabular-nums">{dislikes}</span>
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-blue-500 bg-white/80 px-2.5 py-2 text-xs sm:text-sm font-semibold text-blue-700 backdrop-blur-md shadow-sm transition-colors hover:bg-blue-50"
          data-testid="button-open-comments"
          title="კომენტარები"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="tabular-nums">კომ {formatCount(commentCount)}</span>
        </button>
      </div>

      {open && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3"
          onClick={() => setOpen(false)}
          data-testid="modal-reviews"
        >
          <div
            className="w-full sm:max-w-3xl flex flex-col bg-slate-900/55 border border-white/20 rounded-2xl shadow-2xl text-white"
            style={{ height: "calc(100dvh - 48px)", maxHeight: "900px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex justify-center pt-2 pb-1 cursor-ns-resize select-none touch-none"
              onMouseDown={(e) => startDrag(e.clientY)}
              onTouchStart={(e) => startDrag(e.touches[0].clientY)}
              data-testid="handle-resize"
              title="გაწიეთ ზემოთ/ქვემოთ"
            >
              <div className="h-1.5 w-12 rounded-full bg-white/40" />
            </div>
            <div className="flex items-center justify-between border-b border-white/15 px-4 py-2">
              <h3 className="text-base font-semibold text-white">შეფასებები და კომენტარები</h3>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white" data-testid="button-close-reviews">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {comments.isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-white/60" /></div>
              ) : (comments.data ?? []).length === 0 ? (
                <p className="text-center text-sm text-white/70 py-8">ჯერ კომენტარები არ არის. დაწერეთ პირველი!</p>
              ) : (
                comments.data!.map((c) => {
                  const isMine = myUserId && c.userId === myUserId;
                  const isEditing = editingId === c.id;
                  return (
                    <div key={c.id} className="rounded-lg border border-white/15 bg-white/10 backdrop-blur-sm p-3" data-testid={`comment-${c.id}`}>
                      <div className="flex items-center justify-between gap-2 text-xs text-white/80">
                        <div className="flex items-center gap-2 min-w-0">
                          <UserCircle2 className="h-4 w-4 shrink-0" />
                          <span className="font-semibold text-white truncate" data-testid={`comment-author-${c.id}`}>{displayName(c)}</span>
                          <span className="text-white/50">•</span>
                          <span className="shrink-0">{formatDate(c.createdAt)}</span>
                        </div>
                        {isMine && !isEditing && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => { setEditingId(c.id); setEditText(c.text); }}
                              className="p-1 rounded hover:bg-white/15 text-white/80 hover:text-white"
                              title="რედაქტირება"
                              data-testid={`button-edit-comment-${c.id}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => { if (confirm("წავშალო კომენტარი?")) deleteMutation.mutate(c.id); }}
                              disabled={deleteMutation.isPending}
                              className="p-1 rounded hover:bg-red-500/30 text-red-200 hover:text-white"
                              title="წაშლა"
                              data-testid={`button-delete-comment-${c.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      {isEditing ? (
                        <div className="mt-2 space-y-2">
                          <Textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={2}
                            maxLength={1000}
                            className="bg-white/15 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/40"
                            data-testid={`input-edit-comment-${c.id}`}
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => { setEditingId(null); setEditText(""); }}
                              className="text-white/80 hover:bg-white/15 hover:text-white"
                              data-testid={`button-cancel-edit-${c.id}`}
                            >
                              გაუქმება
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => { if (editText.trim()) editMutation.mutate({ id: c.id, text: editText.trim() }); }}
                              disabled={editMutation.isPending || !editText.trim()}
                              className="bg-blue-600 hover:bg-blue-700"
                              data-testid={`button-save-edit-${c.id}`}
                            >
                              {editMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-1 h-4 w-4" /> შენახვა</>}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1.5 text-sm text-white whitespace-pre-wrap break-words" data-testid={`comment-text-${c.id}`}>{c.text}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-white/15 px-4 py-3 space-y-2">
              {isAuthenticated ? (
                <>
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="დაწერეთ თქვენი კომენტარი..."
                    rows={2}
                    maxLength={1000}
                    className="bg-white/15 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/40"
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
                <div className="rounded-lg border border-amber-200/40 bg-amber-500/10 p-3 text-center text-sm text-amber-100 space-y-2" data-testid="text-login-required">
                  <p>კომენტარის დასაწერად და შესაფასებლად საჭიროა ავტორიზაცია</p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => { setOpen(false); setLoginOpen(true); }}
                    className="bg-amber-600 hover:bg-amber-700"
                    data-testid="button-open-login"
                  >
                    გაიარეთ ავტორიზაცია
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      <AuthLoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </>
  );
}
