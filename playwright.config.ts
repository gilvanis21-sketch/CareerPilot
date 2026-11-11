import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  workers: 1,
  expect: { timeout: 15_000 }, // compilation à froid du serveur de dev
  use: { baseURL: "http://localhost:3111" },
  // Les e-mails partent vers un serveur SMTP fictif local (démarré par le test), jamais vers un vrai fournisseur.
  webServer: {
    command: "npm run build && npx next start -p 3111", // build de production : plus fiable que le serveur de dev
    url: "http://localhost:3111/login",
    reuseExistingServer: false,
    timeout: 600_000,
    env: { MAIL_HOST_OVERRIDE: "127.0.0.1", MAIL_PORT_OVERRIDE: "2525", ALLOW_MAIL_OVERRIDE: "I_AM_RUNNING_TESTS" },
  },
});
