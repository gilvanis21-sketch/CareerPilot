import { expect, test } from "@playwright/test";
import { SMTPServer } from "smtp-server";
import { simpleParser, type ParsedMail } from "mailparser";
import path from "node:path";

const email = `e2e-send-${Date.now()}@example.com`;
const pw = "MotDePasse2026";
const inbox: ParsedMail[] = [];
let smtp: SMTPServer;

test.beforeAll(async () => {
  smtp = new SMTPServer({ authOptional: true, disabledCommands: ["STARTTLS"], onData(s, _x, cb) { simpleParser(s).then((m) => { inbox.push(m); cb(); }); } });
  await new Promise<void>((r) => smtp.listen(2525, "127.0.0.1", r));
});
test.afterAll(() => smtp.close());

test("candidature spontanée : génération, validation obligatoire, envoi, suivi, dashboard", async ({ page }) => {
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

  // Connexion de la messagerie (serveur fictif)
  await page.goto("/settings");
  await page.getByText("Autre méthode : mot de passe d’application").click(); // section repliée par défaut (OAuth2 en premier)
  const form = page.locator("form", { hasText: "Connecter et vérifier" });
  await form.locator('input[name="address"]').fill("camille.test@gmail.com");
  await form.locator('input[name="password"]').fill("abcd efgh ijkl mnop");
  await form.getByRole("button", { name: "Connecter et vérifier" }).click();
  await expect(page.getByText("Messagerie connectée")).toBeVisible();

  // Spontanée
  await page.goto("/spontaneous");
  await page.fill('input[name="company"]', "Banque Fictive");
  await page.fill('input[name="sector"]', "banque");
  await page.click("text=Suggérer selon le secteur");
  await expect(page.locator('input[name="skills"]:checked').first()).toBeVisible();
  await page.fill('input[name="email"]', "recrutement@banque-fictive.example");
  await page.click("text=Générer le message");
  await expect(page).toHaveURL(/applications\/.+/);
  await expect(page.locator('textarea[name="body"]')).toContainText("Camille Dupont");

  // Sans validation : envoi impossible
  await expect(page.getByRole("button", { name: "Envoyer la candidature" })).toBeDisabled();

  // Modification, puis validation
  await page.locator('textarea[name="body"]').fill("Bonjour,\n\nMessage de test relu par l'étudiant (Python, SQL).\n\nCordialement,\nCamille Dupont");
  await page.click("text=Enregistrer les modifications");
  await expect(page.getByText("Enregistré")).toBeVisible();
  await page.click("text=Valider ce message");
  await expect(page.getByText("Validée ✓")).toBeVisible();

  // Sans confirmation explicite : refus côté serveur
  await page.getByRole("button", { name: "Envoyer la candidature" }).click();
  await expect(page.getByText("Confirmation explicite requise")).toBeVisible();
  expect(inbox).toHaveLength(0);

  // Avec confirmation : envoi
  await page.check('input[name="confirm"]');
  await page.getByRole("button", { name: "Envoyer la candidature" }).click();
  await expect(page.getByText("Candidature envoyée depuis votre messagerie")).toBeVisible();
  await expect.poll(() => inbox.length).toBe(1);
  expect(inbox[0].from?.value[0].address).toBe("camille.test@gmail.com");
  expect(inbox[0].to).toMatchObject({ value: [{ address: "recrutement@banque-fictive.example" }] });
  expect(inbox[0].text).toContain("Message de test relu");

  // Pas de double envoi
  await page.reload();
  await expect(page.getByText("Envoyée", { exact: true }).first()).toBeVisible();
  await expect(page.locator("text=Relance J+7")).toBeVisible();
  await expect(page.locator("text=Relance J+15")).toBeVisible();

  // Suivi : entretien proposé → dashboard
  await page.selectOption('select[name="status"]', "ENTRETIEN");
  await page.click("text=Mettre à jour");
  await expect(page.locator("span", { hasText: /^Entretien proposé$/ })).toBeVisible();
  await page.goto("/dashboard");
  const tile = (label: string) => page.getByText(label, { exact: true }).locator("xpath=following-sibling::p[1]");
  await expect(tile("Candidatures envoyées")).toHaveText("1");
  await expect(tile("Entretiens")).toHaveText("1");
  await expect(tile("Taux de réponse")).toHaveText("100 %");

  // Nettoyage
  await page.goto("/settings");
  await page.locator("form", { hasText: "Supprimer définitivement" }).locator('input[name="password"]').fill(pw);
  await page.fill('input[name="confirm"]', "SUPPRIMER");
  await page.click("text=Supprimer définitivement");
  await expect(page).toHaveURL(/login/);
});
