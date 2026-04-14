import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

function urlBase64ToUint8Array(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from([...atob(b64)].map((c) => c.charCodeAt(0)));
}

async function subscribeAndSave(): Promise<boolean> {
  try {
    const keyRes = await fetch("/api/push/vapid-key");
    const { publicKey } = await keyRes.json();
    if (!publicKey) return false;
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }
    await fetch("/api/push/subscribe", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
    return true;
  } catch { return false; }
}

const DISMISSED_KEY = "push-banner-dismissed";

export function PushTopBanner() {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission !== "default") return;
    const dismissed = sessionStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;
    setShow(true);
  }, [isAuthenticated]);

  if (!show) return null;

  // Don't show on profile page (already has dedicated card there)
  if (location === "/profile") return null;

  async function handleEnable() {
    setBusy(true);
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      await subscribeAndSave();
    }
    setShow(false);
    setBusy(false);
  }

  function handleDismiss() {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setShow(false);
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-emerald-600 text-white shadow-md">
      <div className="flex items-center gap-3 px-4 py-2.5 max-w-2xl mx-auto">
        <Bell className="h-4 w-4 shrink-0" />
        <p className="flex-1 text-sm font-medium">
          ჩართე Push შეტყობინებები — Admin-ის პასუხი მივა, საიტი დახურული იყოს მაინც
        </p>
        <button
          onClick={handleEnable}
          disabled={busy}
          className="shrink-0 rounded-full bg-white text-emerald-700 font-bold text-xs px-3 py-1 hover:bg-emerald-50 transition-colors"
          data-testid="button-top-banner-enable"
        >
          {busy ? "..." : "ჩართვა"}
        </button>
        <button onClick={handleDismiss} className="shrink-0 hover:opacity-70" data-testid="button-top-banner-dismiss">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
