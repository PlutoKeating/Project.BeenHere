import { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../lib/api";
import type { InterviewRecordDetail } from "../types";
import { RecordPage } from "./RecordPage";

afterEach(() => vi.restoreAllMocks());

describe("record claim action", () => {
  it("disables the participant claim action when the record is already claimed", async () => {
    const record: InterviewRecordDetail = {
      id: "record-1",
      recordNumber: "BH-000001",
      title: "一段采访",
      excerpt: "普通人的回答。",
      conductedAt: "2026-09-01T00:00:00.000Z",
      displayName: "小林",
      personSlug: "person-1",
      identityMode: "pseudonym",
      isClaimed: true,
      edition: { number: 1, publishedAt: "2026-09-02T00:00:00.000Z", changeSummary: "首次公开", contentHash: "hash" },
      messages: [{ id: "message-1", speakerRole: "participant", body: "普通人的回答。" }],
      source: null,
    };
    vi.spyOn(api, "record").mockResolvedValue(record);
    const dom = new JSDOM("<div id='root'></div>", { url: "https://beenhere.arr2018.dpdns.org/records/BH-000001" });
    Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
    const root = createRoot(dom.window.document.querySelector("#root")!);

    await act(async () => root.render(<MemoryRouter><RecordPage /></MemoryRouter>));

    const claimButton = [...dom.window.document.querySelectorAll("button")].find((button) => button.textContent?.includes("我是被采访者"));
    expect(claimButton?.disabled).toBe(true);
    expect(dom.window.document.querySelector('a[href="/studio/claim/record-1"]')).toBeNull();
    root.unmount();
  });
});
