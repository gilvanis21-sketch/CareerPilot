import { describe, expect, it } from "vitest";
import { canSend, type SendCheck } from "@/services/send-guard";

const ok: SendCheck = { status: "A_VALIDER", validatedAt: new Date(), confirmed: true, recipient: "rh@exemple.fr", sentToday: 0, dailyLimit: 10, hasAccount: true, hasMessage: true, alreadySent: false };
const why = (o: Partial<SendCheck>) => { const r = canSend({ ...ok, ...o }); return r.ok ? "OK" : r.reason; };

describe("garde d'envoi (validation humaine obligatoire)", () => {
  it("autorise un envoi validé et confirmé", () => expect(why({})).toBe("OK"));
  it("refuse sans validation", () => expect(why({ validatedAt: null })).toMatch(/valider/));
  it("refuse sans confirmation explicite", () => expect(why({ confirmed: false })).toMatch(/Confirmation/));
  it("refuse sans destinataire ou avec un destinataire invalide", () => {
    expect(why({ recipient: null })).toMatch(/destinataire/);
    expect(why({ recipient: "pas-un-email" })).toMatch(/destinataire/);
  });
  it("refuse sans messagerie connectée", () => expect(why({ hasAccount: false })).toMatch(/messagerie/));
  it("respecte le plafond quotidien", () => {
    expect(why({ sentToday: 10 })).toMatch(/Plafond/);
    expect(why({ sentToday: 9 })).toBe("OK");
  });
  it("empêche le double envoi mais autorise la relance", () => {
    expect(why({ status: "ENVOYEE" })).toMatch(/déjà/);
    expect(why({ status: "ENVOYEE", alreadySent: true })).toBe("OK");
    expect(why({ status: "BROUILLON", alreadySent: true })).toMatch(/Relance impossible/);
  });
});
