import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { X, ExternalLink, Megaphone, Bell } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { showNotification } from "@/lib/web-notification";

type Broadcast = {
  id: number;
  title: string;
  body: string;
  url: string | null;
  imageUrl: string | null;
  createdAt: string | null;
};

// ─── Push subscription helper ────────────────────────────────────────────────
function urlBase64ToUint8Array(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from([...atob(b64)].map((c) => c.charCodeAt(0)));
}

async function ensurePushSubscribed(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  try {
    // Get VAPID key — if empty, push isn't configured on server
    const keyRes = await fetch("/api/push/vapid-key");
    const { publicKey } = await keyRes.json();
    if (!publicKey) return false;

    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) return true; // already subscribed

    // Subscribe
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    await fetch("/api/push/subscribe", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
    return true;
  } catch (e) {
    console.warn("[push] subscribe failed:", e);
    return false;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
export function BroadcastNotification() {
  const { isAuthenticated } = useAuth();
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [visible, setVisible] = useState<Broadcast | null>(null);
  const [pushState, setPushState] = useState<"idle" | "asking" | "granted" | "denied">("idle");
  const prevIdsRef = useRef<Set<number>>(new Set());
  const subscribeAttemptedRef = useRef(false);

  const { data: unread = [] } = useQuery<Broadcast[]>({
    queryKey: ["/api/notifications/unread"],
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const readMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/notifications/read/${id}`, {
        method: "POST",
        credentials: "include",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread"] });
    },
  });

  // ── Auto-subscribe to push when user is authenticated ──────────────────────
  useEffect(() => {
    if (!isAuthenticated || subscribeAttemptedRef.current) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return;

    subscribeAttemptedRef.current = true;

    const perm = Notification.permission;
    if (perm === "denied") {
      setPushState("denied");
      return;
    }

    if (perm === "granted") {
      // Already allowed — silently subscribe
      ensurePushSubscribed().then((ok) => {
        if (ok) setPushState("granted");
      });
    } else {
      // "default" — show our own prompt banner instead of native dialog immediately
      setPushState("asking");
    }
  }, [isAuthenticated]);

  // ── Handle newly arrived broadcasts ───────────────────────────────────────
  useEffect(() => {
    if (!unread.length) return;

    const newOnes = unread.filter((b) => !prevIdsRef.current.has(b.id) && !dismissed.has(b.id));
    newOnes.forEach((b) => {
      showNotification(`🎣 ${b.title}`, b.body, {
        tag: `broadcast-${b.id}`,
        url: b.url || "/",
      });
    });

    const card = unread.find((b) => !dismissed.has(b.id));
    if (card) setVisible(card);

    prevIdsRef.current = new Set(unread.map((b) => b.id));
  }, [unread]);

  async function handleEnablePush() {
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        await ensurePushSubscribed();
        setPushState("granted");
      } else {
        setPushState("denied");
      }
    } catch {
      setPushState("denied");
    }
  }

  function dismiss(id: number) {
    readMutation.mutate(id);
    setDismissed((prev) => new Set([...prev, id]));
    const next = unread.find((b) => b.id !== id && !dismissed.has(b.id));
    setVisible(next ?? null);
  }

  if (!isAuthenticated) return null;

  const pushSupported = "Notification" in window && "PushManager" in window;
  const showBanner = pushSupported && pushState === "asking";

  // Nothing to show
  if (!visible && !showBanner) return null;

  return (
    <div className="float-above-nav fixed right-4 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm space-y-2">
      {/* ── Push permission banner ── */}
      {showBanner && !visible && (
        <div className="animate-in slide-in-from-bottom-4 duration-300 rounded-2xl border border-border bg-white shadow-xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <Bell className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">შეტყობინებები</p>
              <p className="text-xs text-muted-foreground">მიიღე ახალი აქციები, app-ის გარეშეც</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setPushState("denied")}
                className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-gray-50 transition-colors"
                data-testid="button-push-later"
              >
                მოგვიანებით
              </button>
              <button
                onClick={handleEnablePush}
                className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                data-testid="button-push-allow"
              >
                ჩართვა
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Broadcast card ── */}
      {visible && (
        <div className="animate-in slide-in-from-bottom-4 duration-300 rounded-2xl border border-border bg-white shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white">
            <Megaphone className="h-4 w-4 shrink-0" />
            <span className="text-xs font-bold flex-1 truncate">{visible.title}</span>
            <button
              onClick={() => dismiss(visible.id)}
              className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-white/20 transition-colors"
              data-testid="button-broadcast-dismiss"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          {/* Image */}
          {visible.imageUrl && (
            <div className="w-full aspect-video bg-gray-100 overflow-hidden">
              <img
                src={visible.imageUrl}
                alt={visible.title}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}

          {/* Body */}
          <div className="px-4 py-3 space-y-3">
            <p className="text-sm text-foreground leading-relaxed">{visible.body}</p>

            {/* Push prompt inline if permission not yet granted */}
            {showBanner && (
              <button
                onClick={handleEnablePush}
                className="w-full flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-100 transition-colors"
                data-testid="button-push-allow-inline"
              >
                <Bell className="h-3.5 w-3.5 shrink-0" />
                <span>შეტყობინებები ჩართე — app-ის გარეშეც მიიღე</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              {visible.url && (
                <a
                  href={visible.url}
                  onClick={() => dismiss(visible.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
                  data-testid="button-broadcast-open"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  გახსნა
                </a>
              )}
              <button
                onClick={() => dismiss(visible.id)}
                className="flex-1 rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-50 transition-colors"
                data-testid="button-broadcast-close"
              >
                დახურვა
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Queue counter */}
      {unread.filter((b) => !dismissed.has(b.id)).length > 1 && (
        <p className="text-center text-[10px] text-muted-foreground">
          კიდევ {unread.filter((b) => !dismissed.has(b.id)).length - 1} შეტყობინება
        </p>
      )}
    </div>
  );
}
