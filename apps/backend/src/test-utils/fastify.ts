export type RouteHandler = (req: any, reply: any) => any

export class MockFastify {
  public routes: Record<string, RouteHandler> = {}
  public jwt: Record<string, any> = {
    sign: (payload: any) => JSON.stringify(payload),
    decode: (token: any) => null,
  }
  public redis: any = {}
  public prisma: any = {}
  public log = { error: () => {}, warn: () => {}, info: () => {} }
  public authenticate = (_req: any, _reply: any) => {}

  get(path: string, opts: any | RouteHandler, handler?: RouteHandler) {
    this.routes[`GET ${path}`] = (typeof opts === 'function' ? opts : handler) as RouteHandler
  }
  post(path: string, opts: any | RouteHandler, handler?: RouteHandler) {
    this.routes[`POST ${path}`] = (typeof opts === 'function' ? opts : handler) as RouteHandler
  }
  patch(path: string, opts: any | RouteHandler, handler?: RouteHandler) {
    this.routes[`PATCH ${path}`] = (typeof opts === 'function' ? opts : handler) as RouteHandler
  }
  delete(path: string, opts: any | RouteHandler, handler?: RouteHandler) {
    this.routes[`DELETE ${path}`] = (typeof opts === 'function' ? opts : handler) as RouteHandler
  }
  register(_plugin: any, _opts?: any) {
    // no-op for tests
  }
}

export class MockReply {
  statusCode = 200
  payload: any
  headers: Record<string, string> = {}
  code(status: number) {
    this.statusCode = status
    return this
  }
  send(payload: any) {
    this.payload = payload
    return this
  }
  header(name: string, value: string) {
    this.headers[name] = value
    return this
  }
}
