import { useState, useEffect } from "react";
import { Bell, BellOff, BellRing, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from([...atob(b64)].map((c) => c.charCodeAt(0)));
}

async function subscribeAndSave(): Promise<{ ok: boolean; msg: string }> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return { ok: false, msg: "ბრაუზერი push-ს არ უჭერს მხარს" };
    }

    const keyRes = await fetch("/api/push/vapid-key");
    const { publicKey } = await keyRes.json();
    if (!publicKey) return { ok: false, msg: "სერვერი push-ს არ ატრიალებს" };

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    const saveRes = await fetch("/api/push/subscribe", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
    if (!saveRes.ok) return { ok: false, msg: "სერვერთან შენახვა ვერ მოხდა" };
    return { ok: true, msg: "" };
  } catch (e: any) {
    return { ok: false, msg: e?.message || "შეცდომა" };
  }
}

async function unsubscribeAll(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
    await sub.unsubscribe();
  }
}

type Status = "loading" | "unsupported" | "denied" | "granted-subscribed" | "granted-unsubscribed" | "default";

export function PushSettingsCard() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function checkStatus() {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported"); return;
    }
    const perm = Notification.permission;
    if (perm === "denied") { setStatus("denied"); return; }
    if (perm === "default") { setStatus("default"); return; }

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? "granted-subscribed" : "granted-unsubscribed");
    } catch {
      setStatus("granted-unsubscribed");
    }
  }

  useEffect(() => { checkStatus(); }, []);

  async function handleEnable() {
    setBusy(true); setMsg("");
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      setMsg("ნებართვა არ გაიცა. ბრაუზერის პარამეტრებიდან ჩართე.");
      setStatus("denied");
      setBusy(false); return;
    }
    const res = await subscribeAndSave();
    if (res.ok) {
      setStatus("granted-subscribed");
      setMsg("✓ შეტყობინებები ჩართულია!");
    } else {
      setMsg(res.msg);
    }
    setBusy(false);
  }

  async function handleDisable() {
    setBusy(true); setMsg("");
    await unsubscribeAll();
    setStatus("granted-unsubscribed");
    setMsg("შეტყობინებები გამორთულია");
    setBusy(false);
  }

  async function handleResubscribe() {
    setBusy(true); setMsg("");
    const res = await subscribeAndSave();
    if (res.ok) {
      setStatus("granted-subscribed");
      setMsg("✓ ხელახლა ჩართულია!");
    } else {
      setMsg(res.msg);
    }
    setBusy(false);
  }

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden" data-testid="card-push-settings">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-gray-50">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
          <BellRing className="h-4 w-4 text-emerald-600" />
        </div>
        <div>
          <p className="font-semibold text-sm">Push შეტყობინებები</p>
          <p className="text-xs text-muted-foreground">შეტყობინება — საიტის გარეშეც</p>
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        {status === "loading" && (
          <p className="text-sm text-muted-foreground">სტატუსის შემოწმება...</p>
        )}

        {status === "unsupported" && (
          <div className="flex items-start gap-2">
            <XCircle className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-600">Push არ მხარდაჭერილია</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Chrome, Edge, Firefox ან Safari (iOS 16.4+) გამოიყენე. iOS-ზე — Home Screen-ზე დაამატე.
              </p>
            </div>
          </div>
        )}

        {status === "denied" && (
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-700">შეტყობინებები დაბლოკილია</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Chrome: URL-ის გვერდით 🔒 → "Notifications" → "Allow"<br />
                Android: პარამეტრები → Apps → Chrome → Notifications → ჩართე
              </p>
            </div>
          </div>
        )}

        {status === "default" && (
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Bell className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">შეტყობინებები გამორთულია</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ჩართე და მიიღე admin-ის პასუხი + Broadcast — <strong>საიტის გარეშეც</strong>, ისე როგორც Facebook.
                </p>
              </div>
            </div>
            <Button onClick={handleEnable} disabled={busy} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              data-testid="button-push-enable">
              {busy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
              შეტყობინებების ჩართვა
            </Button>
          </div>
        )}

        {status === "granted-subscribed" && (
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-700">შეტყობინებები ჩართულია ✓</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Admin-ის პასუხი და სიახლეები მივა — ბრაუზერი დახურული იყოს მაინც.
                </p>
              </div>
            </div>
            <button onClick={handleDisable} disabled={busy}
              className="text-xs text-red-400 hover:text-red-600 underline"
              data-testid="button-push-disable">
              გამორთვა
            </button>
          </div>
        )}

        {status === "granted-unsubscribed" && (
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <BellOff className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">შეტყობინებები გამორთულია</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ნებართვა გაქვს, მაგრამ subscription გათიშულია.
                </p>
              </div>
            </div>
            <Button onClick={handleResubscribe} disabled={busy} size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              data-testid="button-push-resubscribe">
              {busy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
              ხელახლა ჩართვა
            </Button>
          </div>
        )}

        {msg && (
          <p className={`text-xs font-medium ${msg.startsWith("✓") ? "text-emerald-600" : "text-amber-600"}`}>
            {msg}
          </p>
        )}

        <p className="text-[10px] text-muted-foreground border-t border-border pt-2">
          ⚠️ მხოლოდ HTTPS-ზე მუშაობს (spiningebi.ge) — Replit preview-ზე არ ჩანს.
        </p>
      </div>
    </div>
  );
}
