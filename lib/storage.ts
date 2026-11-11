import "server-only";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Stockage privé (hors /public). Un fichier n'est servi que via une route authentifiée.
const ROOT = path.resolve(process.cwd(), "storage", "resumes");

export async function saveResume(userId: string, buf: Buffer, ext: string) {
  const rel = path.join(userId, `${randomUUID()}${ext}`);
  const abs = path.join(ROOT, rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, buf, { mode: 0o600 });
  return rel;
}
export const readResume = (rel: string) => readFile(path.join(ROOT, rel));
export const deleteResume = (rel: string) => rm(path.join(ROOT, rel), { force: true });
export const deleteUserFiles = (userId: string) => rm(path.join(ROOT, userId), { recursive: true, force: true });
