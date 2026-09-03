import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { HomePage } from "./HomePage";

describe("home page", () => {
  it("promotes the automated interview in the primary action list", () => {
    const markup = renderToStaticMarkup(<MemoryRouter><HomePage /></MemoryRouter>);
    const document = new JSDOM(markup).window.document;
    const interviewLink = document.querySelector('a[href="/studio/interview"]');
    const driftButton = [...document.querySelectorAll("button")].find((button) => button.textContent?.includes("捡起一个漂流瓶"));

    expect(interviewLink?.textContent).toContain("开始自动采访");
    expect(interviewLink?.classList.contains("button-primary")).toBe(true);
    expect(driftButton?.classList.contains("button-secondary")).toBe(true);
    expect(document.body.textContent).not.toContain("浏览采访记录");
  });
});
