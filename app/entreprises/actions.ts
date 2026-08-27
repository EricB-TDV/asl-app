"use server";

import { db } from "@/db";
import { entreprises, assignations, passagers } from "@/db/schema";
import { entrepriseSchema } from "@/lib/validation";
import { eq, sql } from "drizzle-orm";
import { safeRevalidatePath as revalidatePath } from "@/lib/safe-revalidate";

export async function creerEntreprise(formData: FormData) {
  const parsed = entrepriseSchema.safeParse({ nom: formData.get("nom") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  await db.insert(entreprises).values(parsed.data);
  revalidatePath("/entreprises");
  return { ok: true };
}

export async function modifierEntreprise(id: number, formData: FormData) {
  const parsed = entrepriseSchema.safeParse({ nom: formData.get("nom") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  await db.update(entreprises).set(parsed.data).where(eq(entreprises.id, id));
  revalidatePath("/entreprises");
  return { ok: true };
}

export async function supprimerEntreprise(id: number) {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(passagers)
    .where(eq(passagers.entrepriseId, id));

  if (Number(count) > 0) {
    return {
      error: `Suppression impossible : ${count} passager(s) rattaché(s) à cette entreprise existent encore.`,
    };
  }

  await db.delete(assignations).where(eq(assignations.entrepriseId, id));
  await db.delete(entreprises).where(eq(entreprises.id, id));
  revalidatePath("/entreprises");
  return { ok: true };
}
