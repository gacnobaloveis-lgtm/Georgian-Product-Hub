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
  return await Notification.requestPermission();
}

export function showNotification(title: string, body: string, options?: {
  icon?: string;
  tag?: string;
  onClick?: () => void;
}) {
  playMessageSound();

  if (!canUseNotifications() || Notification.permission !== "granted") return;

  const notif = new Notification(title, {
    body,
    icon: options?.icon ?? "/pwa-icon.png",
    badge: "/favicon.png",
    tag: options?.tag ?? "chat",
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
}
