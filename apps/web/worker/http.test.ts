import { describe, expect, it } from "vitest";
import { requireIdentity } from "./http";
import type { Env } from "./types";

const productionEnv = { APP_ENV: "production", SITE_URL: "https://beenhere.arr2018.dpdns.org" } as Env;
const developmentEnv = { ...productionEnv, APP_ENV: "development" } as Env;

describe("account authentication", () => {
  it("allows an explicit local identity", async () => {
    const request = new Request("http://localhost/api/account/me", { headers: { "x-local-user-email": "owner@example.com" } });
    await expect(requireIdentity(request, developmentEnv)).resolves.toBe("owner@example.com");
  });

  it("rejects a spoofed identity header when Access is not configured", async () => {
    const request = new Request("https://beenhere.arr2018.dpdns.org/api/account/me", {
      headers: { "cf-access-authenticated-user-email": "attacker@example.com" },
    });
    await expect(requireIdentity(request, productionEnv)).rejects.toMatchObject({
      status: 503,
      code: "account_auth_not_configured",
    });
  });

  it("rejects the local development header in production", async () => {
    const request = new Request("http://localhost/api/account/me", { headers: { "x-local-user-email": "attacker@example.com" } });
    await expect(requireIdentity(request, productionEnv)).rejects.toMatchObject({ status: 503 });
  });
});
