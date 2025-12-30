self.addEventListener("push", (event) => {
  try {
    const data = event.data ? event.data.json() : {}
    const title = data.title || "New notification"
    const options = {
      body: data.body || "",
      icon: data.icon || "/icon.svg",
      badge: data.badge || "/icon.svg",
      data: {
        url: data.url || "/",
      },
    }

    event.waitUntil(self.registration.showNotification(title, options))
  } catch (err) {
  }
})

self.addEventListener("notificationclick", (event) => {
  const url = event?.notification?.data?.url || "/"
  event.notification.close()

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
      for (const client of clientList) {
        if (client.url && "focus" in client) {
          await client.focus()
          client.navigate(url)
          return
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(url)
      }
    })(),
  )
})
