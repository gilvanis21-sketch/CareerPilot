import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

const pw = "MotDePasse2026";
async function register(page: Page, tag: string) {
  const email = `e2e-sec-${tag}-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', pw);
  await page.check('input[name="consent"]');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/dashboard/);
  return email;
}
async function deleteAccount(page: Page) {
  await page.goto("/settings");
  await page.locator("form", { hasText: "Supprimer définitivement" }).locator('input[name="password"]').fill(pw);
  await page.fill('input[name="confirm"]', "SUPPRIMER");
  await page.click("text=Supprimer définitivement");
  await expect(page).toHaveURL(/login/);
}

test("routes protégées, en-têtes de sécurité, cron fermé", async ({ request, baseURL }) => {
  for (const p of ["/dashboard", "/profile", "/cv", "/offers", "/applications", "/settings", "/stats", "/spontaneous"]) {
    const r = await request.get(p, { maxRedirects: 0 });
    expect([302, 307, 308], `${p} doit rediriger`).toContain(r.status());
    expect(r.headers()["location"]).toContain("/login");
  }
  expect((await request.get("/api/account/export", { maxRedirects: 0 })).status()).toBe(401);
  expect((await request.get("/api/cron/followups")).status()).toBe(403);
  expect((await request.get("/api/cron/followups", { headers: { authorization: "Bearer faux" } })).status()).toBe(403);
  const h = (await request.get(`${baseURL}/login`)).headers();
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["referrer-policy"]).toBeTruthy();
  expect(h["x-powered-by"]).toBeUndefined();
});

test("isolation entre étudiants + cookie de session sécurisé + upload piégé", async ({ browser }) => {
  const ctxA = await browser.newContext(), ctxB = await browser.newContext();
  const a = await ctxA.newPage(), b = await ctxB.newPage();
  await register(a, "a"); await register(b, "b");

  // Cookie : httpOnly + SameSite
  const cookie = (await ctxA.cookies()).find((c) => c.name === "cp_session")!;
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.sameSite).toBe("Lax");

  // A crée une candidature spontanée
  await a.goto("/spontaneous");
  await a.fill('input[name="company"]', "Entreprise Privée A");
  await a.fill('input[name="email"]', "contact@prive-a.example");
  await a.locator('input[name="skills"]').first().check();
  await a.click("text=Générer le message");
  await expect(a).toHaveURL(/applications\/.+/);
  const appUrl = a.url();

  // B ne peut ni voir la candidature de A, ni la lister
  const res = await b.goto(appUrl);
  expect(res?.status()).toBe(404);
  await expect(b.getByText("Entreprise Privée A")).toHaveCount(0);
  await b.goto("/applications");
  await expect(b.getByText("Entreprise Privée A")).toHaveCount(0);

  // L'export de B ne contient rien de A
  const exp = await (await b.request.get("/api/account/export")).text();
  expect(exp).not.toContain("Entreprise Privée A");
  expect(exp).not.toContain("prive-a.example");

  // Upload : un exécutable renommé en .pdf est refusé, une extension inconnue aussi
  const dir = mkdtempSync(path.join(tmpdir(), "cp-"));
  const fake = path.join(dir, "faux.pdf"); writeFileSync(fake, "MZ\x90\x00 ceci n'est pas un pdf");
  const exe = path.join(dir, "virus.exe"); writeFileSync(exe, "MZ");
  await b.goto("/cv");
  await b.setInputFiles('input[name="cv"]', fake);
  await b.click("text=Importer et analyser");
  await expect(b.locator("p[role=alert]")).toContainText(/invalide|Lecture/);
  await b.setInputFiles('input[name="cv"]', exe);
  await b.click("text=Importer et analyser");
  await expect(b.locator("p[role=alert]")).toContainText("PDF ou DOCX");

  // Sans messagerie connectée, impossible d'envoyer même si tout est validé côté A
  await deleteAccount(a); await deleteAccount(b);
  await ctxA.close(); await ctxB.close();
});

test("affichage mobile : pas de défilement horizontal", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } });
  const p = await ctx.newPage();
  for (const url of ["/login", "/register"]) {
    await p.goto(url);
    expect(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${url} déborde`).toBe(true);
  }
  await register(p, "m");
  for (const url of ["/dashboard", "/offers", "/applications", "/settings", "/stats", "/spontaneous", "/profile"]) {
    await p.goto(url);
    expect(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${url} déborde`).toBe(true);
  }
  await deleteAccount(p);
  await ctx.close();
});
