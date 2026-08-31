import { describe, expect, it } from "vitest";
import { clearSessionCookie, requireSameOrigin, sessionCookie, setSessionCookie } from "./http";

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
});
