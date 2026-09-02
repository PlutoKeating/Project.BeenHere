import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../lib/api";
import { AuthPage } from "./AuthPage";

describe("registration success", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows only the success state after the asynchronous request", async () => {
    const dom = new JSDOM("<div id='root'></div>", { url: "https://beenhere.arr2018.dpdns.org/auth/register" });
    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      FormData: dom.window.FormData,
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    vi.spyOn(api, "register").mockResolvedValue({ message: "验证邮件已发送，请在 30 分钟内完成验证。" });
    const container = dom.window.document.querySelector("#root")!;
    const root = createRoot(container);
    await act(async () => root.render(<MemoryRouter><AuthPage mode="register" /></MemoryRouter>));
    const values = { email: "reader@example.com", displayName: "记录者", password: "correct horse battery staple" };
    for (const [name, value] of Object.entries(values)) (container.querySelector(`[name=${name}]`) as HTMLInputElement).value = value;
    (container.querySelector("[name=legalAccepted]") as HTMLInputElement).checked = true;
    await act(async () => {
      container.querySelector("form")!.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(container.textContent).toContain("验证邮件已发送");
    expect(container.textContent).not.toContain("Cannot read properties of null");
    root.unmount();
  });
});
