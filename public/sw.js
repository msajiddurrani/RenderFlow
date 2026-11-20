// RenderFlow Service Worker for Background OS Notifications
const CACHE_NAME = 'renderflow-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle notification click outside the browser
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Handle incoming messages from the page to display system OS notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title || 'RenderFlow', {
      body: options?.body || 'Your 1080p MP4 master video is ready to download.',
      icon: options?.icon || '/favicon-192x192.png',
      badge: options?.badge || '/favicon-192x192.png',
      vibrate: options?.vibrate || [300, 150, 300, 150, 400],
      tag: options?.tag || 'renderflow-export',
      renotify: true,
      requireInteraction: true,
      data: options?.data || {}
    });
  }
});
