import type { Env } from "./types";
import { HttpError, json, methodNotAllowed } from "./http";

const visitorIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function attachedVisitorId(socket: WebSocket): string | null {
  const attachment = socket.deserializeAttachment();
  if (!attachment || typeof attachment !== "object" || !("visitorId" in attachment)) return null;
  return typeof attachment.visitorId === "string" && attachment.visitorId ? attachment.visitorId : null;
}

export function countOnlineVisitors(sockets: WebSocket[]): number {
  return new Set(sockets.map(attachedVisitorId).filter((visitorId): visitorId is string => visitorId !== null)).size;
}

export function presenceUpdate(sockets: WebSocket[]): { type: "presence"; online: number } {
  return { type: "presence", online: countOnlineVisitors(sockets) };
}

export class PresenceRoom {
  constructor(private readonly state: DurableObjectState) {}

  async fetch(_request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.serializeAttachment({ visitorId: null });
    this.state.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(_socket: WebSocket, message: string | ArrayBuffer): void {
    let hello: unknown;
    try {
      hello = typeof message === "string" ? JSON.parse(message) : null;
    } catch {
      hello = null;
    }
    const visitorId = hello && typeof hello === "object" && "type" in hello && hello.type === "hello" && "visitorId" in hello
      ? hello.visitorId
      : null;
    if (typeof visitorId !== "string" || !visitorIdPattern.test(visitorId) || attachedVisitorId(_socket) !== null) {
      _socket.close(1008, "在线访客标识无效。");
      return;
    }
    _socket.serializeAttachment({ visitorId });
    this.broadcast();
  }

  webSocketClose(socket: WebSocket, code: number, reason: string): void {
    socket.close(code, reason);
    this.broadcast(socket);
  }

  webSocketError(socket: WebSocket): void {
    socket.close(1011, "连接异常。");
    this.broadcast(socket);
  }

  private broadcast(excluded?: WebSocket): void {
    const sockets = this.state.getWebSockets().filter((socket) => socket !== excluded && attachedVisitorId(socket) !== null);
    const payload = JSON.stringify(presenceUpdate(sockets));
    for (const socket of sockets) {
      try {
        socket.send(payload);
      } catch {
        socket.close(1011, "连接异常。");
      }
    }
  }
}

export async function connectPresence(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") return methodNotAllowed(["GET"]);
  if (request.headers.get("origin") !== new URL(env.SITE_URL).origin) {
    throw new HttpError(403, "invalid_origin", "请求来源无效。");
  }
  if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    return json(
      { error: { code: "websocket_upgrade_required", message: "此路径需要 WebSocket 连接。" } },
      { status: 426, headers: { upgrade: "websocket" } },
    );
  }
  const roomId = env.PRESENCE.idFromName("global");
  return env.PRESENCE.get(roomId).fetch(request);
}
