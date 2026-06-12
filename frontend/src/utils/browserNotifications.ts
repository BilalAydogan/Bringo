export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  return Notification.requestPermission();
}

export async function showBrowserNotification(
  title: string,
  options: {
    body: string;
    url?: string | null;
  },
): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  const payload = {
    body: options.body,
    icon: '/pwa-icon-192.svg',
    badge: '/pwa-icon-192.svg',
    data: {
      url: options.url || '/',
    },
  };

  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, payload);
    return;
  }

  const notification = new Notification(title, payload);
  notification.onclick = () => {
    window.location.href = options.url || '/';
  };
}
