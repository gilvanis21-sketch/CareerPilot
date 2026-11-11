/** Règles de garde AVANT tout envoi. Fonction pure, entièrement testée. */
export interface SendCheck {
  status: string;
  validatedAt: Date | null;
  confirmed: boolean; // case "je confirme l'envoi" cochée dans la requête
  recipient: string | null;
  sentToday: number;
  dailyLimit: number;
  hasAccount: boolean;
  hasMessage: boolean;
  alreadySent: boolean; // true = relance d'une candidature déjà envoyée
}
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function canSend(c: SendCheck): { ok: true } | { ok: false; reason: string } {
  if (!c.hasMessage) return { ok: false, reason: "Aucun message à envoyer." };
  if (!c.hasAccount) return { ok: false, reason: "Connectez d'abord votre messagerie (Paramètres)." };
  if (!c.recipient || !EMAIL.test(c.recipient)) return { ok: false, reason: "Adresse du destinataire manquante ou invalide (saisie par vous, jamais devinée)." };
  if (!c.validatedAt) return { ok: false, reason: "Vous devez d'abord valider la candidature." };
  if (!c.confirmed) return { ok: false, reason: "Confirmation explicite requise." };
  const allowed = c.alreadySent ? ["ENVOYEE", "EN_ATTENTE", "RELANCE_NECESSAIRE"] : ["BROUILLON", "A_VALIDER"];
  if (!allowed.includes(c.status)) return { ok: false, reason: c.alreadySent ? "Relance impossible dans ce statut." : "Cette candidature a déjà été envoyée." };
  if (c.sentToday >= c.dailyLimit) return { ok: false, reason: `Plafond quotidien atteint (${c.dailyLimit}).` };
  return { ok: true };
}
