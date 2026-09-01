import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PresenceIndicator } from "./OnlinePresence";

describe("online presence indicator", () => {
  it("appears only when at least two people are online", () => {
    expect(renderToStaticMarkup(<PresenceIndicator online={1}/>)).toBe("");
    const visible = renderToStaticMarkup(<PresenceIndicator online={2}/>);
    expect(visible).toContain("2 人在线");
    expect(visible).toContain('aria-live="polite"');
  });
});
