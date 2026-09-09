"use server";

import { db } from "@/db";
import { entreprises, assignations, passagers } from "@/db/schema";
import { entrepriseSchema } from "@/lib/validation";
import { eq, sql } from "drizzle-orm";
import { safeRevalidatePath as revalidatePath } from "@/lib/safe-revalidate";

function lireChampsFormulaire(formData: FormData) {
  return {
    nom: formData.get("nom"),
    code3Lettres: formData.get("code3Lettres"),
    // Champs optionnels : formData.get() renvoie null si le champ est absent
    // du formulaire, or le schéma Zod optionnel n'accepte que undefined/"".
    adresse: formData.get("adresse") ?? undefined,
    codePostal: formData.get("codePostal") ?? undefined,
    ville: formData.get("ville") ?? undefined,
    pays: formData.get("pays") ?? undefined,
    numeroSiren: formData.get("numeroSiren") ?? undefined,
    numeroTvaIntracommunautaire: formData.get("numeroTvaIntracommunautaire") ?? undefined,
    identifiantFacturationElectronique:
      formData.get("identifiantFacturationElectronique") ?? undefined,
  };
}

export async function creerEntreprise(formData: FormData) {
  const parsed = entrepriseSchema.safeParse(lireChampsFormulaire(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const data = parsed.data;
  await db.insert(entreprises).values({
    nom: data.nom,
    code3Lettres: data.code3Lettres,
    adresse: data.adresse || null,
    codePostal: data.codePostal || null,
    ville: data.ville || null,
    pays: data.pays || null,
    numeroSiren: data.numeroSiren ? Number(data.numeroSiren) : null,
    numeroTvaIntracommunautaire: data.numeroTvaIntracommunautaire || null,
    identifiantFacturationElectronique: data.identifiantFacturationElectronique || null,
  });
  revalidatePath("/entreprises");
  return { ok: true };
}

export async function modifierEntreprise(id: number, formData: FormData) {
  const parsed = entrepriseSchema.safeParse(lireChampsFormulaire(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const data = parsed.data;
  await db
    .update(entreprises)
    .set({
      nom: data.nom,
      code3Lettres: data.code3Lettres,
      adresse: data.adresse || null,
      codePostal: data.codePostal || null,
      ville: data.ville || null,
      pays: data.pays || null,
      numeroSiren: data.numeroSiren ? Number(data.numeroSiren) : null,
      numeroTvaIntracommunautaire: data.numeroTvaIntracommunautaire || null,
      identifiantFacturationElectronique: data.identifiantFacturationElectronique || null,
    })
    .where(eq(entreprises.id, id));
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
