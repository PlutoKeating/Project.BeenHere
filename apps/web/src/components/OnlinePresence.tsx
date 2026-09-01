import { useEffect, useState } from "react";
import { watchOnlineCount } from "../lib/presence";

export function PresenceIndicator({ online }: { online: number | null }) {
  if (online === null || online < 2) return null;
  return <span
    className="inline-flex items-center gap-2 whitespace-nowrap px-2 font-mono text-[10px] text-ink-muted"
    role="status"
    aria-live="polite"
    aria-label={`当前 ${online} 人在线`}
  >
    <span className="size-1.5 rounded-full bg-seal" aria-hidden="true"/>
    {online} 人在线
  </span>;
}

export function OnlinePresence() {
  const [online, setOnline] = useState<number | null>(null);
  useEffect(() => watchOnlineCount(setOnline), []);
  return <PresenceIndicator online={online}/>;
}
