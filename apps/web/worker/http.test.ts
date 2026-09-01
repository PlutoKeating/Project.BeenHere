import { describe, expect, it } from "vitest";
import { clearSessionCookie, requireSameOrigin, secureAssetResponse, sessionCookie, setSessionCookie } from "./http";

describe("session and CSRF boundary", () => {
  it("uses an opaque HttpOnly same-site cookie", () => {
    const cookie = setSessionCookie("secret-token");
    expect(cookie).toContain("HttpOnly"); expect(cookie).toContain("Secure"); expect(cookie).toContain("SameSite=Lax");
    expect(sessionCookie(new Request("https://beenhere.arr2018.dpdns.org", { headers: { cookie: "other=x; bh_session=secret-token" } }))).toBe("secret-token");
    expect(clearSessionCookie()).toContain("Max-Age=0");
  });

  it("rejects state changes from another origin", () => {
    const request = new Request("https://beenhere.arr2018.dpdns.org/api/auth/login", { method: "POST", headers: { origin: "https://evil.example" } });
    expect(() => requireSameOrigin(request, "https://beenhere.arr2018.dpdns.org")).toThrowError(expect.objectContaining({ status: 403 }));
  });

  it("allows only the pinned browser OCR resource origins", () => {
    const response = secureAssetResponse(new Response("asset"), true);
    const policy = response.headers.get("content-security-policy") ?? "";

    expect(policy).toContain("script-src 'self' 'wasm-unsafe-eval'");
    expect(policy).toContain("worker-src 'self'");
    expect(policy).toContain("https://cdn.jsdelivr.net");
    expect(policy).toContain("https://paddle-model-ecology.bj.bcebos.com");
  });
});
