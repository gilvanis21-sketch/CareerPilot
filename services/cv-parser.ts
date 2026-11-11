/**
 * Analyse LÉGÈRE d'un CV (règles + dictionnaires). Principe : on n'extrait que ce qui est
 * littéralement présent dans le texte. Aucune compétence n'est déduite ni inventée.
 */

export const TECH_DICTIONARY = [
  "JavaScript", "TypeScript", "Python", "Java", "C#", "C++", "PHP", "SQL", "PostgreSQL", "MySQL", "MongoDB",
  "React", "Next.js", "Node.js", "Vue.js", "Angular", "Django", "FastAPI", "Flask", "Laravel", "Symfony",
  "Docker", "Kubernetes", "Git", "GitHub", "GitLab", "Linux", "Windows Server", "Active Directory",
  "AWS", "Azure", "GCP", "Terraform", "Ansible", "Cisco", "VMware", "Proxmox",
  "HTML", "CSS", "Tailwind", "Figma", "Power BI", "Excel", "Tableau", "Pandas", "Scikit-learn",
  "TensorFlow", "PyTorch", "LLM", "RAG", "OpenAI", "Cybersécurité", "Pentest", "Wireshark", "Nmap",
  "Scrum", "Agile", "Jira", "ITIL", "Bash", "PowerShell", "REST", "GraphQL", "CI/CD",
];

const LANGUAGES = ["Français", "Anglais", "Espagnol", "Allemand", "Italien", "Arabe", "Portugais", "Chinois"];

export interface ParsedResume {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  formation: string | null;
  studyYear: "B1" | "B2" | "B3" | "B4" | null;
  skills: string[];
  languages: string[];
  experiences: { title: string; description?: string }[];
  education: string[];
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function findTerms(text: string, terms: string[]): string[] {
  return terms.filter((t) => new RegExp(`(?<![\\p{L}\\d])${esc(t)}(?![\\p{L}\\d])`, "iu").test(text));
}

function section(lines: string[], names: RegExp): string[] {
  const start = lines.findIndex((l) => names.test(l.trim()) && l.trim().length < 40);
  if (start < 0) return [];
  const out: string[] = [];
  for (const l of lines.slice(start + 1)) {
    if (/^[A-ZÉÈÀ][A-ZÉÈÀ\s'’&-]{3,30}$/.test(l.trim())) break; // titre de section suivant (MAJUSCULES)
    if (l.trim()) out.push(l.trim());
  }
  return out;
}

export function parseResumeText(raw: string): ParsedResume {
  const text = raw.replace(/\r/g, "");
  const lines = text.split("\n").map((l) => l.trim());
  const nonEmpty = lines.filter(Boolean);

  const email = text.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/)?.[0] ?? null;
  const phone = text.match(/(?:\+33|0033|0)\s?[1-9](?:[\s.-]?\d{2}){4}/)?.[0]?.trim() ?? null;

  // Nom : première ligne plausible (2-3 mots alphabétiques, sans @ ni chiffres)
  let firstName: string | null = null;
  let lastName: string | null = null;
  const nameLine = nonEmpty.slice(0, 5).find((l) => /^[\p{L}'’-]+(\s[\p{L}'’-]+){1,2}$/u.test(l) && !/curriculum|cv|resume|résumé/i.test(l));
  if (nameLine) {
    const parts = nameLine.split(/\s+/);
    firstName = parts[0];
    lastName = parts.slice(1).join(" ");
  }

  const yearMatch = text.match(/\bB\s?([1-4])\b|\bBachelor\s*([1-4])\b|\b([1-4])(?:ère|ème|e|re)?\s*ann[ée]e\b/i);
  const yn = yearMatch && (yearMatch[1] ?? yearMatch[2] ?? yearMatch[3]);
  const studyYear = yn ? (`B${yn}` as ParsedResume["studyYear"]) : null;

  const formationLine = nonEmpty.find((l) => /bachelor|licence|master|BTS|BUT|DUT|ing[ée]nieur|aivancity|CCCLX/i.test(l)) ?? null;

  const education = section(lines, /^(formation|formations|[ée]ducation|[ée]tudes)$/i).slice(0, 6);
  const expLines = section(lines, /^(exp[ée]riences?( professionnelles?)?|stages?)$/i);
  const experiences = expLines.slice(0, 8).map((title) => ({ title }));

  return {
    firstName, lastName, email, phone,
    formation: formationLine,
    studyYear,
    skills: findTerms(text, TECH_DICTIONARY),
    languages: findTerms(text, LANGUAGES),
    experiences,
    education,
  };
}

/** Extraction de texte PDF / DOCX. Vérifie la signature du fichier (magic bytes), pas seulement l'extension. */
export async function extractText(buf: Buffer, mime: string): Promise<string> {
  if (mime === "application/pdf") {
    if (buf.subarray(0, 5).toString() !== "%PDF-") throw new Error("Fichier PDF invalide");
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buf) });
    try { return (await parser.getText()).text; } finally { await parser.destroy(); }
  }
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    if (buf[0] !== 0x50 || buf[1] !== 0x4b) throw new Error("Fichier DOCX invalide");
    const mammoth = await import("mammoth");
    return (await mammoth.extractRawText({ buffer: buf })).value;
  }
  throw new Error("Format non supporté (PDF ou DOCX uniquement)");
}
