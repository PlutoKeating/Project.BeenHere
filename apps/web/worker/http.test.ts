import { describe, expect, it } from "vitest";
import { requireAdmin } from "./http";
import type { Env } from "./types";

const env = { APP_ENV: "production", SITE_URL: "https://beenhere.arr2018.dpdns.org" } as Env;

describe("admin authentication", () => {
  it("allows the explicit local development override", async () => {
    const request = new Request("http://localhost/api/admin/interviews", { headers: { "x-local-admin": "1" } });
    await expect(requireAdmin(request, env)).resolves.toBe("local-editor");
  });

  it("rejects a spoofed identity header when Access is not configured", async () => {
    const request = new Request("https://beenhere.arr2018.dpdns.org/api/admin/interviews", {
      headers: { "cf-access-authenticated-user-email": "attacker@example.com" },
    });
    await expect(requireAdmin(request, env)).rejects.toMatchObject({
      status: 503,
      code: "admin_auth_not_configured",
    });
  });
});
