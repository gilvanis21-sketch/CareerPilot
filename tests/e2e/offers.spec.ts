import { expect, test } from "@playwright/test";
import path from "node:path";


// Attend la fin réelle de l'action serveur (sinon on pourrait vérifier/supprimer pendant la synchronisation).
const sync = (page: import("@playwright/test").Page) =>
  Promise.all([page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/offers")), page.click("text=Actualiser les offres")]);

const email = `e2e-offers-${Date.now()}@example.com`;
const pw = "MotDePasse2026";

test("recherche, classement, filtres, favoris, brouillon (offres fictives)", async ({ page }) => {
  await page.goto("/register");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', pw);
  await page.check('input[name="consent"]');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/dashboard/);

  await page.goto("/cv");
  await page.setInputFiles('input[name="cv"]', path.join(__dirname, "../fixtures/cv-fictif.docx"));
  await page.click("text=Importer et analyser");
  await expect(page.getByText(/technologies détectées/)).toBeVisible();

  await page.goto("/offers");
  await sync(page);
  await expect(page.locator("article")).toHaveCount(20);
  await expect(page.getByText("sur 20 collectée(s)")).toBeVisible();

  // Classement : une offre de développement en alternance en tête, une offre hors domaine pas dans le top 5
  const titles = await page.locator("article a.font-semibold").allTextContents();
  expect(titles.slice(0, 5).join(" ")).toMatch(/Développeur|Data/);
  expect(titles.slice(0, 5).join(" ")).not.toMatch(/cuisinier|Infirmier|comptable/i);

  // Deuxième synchronisation : pas de doublons
  await sync(page);
  await expect(page.getByText("sur 20 collectée(s)")).toBeVisible();
  await expect(page.locator("article")).toHaveCount(20); // toujours 20 : aucun doublon créé

  // Filtre contrat
  await page.selectOption('select[name="contract"]', "CDI");
  await page.click("text=Filtrer");
  await expect(page.locator("article")).toHaveCount(2);

  // Favori
  await page.goto("/offers?q=Data+Analyst");
  await page.click("text=Ajouter aux favoris");
  await expect(page.getByText("Favori", { exact: true })).toBeVisible();
  await page.goto("/offers?fav=1");
  await expect(page.locator("article")).toHaveCount(1);

  // Détail : score, compétences correspondantes et manquantes
  await page.click("article a.font-semibold");
  await expect(page.getByText(/Compatibilité : \d+\/100/)).toBeVisible();
  await expect(page.getByText("Compétences correspondantes")).toBeVisible();

  // Préparer : un brouillon, aucun envoi
  await page.click("text=Préparer ma candidature");
  await expect(page).toHaveURL(/applications/);
  await expect(page.locator("span", { hasText: /^Brouillon$/ })).toBeVisible();

  // Tendances du marché : affichées, avec avertissement sur les données fictives et seuil d'anonymat
  await page.goto("/stats");
  await expect(page.getByRole("heading", { name: "Tendances du marché" })).toBeVisible();
  await expect(page.getByText(/offres sont fictives/)).toBeVisible();
  await expect(page.getByText(/Pas encore assez de candidatures/)).toBeVisible();

  // Nettoyage
  await page.goto("/settings");
  await page.locator("form", { hasText: "Supprimer définitivement" }).locator('input[name="password"]').fill(pw);
  await page.fill('input[name="confirm"]', "SUPPRIMER");
  await page.click("text=Supprimer définitivement");
  await expect(page).toHaveURL(/login/);
});
