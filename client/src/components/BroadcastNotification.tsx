import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { X, ExternalLink, Megaphone } from "lucide-react";
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

export function BroadcastNotification() {
  const { isAuthenticated } = useAuth();
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [visible, setVisible] = useState<Broadcast | null>(null);
  const prevIdsRef = useRef<Set<number>>(new Set());

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

  // Show pop-up + browser notification for newly arrived broadcasts
  useEffect(() => {
    if (!unread.length) return;

    const newOnes = unread.filter((b) => !prevIdsRef.current.has(b.id) && !dismissed.has(b.id));

    newOnes.forEach((b) => {
      // Browser notification
      showNotification(`🎣 ${b.title}`, b.body, {
        tag: `broadcast-${b.id}`,
        url: b.url || "/",
      });
    });

    // Show the most recent unread in the in-app card
    const card = unread.find((b) => !dismissed.has(b.id));
    if (card) setVisible(card);

    prevIdsRef.current = new Set(unread.map((b) => b.id));
  }, [unread]);

  function dismiss(id: number) {
    readMutation.mutate(id);
    setDismissed((prev) => new Set([...prev, id]));
    const next = unread.find((b) => b.id !== id && !dismissed.has(b.id));
    setVisible(next ?? null);
  }

  if (!isAuthenticated || !visible) return null;

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm animate-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-2xl border border-border bg-white shadow-2xl overflow-hidden">
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
          <div className="relative w-full aspect-video bg-gray-100 overflow-hidden">
            <img
              src={visible.imageUrl}
              alt={visible.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}

        {/* Body */}
        <div className="px-4 py-3 space-y-3">
          <p className="text-sm text-foreground leading-relaxed">{visible.body}</p>

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

      {/* Queue indicator */}
      {unread.filter((b) => !dismissed.has(b.id)).length > 1 && (
        <p className="text-center text-[10px] text-muted-foreground mt-1.5">
          კიდევ {unread.filter((b) => !dismissed.has(b.id)).length - 1} შეტყობინება
        </p>
      )}
    </div>
  );
}
