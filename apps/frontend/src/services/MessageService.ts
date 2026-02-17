type Message = {
  id: string
  senderId: string
  receiverId: string
  content: string
  createdAt: string
  direction?: 'incoming'
}

export class MessageService {
  private socket: WebSocket | null = null
  private onMessageHandlers: ((msg: Message) => void)[] = []
  private userId: string

  constructor(
    private url: string,
    token: string
  ) {
    this.userId = ''
    this.connect(token)
  }

  private connect(token: string) {
    this.socket = new WebSocket(`${this.url}/messages?token=${token}`)

    this.socket.onopen = () => {
      console.log('WebSocket connected')
    }

    this.socket.onmessage = (event) => {
      const data: Message = JSON.parse(event.data)
      this.onMessageHandlers.forEach((cb) => cb(data))
    }

    this.socket.onerror = (e) => {
      console.error('WebSocket error', e)
    }

    this.socket.onclose = () => {
      console.warn('WebSocket closed')
      // Optional: reconnect logic here
    }
  }

  send(toUserId: string, content: string) {
    const payload = { toUserId, content }
    this.socket?.send(JSON.stringify(payload))
  }

  onMessage(callback: (msg: Message) => void) {
    this.onMessageHandlers.push(callback)
  }

  disconnect() {
    this.socket?.close()
    this.socket = null
  }
}
