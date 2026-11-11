import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { SMTPServer } from "smtp-server";
import { simpleParser } from "mailparser";
import type { AddressInfo } from "node:net";

const received: Awaited<ReturnType<typeof simpleParser>>[] = [];
let server: SMTPServer;

beforeAll(async () => {
  server = new SMTPServer({
    authOptional: true, disabledCommands: ["STARTTLS"],
    onData(stream, _s, cb) { simpleParser(stream).then((m) => { received.push(m); cb(); }); },
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  process.env.MAIL_HOST_OVERRIDE = "127.0.0.1";
  process.env.MAIL_PORT_OVERRIDE = String((server.server.address() as AddressInfo).port);
});
afterAll(() => server.close());

describe("envoi SMTP (serveur fictif local)", () => {
  it("envoie depuis l'adresse de l'étudiant", async () => {
    const { sendMail, verifyAccount } = await import("@/services/mailer");
    await verifyAccount("GMAIL", "camille@gmail.com", "x");
    await sendMail({ provider: "GMAIL", address: "camille@gmail.com", password: "x", to: "rh@exemple.fr", subject: "Candidature – test", text: "Bonjour,\nTest.", fromName: "Camille Dupont" });
    expect(received).toHaveLength(1);
    expect(received[0].from?.value[0].address).toBe("camille@gmail.com");
    expect(received[0].to).toMatchObject({ value: [{ address: "rh@exemple.fr" }] });
    expect(received[0].subject).toBe("Candidature – test");
  });
  it("traduit les erreurs sans fuite d'identifiants", async () => {
    const { friendlyMailError } = await import("@/services/mailer");
    expect(friendlyMailError(new Error("Invalid login: 535 secret-pass"))).not.toContain("secret-pass");
    expect(friendlyMailError(new Error("connect ECONNREFUSED"))).toMatch(/injoignable/);
  });
});
