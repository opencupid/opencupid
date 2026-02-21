// Push notification service worker - no imports, pure classic JS

self.addEventListener('push', (event) => {
  console.log('sw Push event received:', event)
  if (!event.data) return

  const data = event.data.json()
  const title = data.title || 'Notification'
  const options = {
    body: data.body || '',
    icon: data.icon || '/favicon.ico',
    data: {
      url: data.data?.url || '/',
    },
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] notificationclick fired', event.notification.data)
  event.notification.close()

  const path = event.notification.data?.url || '/'
  const absoluteUrl = new URL(path, self.registration.scope).href
  console.log('[SW] Opening URL:', absoluteUrl)

  event.waitUntil(self.clients.openWindow(absoluteUrl))
})
