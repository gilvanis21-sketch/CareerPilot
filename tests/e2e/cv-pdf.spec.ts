import { test, expect } from "@playwright/test";
import path from "node:path";

// Régression : sur un build de production, l'analyse d'un CV PDF échouait ("Setting up fake worker failed").
test("import et analyse d'un CV au format PDF", async ({ page }) => {
  const email = `pdf-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "Motdepasse-solide-42");
  await page.check('input[name="consent"]');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/dashboard/);

  await page.goto("/cv");
  await page.setInputFiles('input[name="cv"]', path.join(__dirname, "../fixtures/cv-fictif.pdf"));
  await page.click("text=Importer et analyser");
  await expect(page.getByText(/technologies détectées/)).toBeVisible();
  await expect(page.getByText(/fake worker|Cannot find module/)).toHaveCount(0);
});
