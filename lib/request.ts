import "server-only";
import { headers } from "next/headers";

/**
 * IP du client. `x-forwarded-for` est falsifiable : il n'est lu que si l'application est derrière un proxy
 * de confiance (TRUST_PROXY=1). On prend alors la dernière valeur, ajoutée par ce proxy, et non la première
 * (fournie par le client).
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  if (process.env.TRUST_PROXY === "1") {
    const parts = h.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts?.length) return parts[parts.length - 1];
  }
  return "local";
}
