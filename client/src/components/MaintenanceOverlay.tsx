import { useEffect, useState } from "react";
import { Loader2, WifiOff } from "lucide-react";

export function MaintenanceOverlay() {
  const [isDown, setIsDown] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let failures = 0;
    let cancelled = false;

    async function check() {
      if (cancelled) return;
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch("/api/online-count", {
          method: "GET",
          cache: "no-store",
          signal: ctrl.signal,
        });
        clearTimeout(t);
        if (!res.ok && res.status >= 500) {
          throw new Error("server error");
        }
        failures = 0;
        if (!cancelled) setIsDown(false);
      } catch {
        failures += 1;
        if (failures >= 2 && !cancelled) setIsDown(true);
      }
    }

    check();
    const iv = setInterval(check, 15_000);

    const onOnline = () => check();
    const onOffline = () => setIsDown(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      cancelled = true;
      clearInterval(iv);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  async function handleRetry() {
    setRetrying(true);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch("/api/online-count", { method: "GET", cache: "no-store", signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) {
        setIsDown(false);
      }
    } catch {} finally {
      setRetrying(false);
    }
  }

  if (!isDown) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4"
      data-testid="overlay-maintenance"
      role="alertdialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-amber-200 overflow-hidden">
        <div className="bg-gradient-to-br from-amber-100 to-orange-100 px-6 py-5 flex items-center gap-3 border-b border-amber-200">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
            <WifiOff className="h-6 w-6 text-amber-700" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-amber-900" data-testid="text-maintenance-title">
              ტექნიკური სამუშაოები
            </h2>
            <p className="text-xs text-amber-800">spiningebi.ge</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-base font-semibold text-slate-900 leading-relaxed" data-testid="text-maintenance-greeting">
            ძვირფასო მომხმარებლებო,
          </p>
          <p className="text-sm text-slate-700 leading-relaxed" data-testid="text-maintenance-body">
            ბოდიშს გიხდით შექმნილი შეფერხებისთვის. საიტზე მიდის ტექნიკური სამუშაოები — ძალიან მალე დაგიბრუნდებით.
          </p>

          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>კავშირი ავტომატურად აღდგება...</span>
          </div>

          <button
            onClick={handleRetry}
            disabled={retrying}
            className="w-full rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 px-4 py-3 text-base font-bold text-white shadow-md transition-colors"
            data-testid="button-maintenance-retry"
          >
            {retrying ? "მოწმდება..." : "ხელახლა ცდა"}
          </button>
        </div>
      </div>
    </div>
  );
}
