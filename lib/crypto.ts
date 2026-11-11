import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

function parseKey(hex: string, name: string): Buffer {
  if (!/^[0-9a-f]{64}$/i.test(hex)) {
    throw new Error(`${name} doit contenir 64 caractères hexadécimaux (openssl rand -hex 32)`);
  }
  return Buffer.from(hex, "hex");
}
const key = () => parseKey(process.env.ENCRYPTION_KEY ?? "", "ENCRYPTION_KEY");

/** Chiffrement AES-256-GCM des secrets (tokens OAuth). Format : iv.tag.data (base64). */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
}

function decryptWith(k: Buffer, iv: Buffer, tag: Buffer, data: Buffer): string {
  const d = createDecipheriv("aes-256-gcm", k, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString("utf8");
}

/**
 * Rotation de clé : définir ENCRYPTION_KEY (nouvelle) et ENCRYPTION_KEY_PREVIOUS (ancienne) ;
 * les anciens secrets restent lisibles et sont rechiffrés avec la nouvelle clé à la prochaine écriture.
 */
export function decrypt(payload: string): string {
  const parts = payload.split(".");
  if (parts.length !== 3) throw new Error("Secret chiffré invalide");
  const [iv, tag, data] = parts.map((p) => Buffer.from(p, "base64"));
  if (iv.length !== 12 || tag.length !== 16) throw new Error("Secret chiffré invalide");
  try {
    return decryptWith(key(), iv, tag, data);
  } catch (e) {
    const prev = process.env.ENCRYPTION_KEY_PREVIOUS;
    if (!prev) throw e;
    return decryptWith(parseKey(prev, "ENCRYPTION_KEY_PREVIOUS"), iv, tag, data);
  }
}

export const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
export const randomToken = () => randomBytes(32).toString("base64url");

/** Comparaison de secrets à temps constant. */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}
