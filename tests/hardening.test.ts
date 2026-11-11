import { beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { startOfDay } from "@/lib/dates";
import { findInventedSkills } from "@/ai/generate";

beforeAll(() => { process.env.ENCRYPTION_KEY = "0123456789abcdef".repeat(4); });

describe("startOfDay (Europe/Paris)", () => {
  it("hiver : minuit = 23h UTC la veille", () => {
    expect(startOfDay(new Date("2026-01-15T10:00:00Z")).toISOString()).toBe("2026-01-14T23:00:00.000Z");
  });
  it("été : minuit = 22h UTC la veille", () => {
    expect(startOfDay(new Date("2026-07-15T10:00:00Z")).toISOString()).toBe("2026-07-14T22:00:00.000Z");
  });
  it("juste après minuit heure de Paris", () => {
    expect(startOfDay(new Date("2026-01-14T23:30:00Z")).toISOString()).toBe("2026-01-14T23:00:00.000Z");
  });
});

describe("rotation de clé et validation", () => {
  it("relit un secret chiffré avec l'ancienne clé", async () => {
    const { encrypt, decrypt } = await import("@/lib/crypto");
    const old = process.env.ENCRYPTION_KEY!;
    const c = encrypt("secret");
    process.env.ENCRYPTION_KEY = "fedcba9876543210".repeat(4);
    expect(() => decrypt(c)).toThrow();
    process.env.ENCRYPTION_KEY_PREVIOUS = old;
    expect(decrypt(c)).toBe("secret");
    delete process.env.ENCRYPTION_KEY_PREVIOUS;
    process.env.ENCRYPTION_KEY = old;
  });
  it("refuse un format invalide", async () => {
    const { decrypt } = await import("@/lib/crypto");
    expect(() => decrypt("n'importe quoi")).toThrow("invalide");
  });
  it("safeEqual", async () => {
    const { safeEqual } = await import("@/lib/crypto");
    expect(safeEqual("Bearer a", "Bearer a")).toBe(true);
    expect(safeEqual("Bearer a", "Bearer b")).toBe(false);
  });
});

describe("garde-fou anti-invention", () => {
  it("« motivé » ne suffit plus à excuser une techno demandée", () => {
    expect(findInventedSkills("Je maîtrise Kubernetes, très motivé.", [], ["Kubernetes"])).toContain("Kubernetes");
    expect(findInventedSkills("Je n'ai pas encore pratiqué Kubernetes.", [], ["Kubernetes"])).toEqual([]);
  });
});
