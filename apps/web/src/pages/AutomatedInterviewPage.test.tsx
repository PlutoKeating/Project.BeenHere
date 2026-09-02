import { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AutomatedInterviewPage } from "./AutomatedInterviewPage";

describe("automated interview page", () => {
  it("requires informed agreement before showing the interview transcript", async () => {
    const dom = new JSDOM("<div id='root'></div>", { url: "https://beenhere.arr2018.dpdns.org/studio/interview" });
    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    dom.window.HTMLElement.prototype.scrollIntoView = () => undefined;
    const container = dom.window.document.querySelector("#root")!;
    const root = createRoot(container);
    await act(async () => root.render(<MemoryRouter><AutomatedInterviewPage /></MemoryRouter>));

    const startButton = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("开始采访"))!;
    expect(startButton.disabled).toBe(true);
    await act(async () => (container.querySelector("input[type=checkbox]") as HTMLInputElement).click());
    expect(startButton.disabled).toBe(false);
    await act(async () => startButton.click());
    expect(container.textContent).toContain("来过 · 自动提问");
    expect(container.querySelector("textarea")?.getAttribute("aria-label") ?? container.querySelector("label[for=interview-answer]")?.textContent).toContain("你的回答");
    root.unmount();
  });
});
