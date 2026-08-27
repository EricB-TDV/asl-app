"use server";

import { db } from "@/db";
import { utilisateurs } from "@/db/schema";
import { utilisateurCreationSchema, utilisateurModificationSchema } from "@/lib/validation";
import { hashPassword, getSession } from "@/lib/auth";
import { eq, sql, ne, and } from "drizzle-orm";
import { safeRevalidatePath as revalidatePath } from "@/lib/safe-revalidate";

export type UtilisateurActionState = { error?: string; ok?: boolean };

export async function creerUtilisateur(formData: FormData): Promise<UtilisateurActionState> {
  const parsed = utilisateurCreationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { nom, email, motDePasse } = parsed.data;

  const [existant] = await db.select().from(utilisateurs).where(eq(utilisateurs.email, email));
  if (existant) {
    return { error: "Un compte existe déjà avec cet email." };
  }

  const motDePasseHash = await hashPassword(motDePasse);
  await db.insert(utilisateurs).values({ nom, email, motDePasseHash });

  revalidatePath("/utilisateurs");
  return { ok: true };
}

export async function creerUtilisateurAction(
  _prevState: UtilisateurActionState,
  formData: FormData
): Promise<UtilisateurActionState> {
  return creerUtilisateur(formData);
}

export async function modifierUtilisateur(
  id: number,
  formData: FormData
): Promise<UtilisateurActionState> {
  const parsed = utilisateurModificationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { nom, email, motDePasse } = parsed.data;

  const [autre] = await db
    .select()
    .from(utilisateurs)
    .where(and(eq(utilisateurs.email, email), ne(utilisateurs.id, id)));
  if (autre) {
    return { error: "Un autre compte utilise déjà cet email." };
  }

  const valeurs: Partial<typeof utilisateurs.$inferInsert> = { nom, email };
  if (motDePasse) {
    valeurs.motDePasseHash = await hashPassword(motDePasse);
  }

  await db.update(utilisateurs).set(valeurs).where(eq(utilisateurs.id, id));
  revalidatePath("/utilisateurs");
  return { ok: true };
}

export async function modifierUtilisateurAction(
  id: number,
  _prevState: UtilisateurActionState,
  formData: FormData
): Promise<UtilisateurActionState> {
  return modifierUtilisateur(id, formData);
}

export async function supprimerUtilisateur(id: number) {
  let session = null;
  try {
    session = await getSession();
  } catch {
    // hors contexte requête (script) : on considère qu'il n'y a pas de session active
  }
  if (session?.userId === id) {
    return { error: "Vous ne pouvez pas supprimer votre propre compte pendant que vous êtes connecté." };
  }

  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(utilisateurs);
  if (Number(total) <= 1) {
    return { error: "Impossible de supprimer le dernier compte administrateur restant." };
  }

  await db.delete(utilisateurs).where(eq(utilisateurs.id, id));
  revalidatePath("/utilisateurs");
  return { ok: true };
}
