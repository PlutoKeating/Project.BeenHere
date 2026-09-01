import { describe, expect, it, vi } from "vitest";
import worker from "./index";
import { countOnlineVisitors, PresenceRoom, presenceUpdate } from "./presence";
import type { Env } from "./types";

const siteUrl = "https://beenhere.arr2018.dpdns.org";
const visitorId = "018f2f29-7e41-7b5e-8fa8-3b2f0d9cb4aa";

function presenceEnv() {
  const fetch = vi.fn(async () => new Response("presence-room"));
  const get = vi.fn(() => ({ fetch }));
  const idFromName = vi.fn(() => "global-room-id");
  const env = {
    APP_ENV: "production",
    SITE_URL: siteUrl,
    PRESENCE: { idFromName, get },
  } as unknown as Env;
  return { env, fetch, get, idFromName };
}

describe("presence WebSocket route", () => {
  it("routes a same-origin visitor to the single global room", async () => {
    const { env, fetch, get, idFromName } = presenceEnv();
    const request = new Request(`${siteUrl}/api/presence`, {
      headers: { origin: siteUrl, upgrade: "websocket" },
    });

    const response = await worker.fetch(request, env);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("presence-room");
    expect(idFromName).toHaveBeenCalledWith("global");
    expect(get).toHaveBeenCalledWith("global-room-id");
    expect(fetch).toHaveBeenCalledWith(request);
  });

  it("rejects a WebSocket opened by another website", async () => {
    const { env, fetch } = presenceEnv();
    const request = new Request(`${siteUrl}/api/presence`, {
      headers: { origin: "https://evil.example", upgrade: "websocket" },
    });

    const response = await worker.fetch(request, env);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: { code: "invalid_origin", message: "请求来源无效。" } });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requires a WebSocket upgrade", async () => {
    const { env, fetch } = presenceEnv();
    const response = await worker.fetch(new Request(`${siteUrl}/api/presence`, {
      headers: { origin: siteUrl },
    }), env);

    expect(response.status).toBe(426);
    expect(response.headers.get("upgrade")).toBe("websocket");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("accepts only the WebSocket GET handshake method", async () => {
    const { env, fetch } = presenceEnv();
    const response = await worker.fetch(new Request(`${siteUrl}/api/presence`, {
      method: "POST",
      headers: { origin: siteUrl, upgrade: "websocket" },
    }), env);

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET");
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("online visitor count", () => {
  it("counts one visitor once across multiple browser tabs", () => {
    const socket = (visitor: unknown) => ({
      deserializeAttachment: () => visitor,
    }) as unknown as WebSocket;

    expect(countOnlineVisitors([
      socket({ visitorId: "visitor-a" }),
      socket({ visitorId: "visitor-a" }),
      socket({ visitorId: "visitor-b" }),
      socket(null),
    ])).toBe(2);
  });

  it("publishes a minimal count-only message", () => {
    const socket = (visitorId: string) => ({
      deserializeAttachment: () => ({ visitorId }),
    }) as unknown as WebSocket;

    expect(presenceUpdate([socket("visitor-a"), socket("visitor-b")])).toEqual({ type: "presence", online: 2 });
  });

  it("broadcasts the current distinct count to every live connection", () => {
    const attachments: Array<string | null> = [null, visitorId, "visitor-b"];
    const sockets = attachments.map((attached, index) => ({
      deserializeAttachment: () => ({ visitorId: attached }),
      serializeAttachment: vi.fn((value: { visitorId: string }) => { attachments[index] = value.visitorId; }),
      send: vi.fn(),
      close: vi.fn(),
    })) as unknown as WebSocket[];
    const state = { getWebSockets: () => sockets } as unknown as DurableObjectState;
    const room = new PresenceRoom(state);

    room.webSocketMessage(sockets[0]!, JSON.stringify({ type: "hello", visitorId }));

    expect(sockets[0]!.serializeAttachment).toHaveBeenCalledWith({ visitorId });
    for (const socket of sockets) expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: "presence", online: 2 }));
  });

  it("closes a connection that sends an invalid hello message", () => {
    const socket = { close: vi.fn() } as unknown as WebSocket;
    const state = { getWebSockets: () => [socket] } as unknown as DurableObjectState;
    const room = new PresenceRoom(state);

    room.webSocketMessage(socket, '{"type":"hello","visitorId":"shared-name"}');

    expect(socket.close).toHaveBeenCalledWith(1008, "在线访客标识无效。");
  });
});
