import bcrypt from "bcryptjs";
import { z } from "zod";

export const hashPassword = (p: string) => bcrypt.hash(p, 12);
export const verifyPassword = (p: string, h: string) => bcrypt.compare(p, h);

export const passwordSchema = z
  .string()
  .min(10, "10 caractères minimum")
  .regex(/[A-Z]/, "Au moins une majuscule")
  .regex(/[a-z]/, "Au moins une minuscule")
  .regex(/[0-9]/, "Au moins un chiffre");

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email invalide"),
  password: passwordSchema,
  consent: z.literal("on", { error: "Le consentement est obligatoire" }),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});
