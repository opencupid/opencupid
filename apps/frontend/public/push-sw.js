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
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientsArr) => {
      const client = clientsArr.find((c) => c.focused) || clientsArr[0]
      if (client) {
        return client.navigate(targetUrl).then(() => client.focus())
      } else {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})
