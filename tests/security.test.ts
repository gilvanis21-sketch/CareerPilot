import { beforeAll, describe, expect, it } from "vitest";
import { registerSchema, hashPassword, verifyPassword } from "@/lib/auth/password";
import { rateLimit } from "@/lib/rate-limit";

beforeAll(() => { process.env.ENCRYPTION_KEY = "0123456789abcdef".repeat(4); });

describe("chiffrement AES-256-GCM", () => {
  it("chiffre/déchiffre et n'expose pas le clair", async () => {
    const { encrypt, decrypt } = await import("@/lib/crypto");
    const c = encrypt("token-oauth-secret");
    expect(c).not.toContain("token-oauth-secret");
    expect(decrypt(c)).toBe("token-oauth-secret");
  });
  it("détecte une altération", async () => {
    const { encrypt, decrypt } = await import("@/lib/crypto");
    const [iv, tag] = encrypt("x").split(".");
    expect(() => decrypt([iv, tag, Buffer.from("zz").toString("base64")].join("."))).toThrow();
  });
});

describe("mots de passe", () => {
  it("hache et vérifie", async () => {
    const h = await hashPassword("Motdepasse123");
    expect(h).not.toContain("Motdepasse123");
    expect(await verifyPassword("Motdepasse123", h)).toBe(true);
    expect(await verifyPassword("autre", h)).toBe(false);
  });
  it("refuse les mots de passe faibles et l'absence de consentement", () => {
    expect(registerSchema.safeParse({ email: "a@b.fr", password: "faible", consent: "on" }).success).toBe(false);
    expect(registerSchema.safeParse({ email: "a@b.fr", password: "Motdepasse123" }).success).toBe(false);
    expect(registerSchema.safeParse({ email: "A@B.fr", password: "Motdepasse123", consent: "on" }).success).toBe(true);
  });
});

describe("rate limit", () => {
  it("bloque après le seuil", () => {
    const r = Array.from({ length: 4 }, () => rateLimit("t", 3, 1000));
    expect(r).toEqual([true, true, true, false]);
  });
});
