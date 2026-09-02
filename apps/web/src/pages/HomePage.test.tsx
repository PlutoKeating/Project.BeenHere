import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { HomePage } from "./HomePage";

describe("home page", () => {
  it("promotes the automated interview in the primary action list", () => {
    const markup = renderToStaticMarkup(<MemoryRouter><HomePage /></MemoryRouter>);
    const document = new JSDOM(markup).window.document;
    const link = document.querySelector('a[href="/studio/interview"]');

    expect(link?.textContent).toContain("开始自动采访");
    expect(link?.classList.contains("button-secondary")).toBe(true);
  });
});
