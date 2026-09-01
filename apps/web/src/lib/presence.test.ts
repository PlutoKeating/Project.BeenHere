import { afterEach, describe, expect, it, vi } from "vitest";
import { parsePresenceUpdate, watchOnlineCount } from "./presence";

afterEach(() => vi.unstubAllGlobals());

describe("presence updates", () => {
  it("accepts only a non-negative integer online count", () => {
    expect(parsePresenceUpdate('{"type":"presence","online":2}')).toBe(2);
    expect(parsePresenceUpdate('{"type":"presence","online":-1}')).toBeNull();
    expect(parsePresenceUpdate('{"type":"message","online":2}')).toBeNull();
    expect(parsePresenceUpdate("not-json")).toBeNull();
  });

  it("opens one same-origin socket with a stable browser visitor id", () => {
    const listeners = new Map<string, (event: { data?: string }) => void>();
    const close = vi.fn();
    const urls: string[] = [];
    class FakeWebSocket {
      constructor(url: string) { urls.push(url); }
      addEventListener(type: string, listener: (event: { data?: string }) => void) { listeners.set(type, listener); }
      close(code?: number, reason?: string) { close(code, reason); }
    }
    const setItem = vi.fn();
    vi.stubGlobal("window", {
      location: { href: "https://beenhere.arr2018.dpdns.org/records", protocol: "https:" },
      localStorage: { getItem: () => null, setItem },
      crypto: { randomUUID: () => "018f2f29-7e41-7b5e-8fa8-3b2f0d9cb4aa" },
      WebSocket: FakeWebSocket,
      setTimeout: vi.fn(),
      clearTimeout: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const receive = vi.fn();

    const stop = watchOnlineCount(receive);
    listeners.get("message")?.({ data: '{"type":"presence","online":3}' });

    expect(urls).toEqual(["wss://beenhere.arr2018.dpdns.org/api/presence?visitor=018f2f29-7e41-7b5e-8fa8-3b2f0d9cb4aa"]);
    expect(setItem).toHaveBeenCalledWith("bh_presence_visitor", "018f2f29-7e41-7b5e-8fa8-3b2f0d9cb4aa");
    expect(receive).toHaveBeenCalledWith(3);

    stop();
    expect(close).toHaveBeenCalledWith(1000, "页面离开");
  });
});
