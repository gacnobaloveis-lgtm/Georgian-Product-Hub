import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MessageCircle, X, Send, ArrowLeft, ChevronRight, Bell, BellOff, Megaphone, Trash2, Link2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminStatus } from "@/hooks/use-admin";
import { queryClient } from "@/lib/queryClient";
import { showNotification, requestNotificationPermission } from "@/lib/web-notification";
import type { Product } from "@shared/schema";

type ConvMsg = { id: number; userId: string; message: string; senderType: string; createdAt: string | null };
type Conv = { userId: string; firstName: string | null; lastName: string | null; lastMessage: string; lastAt: string | null; unread: number };
type Broadcast = { id: number; title: string; body: string; url: string | null; imageUrl: string | null; createdAt: string | null };

function fmtTime(d: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  const now = new Date();
  const isToday = dt.toDateString() === now.toDateString();
  return isToday
    ? dt.toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit" })
    : dt.toLocaleDateString("ka-GE", { day: "2-digit", month: "2-digit" }) + " " +
      dt.toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit" });
}

async function getVapidKey(): Promise<string> {
  const res = await fetch("/api/push/vapid-key");
  const data = await res.json();
  return data.publicKey;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function usePushSubscription(isAdmin: boolean | undefined) {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin || !("Notification" in window) || !("serviceWorker" in navigator)) return;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
      } catch (_) {}
    })();
  }, [isAdmin]);

  async function subscribe() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setLoading(false); return; }
      const vapidKey = await getVapidKey();
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      await fetch("/api/push/subscribe", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setSubscribed(true);
    } catch (e) {
      console.error("Push subscribe failed:", e);
    } finally { setLoading(false); }
  }

  async function unsubscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (_) {} finally { setLoading(false); }
  }

  return { subscribed, loading, subscribe, unsubscribe };
}

export function AdminChatWidget() {
  const { data: adminStatus } = useAdminStatus();
  const isAdmin = adminStatus?.isAdmin;

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "broadcast">("chat");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Broadcast form state
  const [bcTitle, setBcTitle] = useState("");
  const [bcBody, setBcBody] = useState("");
  const [bcUrl, setBcUrl] = useState("");
  const [bcImageUrl, setBcImageUrl] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { subscribed, loading: pushLoading, subscribe, unsubscribe } = usePushSubscription(isAdmin);

  const { data: conversations = [] } = useQuery<Conv[]>({
    queryKey: ["/api/chat/conversations"],
    enabled: !!isAdmin,
    refetchInterval: isAdmin ? 5000 : false,
  });

  const { data: messages = [] } = useQuery<ConvMsg[]>({
    queryKey: ["/api/chat/messages", selectedUserId],
    queryFn: async () => {
      const res = await fetch(`/api/chat/messages/${selectedUserId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!isAdmin && !!selectedUserId,
    refetchInterval: 4000,
  });

  const { data: broadcasts = [] } = useQuery<Broadcast[]>({
    queryKey: ["/api/admin/broadcasts"],
    enabled: !!isAdmin && open && activeTab === "broadcast",
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: !!isAdmin && open && activeTab === "broadcast",
  });

  const replyMutation = useMutation({
    mutationFn: async ({ userId, message }: { userId: string; message: string }) => {
      const res = await fetch(`/api/chat/reply/${userId}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error("Reply failed");
      return res.json() as Promise<ConvMsg>;
    },
    onSuccess: (newMsg) => {
      queryClient.setQueryData<ConvMsg[]>(["/api/chat/messages", selectedUserId], (old = []) => {
        if (old.some((m) => m.id === newMsg.id)) return old;
        return [...old, newMsg];
      });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages", selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations"] });
      setReplyText("");
    },
  });

  const broadcastMutation = useMutation({
    mutationFn: async (data: { title: string; body: string; url?: string; imageUrl?: string }) => {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Broadcast failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/broadcasts"] });
      setBcTitle(""); setBcBody(""); setBcUrl(""); setBcImageUrl(""); setSelectedProduct(null);
    },
  });

  const deleteBroadcastMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/admin/broadcast/${id}`, { method: "DELETE", credentials: "include" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/broadcasts"] }),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isAdmin) requestNotificationPermission();
  }, [isAdmin]);

  const prevUnreadRef = useRef(0);
  useEffect(() => {
    const total = conversations.reduce((s, c) => s + (c.unread || 0), 0);
    if (total > prevUnreadRef.current) {
      const newest = [...conversations].sort((a, b) =>
        new Date(b.lastAt ?? 0).getTime() - new Date(a.lastAt ?? 0).getTime()
      )[0];
      showNotification(
        "💬 ახალი შეტყობინება",
        newest ? `${newest.firstName || "მომხმარებელი"}: ${newest.lastMessage.substring(0, 80)}` : "ახალი შეტყობინება",
        { tag: "admin-chat", url: "/" }
      );
    }
    prevUnreadRef.current = total;
  }, [conversations]);

  function handleSend() {
    if (!replyText.trim() || !selectedUserId || replyMutation.isPending) return;
    replyMutation.mutate({ userId: selectedUserId, message: replyText.trim() });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function handleOpen() { setOpen(true); setSelectedUserId(null); }

  function handleClose() {
    setOpen(false); setSelectedUserId(null); setReplyText("");
  }

  function handleSelectProduct(p: Product) {
    setSelectedProduct(p);
    setBcTitle(p.name);
    setBcUrl(`${window.location.origin}/product/${p.id}`);
    setBcImageUrl(p.imageUrl || "");
    if (!bcBody) setBcBody(`${p.discountPrice ? `ფასი: ${p.discountPrice}₾` : `ფასი: ${p.originalPrice}₾`}`);
  }

  function handleBroadcast() {
    if (!bcTitle.trim() || !bcBody.trim() || broadcastMutation.isPending) return;
    broadcastMutation.mutate({
      title: bcTitle.trim(),
      body: bcBody.trim(),
      url: bcUrl.trim() || undefined,
      imageUrl: bcImageUrl.trim() || undefined,
    });
  }

  if (!isAdmin) return null;

  const totalUnread = conversations.reduce((s, c) => s + (c.unread || 0), 0);
  const selectedConv = conversations.find((c) => c.userId === selectedUserId);
  const pushSupported = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-20 left-4 md:bottom-6 md:left-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition-all hover:scale-105 active:scale-95"
        data-testid="button-admin-chat-widget"
        title="LIVE კონტაქტი — ადმინი"
      >
        <MessageCircle className="h-6 w-6" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>

      {open && <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={handleClose} />}

      {open && (
        <div className="fixed bottom-0 right-0 z-50 flex flex-col w-full sm:w-[420px] sm:bottom-6 sm:right-6 sm:rounded-2xl overflow-hidden shadow-2xl border border-border bg-white"
          style={{ height: "min(85vh, 680px)" }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-600 text-white shrink-0">
            {selectedUserId && activeTab === "chat" ? (
              <button onClick={() => { setSelectedUserId(null); setReplyText(""); }}
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/20"
                data-testid="button-widget-back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : null}

            {/* Tabs */}
            {!selectedUserId && (
              <div className="flex flex-1 gap-1">
                <button
                  onClick={() => setActiveTab("chat")}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${activeTab === "chat" ? "bg-white/25" : "hover:bg-white/15"}`}
                  data-testid="tab-chat"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>ჩათი</span>
                  {totalUnread > 0 && (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold">
                      {totalUnread}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("broadcast")}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${activeTab === "broadcast" ? "bg-white/25" : "hover:bg-white/15"}`}
                  data-testid="tab-broadcast"
                >
                  <Megaphone className="h-3.5 w-3.5" />
                  <span>Broadcast</span>
                </button>
              </div>
            )}

            {selectedUserId && activeTab === "chat" && (
              <p className="flex-1 font-semibold text-sm truncate">
                {selectedConv?.firstName || ""} {selectedConv?.lastName || ""}
              </p>
            )}

            <div className="flex items-center gap-1 ml-auto shrink-0">
              {pushSupported && (
                <button onClick={subscribed ? unsubscribe : subscribe} disabled={pushLoading}
                  title={subscribed ? "Push ჩართულია" : "Push ჩართე"}
                  className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${subscribed ? "bg-white/20 hover:bg-white/30" : "bg-white/10 hover:bg-white/20 text-white/60"}`}
                  data-testid="button-push-toggle"
                >
                  {subscribed ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                </button>
              )}
              <button onClick={handleClose}
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/20"
                data-testid="button-widget-close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-col flex-1 min-h-0">
            {activeTab === "chat" ? (
              selectedUserId ? (
                /* Thread view */
                <>
                  <div className="flex-1 overflow-y-auto space-y-3 p-4 min-h-0">
                    {messages.map((msg) => {
                      const isUser = msg.senderType === "user";
                      const isAdminMsg = msg.senderType === "admin";
                      return (
                        <div key={msg.id} className={`flex items-end gap-2 ${isUser ? "" : "justify-end"}`}>
                          {isUser && (
                            <div className="h-6 w-6 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                              {(selectedConv?.firstName?.[0] || "მ").toUpperCase()}
                            </div>
                          )}
                          <div className="max-w-[75%]">
                            <div className={`rounded-2xl px-3.5 py-2.5 text-sm ${
                              isUser ? "bg-gray-100 rounded-bl-sm text-gray-800"
                                : isAdminMsg ? "bg-emerald-600 text-white rounded-br-sm"
                                  : "bg-blue-50 border border-blue-100 rounded-bl-sm text-blue-800"
                            }`}>{msg.message}</div>
                            <p className={`text-[10px] text-muted-foreground mt-0.5 ${isUser ? "" : "text-right"}`}>
                              {fmtTime(msg.createdAt)}
                            </p>
                          </div>
                          {!isUser && (
                            <div className="h-6 w-6 shrink-0 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700">SP</div>
                          )}
                        </div>
                      );
                    })}
                    {replyMutation.isPending && (
                      <div className="flex items-end gap-2 justify-end opacity-60">
                        <div className="max-w-[75%]">
                          <div className="rounded-2xl rounded-br-sm bg-emerald-600 px-3.5 py-2.5 text-sm text-white">...</div>
                        </div>
                        <div className="h-6 w-6 shrink-0 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700">SP</div>
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>
                  <div className="flex items-end gap-2 p-3 border-t border-border shrink-0 bg-white">
                    <textarea
                      value={replyText} onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={handleKeyDown} placeholder="პასუხი... (Enter — გაგზავნა)"
                      rows={2}
                      className="flex-1 resize-none rounded-xl border border-border bg-gray-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 transition-colors"
                      data-testid="input-widget-reply"
                    />
                    <Button onClick={handleSend} disabled={!replyText.trim() || replyMutation.isPending}
                      size="icon" className="h-10 w-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 shrink-0"
                      data-testid="button-widget-send"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                /* Conversations list */
                <div className="flex flex-col flex-1 min-h-0">
                  {pushSupported && !subscribed && (
                    <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2">
                      <BellOff className="h-4 w-4 text-amber-500 shrink-0" />
                      <p className="text-xs text-amber-700 flex-1">
                        ზარი გამორთულია —{" "}
                        <button onClick={subscribe} disabled={pushLoading} className="font-semibold underline hover:text-amber-900">ჩართვა</button>
                      </p>
                    </div>
                  )}
                  {pushSupported && subscribed && (
                    <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2">
                      <Bell className="h-4 w-4 text-emerald-600 shrink-0" />
                      <p className="text-xs text-emerald-700">ზარი ჩართულია — ჩახ. ჩანართზეც გაისმება</p>
                    </div>
                  )}
                  <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-0">
                    {conversations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                        <MessageCircle className="h-8 w-8 opacity-30" />
                        <p className="text-sm">შეტყობინებები არ არის</p>
                      </div>
                    ) : conversations.map((conv) => (
                      <button key={conv.userId} onClick={() => setSelectedUserId(conv.userId)}
                        className={`w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-all hover:shadow-sm ${
                          conv.unread > 0 ? "bg-red-50 border border-red-100 hover:border-red-200" : "bg-gray-50 border border-transparent hover:border-gray-200"
                        }`}
                        data-testid={`button-widget-conv-${conv.userId}`}
                      >
                        <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${conv.unread > 0 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"}`}>
                          {(conv.firstName?.[0] || "მ").toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-sm text-foreground truncate">
                              {conv.firstName || ""} {conv.lastName || ""}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {conv.lastAt && <span className="text-[10px] text-muted-foreground">{fmtTime(conv.lastAt)}</span>}
                              {conv.unread > 0 && (
                                <span className="flex h-5 min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                                  {conv.unread}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className={`text-xs truncate mt-0.5 ${conv.unread > 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                            {conv.lastMessage}
                          </p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )
            ) : (
              /* ── Broadcast Tab ──────────────────────────────── */
              <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
                {/* Form */}
                <div className="p-3 space-y-2 border-b border-border bg-gray-50 shrink-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ახალი Broadcast</p>

                  {/* Product picker */}
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">პროდუქტი (სურათის ჩასასმელად):</p>
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {products.slice(0, 10).map((p) => (
                        <button key={p.id} onClick={() => handleSelectProduct(p)}
                          className={`flex-shrink-0 rounded-lg border-2 overflow-hidden transition-all ${selectedProduct?.id === p.id ? "border-emerald-500" : "border-transparent hover:border-gray-300"}`}
                          data-testid={`button-product-pick-${p.id}`}
                        >
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="w-14 h-14 object-cover" />
                          ) : (
                            <div className="w-14 h-14 bg-gray-200 flex items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <input
                    value={bcTitle} onChange={(e) => setBcTitle(e.target.value)}
                    placeholder="სათაური *"
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 transition-colors"
                    data-testid="input-broadcast-title"
                  />
                  <textarea
                    value={bcBody} onChange={(e) => setBcBody(e.target.value)}
                    placeholder="ტექსტი *"
                    rows={2}
                    className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 transition-colors"
                    data-testid="input-broadcast-body"
                  />
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        value={bcUrl} onChange={(e) => setBcUrl(e.target.value)}
                        placeholder="ლინკი (url)"
                        className="w-full rounded-lg border border-border bg-white pl-8 pr-3 py-2 text-sm outline-none focus:border-emerald-500 transition-colors"
                        data-testid="input-broadcast-url"
                      />
                    </div>
                    <div className="relative flex-1">
                      <ImageIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        value={bcImageUrl} onChange={(e) => setBcImageUrl(e.target.value)}
                        placeholder="სურათის url"
                        className="w-full rounded-lg border border-border bg-white pl-8 pr-3 py-2 text-sm outline-none focus:border-emerald-500 transition-colors"
                        data-testid="input-broadcast-image"
                      />
                    </div>
                  </div>

                  {/* Preview */}
                  {bcImageUrl && (
                    <div className="rounded-lg overflow-hidden border border-border">
                      <img src={bcImageUrl} alt="preview" className="w-full h-28 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </div>
                  )}

                  <Button
                    onClick={handleBroadcast}
                    disabled={!bcTitle.trim() || !bcBody.trim() || broadcastMutation.isPending}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
                    data-testid="button-broadcast-send"
                  >
                    <Megaphone className="h-4 w-4" />
                    {broadcastMutation.isPending ? "იგზავნება..." : "გაგზავნა ყველასთვის"}
                  </Button>
                  {broadcastMutation.isSuccess && (
                    <p className="text-center text-xs text-emerald-600 font-medium">✓ გაიგზავნა წარმატებით</p>
                  )}
                </div>

                {/* Past broadcasts */}
                <div className="flex-1 p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">გაგზავნილი</p>
                  {broadcasts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                      <Megaphone className="h-7 w-7 opacity-30" />
                      <p className="text-xs">გაგზავნილი Broadcast არ არის</p>
                    </div>
                  ) : broadcasts.map((b) => (
                    <div key={b.id} className="flex gap-3 rounded-xl border border-border bg-white p-3">
                      {b.imageUrl && (
                        <img src={b.imageUrl} alt={b.title} className="w-14 h-14 rounded-lg object-cover shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{b.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{b.body}</p>
                        {b.url && <p className="text-[10px] text-emerald-600 truncate mt-0.5">{b.url}</p>}
                        <p className="text-[10px] text-muted-foreground mt-1">{fmtTime(b.createdAt)}</p>
                      </div>
                      <button
                        onClick={() => deleteBroadcastMutation.mutate(b.id)}
                        disabled={deleteBroadcastMutation.isPending}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                        data-testid={`button-broadcast-delete-${b.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
