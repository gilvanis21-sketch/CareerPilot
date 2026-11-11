/** Limiteur en mémoire (suffisant en mono-instance ; à remplacer par Redis en multi-instance). */
const hits = new Map<string, { t: number[]; windowMs: number }>();

function sweep(now: number) {
  for (const [k, v] of hits) if (!v.t.some((x) => now - x < v.windowMs)) hits.delete(k);
}

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  if (hits.size > 5000) sweep(now); // évite la croissance illimitée de la table
  const arr = (hits.get(key)?.t ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { hits.set(key, { t: arr, windowMs }); return false; }
  arr.push(now); hits.set(key, { t: arr, windowMs }); return true;
}
