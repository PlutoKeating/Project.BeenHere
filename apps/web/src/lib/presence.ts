export function parsePresenceUpdate(raw: string): number | null {
  try {
    const value = JSON.parse(raw) as { type?: unknown; online?: unknown };
    return value.type === "presence" && Number.isInteger(value.online) && Number(value.online) >= 0
      ? Number(value.online)
      : null;
  } catch {
    return null;
  }
}

const visitorStorageKey = "bh_presence_visitor";
const reconnectDelays = [1_000, 2_000, 5_000, 10_000, 30_000];

function browserVisitorId(): string {
  try {
    const stored = window.localStorage.getItem(visitorStorageKey);
    if (stored) return stored;
  } catch {
    // Storage can be unavailable in hardened/private browser contexts.
  }

  const visitorId = window.crypto.randomUUID();
  try {
    window.localStorage.setItem(visitorStorageKey, visitorId);
  } catch {
    // The current page can still participate with an in-memory identifier.
  }
  return visitorId;
}

function presenceUrl(visitorId: string): string {
  const url = new URL("/api/presence", window.location.href);
  url.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("visitor", visitorId);
  return url.toString();
}

export function watchOnlineCount(onCount: (online: number | null) => void): () => void {
  const visitorId = browserVisitorId();
  let stopped = false;
  let attempt = 0;
  let reconnectTimer: number | null = null;
  let socket: WebSocket | null = null;

  const connect = () => {
    if (stopped || socket) return;
    const current = new window.WebSocket(presenceUrl(visitorId));
    socket = current;
    current.addEventListener("open", () => { attempt = 0; });
    current.addEventListener("message", (event) => {
      if (typeof event.data !== "string") return;
      const online = parsePresenceUpdate(event.data);
      if (online !== null) onCount(online);
    });
    current.addEventListener("error", () => current.close());
    current.addEventListener("close", () => {
      if (socket === current) socket = null;
      if (stopped) return;
      onCount(null);
      const delay = reconnectDelays[Math.min(attempt, reconnectDelays.length - 1)]!;
      attempt += 1;
      reconnectTimer = window.setTimeout(connect, delay);
    });
  };

  const reconnectNow = () => {
    if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
    connect();
  };

  window.addEventListener("online", reconnectNow);
  connect();

  return () => {
    stopped = true;
    window.removeEventListener("online", reconnectNow);
    if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
    socket?.close(1000, "页面离开");
    socket = null;
  };
}
