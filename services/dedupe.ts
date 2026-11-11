import { createHash } from "node:crypto";

export const normalize = (s?: string | null) =>
  (s ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/\b(h\/f|f\/h|m\/f|\(h\/f\)|\(f\/h\))\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ").trim();

const LEGAL = /\b(sas|sarl|sa|sasu|eurl|groupe|group|france)\b/g;

/** Clé de dédoublonnage inter-sources : titre + entreprise + ville normalisés. */
export function dedupeKey(title: string, company?: string | null, location?: string | null): string {
  const city = normalize(location).replace(/\b\d{2,5}\b/g, "").replace(/\s+/g, " ").trim().split(" ")[0] ?? "";
  const parts = [normalize(title), normalize(company).replace(LEGAL, "").replace(/\s+/g, " ").trim(), city];
  return createHash("sha1").update(parts.join("|")).digest("hex");
}
