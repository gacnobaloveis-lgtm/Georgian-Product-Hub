import { playMessageSound } from "./notification-sound";

export function canUseNotifications(): boolean {
  return "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!canUseNotifications()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!canUseNotifications()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export async function showNotification(
  title: string,
  body: string,
  options?: {
    icon?: string;
    tag?: string;
    url?: string;
    onClick?: () => void;
  }
) {
  // Always play sound (works when tab is active / minimized)
  playMessageSound();

  if (!canUseNotifications() || Notification.permission !== "granted") return;

  const icon = options?.icon ?? "/pwa-icon.png";
  const tag = options?.tag ?? "chat";
  const url = options?.url ?? "/live-contact";

  // Prefer Service Worker showNotification — works on mobile, Android Chrome, etc.
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        icon,
        badge: "/favicon.png",
        tag,
        renotify: true,
        silent: false,
        data: { url },
      } as NotificationOptions);

      // Handle click for SW notification via message
      if (options?.onClick) {
        const handler = (event: MessageEvent) => {
          if (event.data?.type === "notification-click" && event.data?.tag === tag) {
            options.onClick!();
            navigator.serviceWorker.removeEventListener("message", handler);
          }
        };
        navigator.serviceWorker.addEventListener("message", handler);
      }
      return;
    } catch {
      // fall through to Notification API
    }
  }

  // Fallback: plain Notification API (desktop browsers)
  try {
    const notif = new Notification(title, {
      body,
      icon,
      badge: "/favicon.png",
      tag,
      renotify: true,
      silent: false,
    });
    if (options?.onClick) {
      notif.onclick = () => {
        window.focus();
        options.onClick!();
        notif.close();
      };
    }
  } catch {
    // browser blocked it
  }
}
