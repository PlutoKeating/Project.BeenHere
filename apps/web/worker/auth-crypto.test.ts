import { describe, expect, it } from "vitest";
import { createOpaqueToken, hashOpaqueToken, hashPassword, verifyPassword } from "./auth-crypto";

describe("account credentials", () => {
  it("verifies only the password used to create a versioned credential", async () => {
    const credential = await hashPassword("correct horse battery staple");
    expect(credential).toMatch(/^pbkdf2-sha256\$100000\$/);
    await expect(verifyPassword("correct horse battery staple", credential)).resolves.toBe(true);
    await expect(verifyPassword("wrong password", credential)).resolves.toBe(false);
  });

  it("creates random opaque tokens and stores only deterministic hashes", async () => {
    const first = createOpaqueToken();
    const second = createOpaqueToken();
    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(40);
    await expect(hashOpaqueToken(first)).resolves.toBe(await hashOpaqueToken(first));
    await expect(hashOpaqueToken(first)).resolves.not.toBe(await hashOpaqueToken(second));
  });
});
