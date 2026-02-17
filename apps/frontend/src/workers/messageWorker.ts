let socket: WebSocket | null = null

self.onmessage = (e) => {
  const { type, payload } = e.data

  switch (type) {
    case 'connect':
      socket = new WebSocket(payload.url)

      socket.onopen = () => {
        self.postMessage({ type: 'connected' })
      }

      socket.onmessage = (event) => {
        self.postMessage({ type: 'message', payload: JSON.parse(event.data) })
      }
      socket.onerror = (event) => {
        const err = event as ErrorEvent
        self.postMessage({
          type: 'error',
          payload: {
            message: err.message,
            type: err.type,
          },
        })
      }

      socket.onclose = () => {
        self.postMessage({ type: 'disconnected' })
      }
      break

    case 'send':
      socket?.send(JSON.stringify(payload))
      break

    case 'disconnect':
      socket?.close()
      socket = null
      break
  }
}
