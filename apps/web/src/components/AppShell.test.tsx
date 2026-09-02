import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { AppShell } from "./AppShell";

beforeAll(() => {
  vi.stubGlobal("localStorage", { getItem: () => "night", setItem: () => undefined });
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
});

function renderShell(): string {
  return renderToStaticMarkup(<MemoryRouter initialEntries={["/"]}><AppShell /></MemoryRouter>);
}

describe("mobile navigation", () => {
  it("renders the fixed bottom tab bar", () => {
    expect(renderShell()).toContain('aria-label="移动端底部导航"');
  });

  it("keeps native account navigation inside the application", () => {
    const accountLinks = [...renderShell().matchAll(/<a[^>]*href="\/studio"[^>]*>/g)].map(([tag]) => tag);
    expect(accountLinks.length).toBeGreaterThan(0);
    expect(accountLinks.every((tag) => !tag.includes('data-navigation="document"'))).toBe(true);
  });

  it("exposes source, license, and warranty notices", () => {
    const markup = renderShell();
    expect(markup).toContain("https://github.com/PlutoKeating/Project.BeenHere");
    expect(markup).toContain("AGPLv3");
    expect(markup).toContain("本软件不提供任何担保");
  });

  it("exposes the public identity and policy pages from the site shell", () => {
    const markup = renderShell();
    expect(markup).toContain('href="/about"');
    expect(markup).toContain('href="/privacy"');
    expect(markup).toContain('href="/terms"');
  });
});
