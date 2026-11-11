import { expect, test } from "@playwright/test";
import path from "node:path";

const email = `e2e-${Date.now()}@example.com`;
const pw = "MotDePasse2026";

test("parcours étudiant complet (données fictives)", async ({ page }) => {
  // Inscription : refusée sans consentement (case required), puis acceptée
  await page.goto("/register");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', pw);
  await page.check('input[name="consent"]');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/dashboard/);

  // Import du CV
  await page.goto("/cv");
  await page.setInputFiles('input[name="cv"]', path.join(__dirname, "../fixtures/cv-fictif.docx"));
  await page.click("text=Importer et analyser");
  await expect(page.getByText(/technologies détectées/)).toBeVisible();

  // Profil pré-rempli mais modifiable
  await page.goto("/profile");
  await expect(page.locator('input[name="firstName"]')).toHaveValue("Camille");
  await expect(page.locator('select[name="studyYear"]')).toHaveValue("B3");
  await expect(page.locator('input[name="skills"]')).toHaveValue(/Python/);
  await page.selectOption('select[name="goal"]', "STAGE");
  await page.fill('input[name="locations"]', "Paris, Lyon");
  await page.click("text=Enregistrer");
  await expect(page.getByText("Profil enregistré")).toBeVisible();

  // Export RGPD
  const res = await page.request.get("/api/account/export");
  expect(res.status()).toBe(200);
  const json = await res.json();
  expect(json.email).toBe(email);
  expect(json.profile.goal).toBe("STAGE");

  // Déconnexion puis mauvaise / bonne connexion
  await page.click("text=Déconnexion");
  await expect(page).toHaveURL(/login/);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "mauvais");
  await page.click('button[type="submit"]');
  await expect(page.locator("p[role=alert]")).toContainText("incorrect");
  await page.fill('input[name="password"]', pw);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/dashboard/);

  // Suppression du compte
  await page.goto("/settings");
  await page.locator("form", { hasText: "Supprimer définitivement" }).locator('input[name="password"]').fill(pw);
  await page.fill('input[name="confirm"]', "SUPPRIMER");
  await page.click("text=Supprimer définitivement");
  await expect(page).toHaveURL(/login/);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', pw);
  await page.click('button[type="submit"]');
  await expect(page.locator("p[role=alert]")).toContainText("incorrect");
});
