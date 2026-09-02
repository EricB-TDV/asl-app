"use server";

import { db } from "@/db";
import { parametresFinanciers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { safeRevalidatePath as revalidatePath } from "@/lib/safe-revalidate";
import { calculerVentesCumuleesADate } from "@/lib/statistiques";

export type ParametresActionState = { error?: string; ok?: boolean };

async function assurerLigneExiste() {
  const [existante] = await db
    .select()
    .from(parametresFinanciers)
    .where(eq(parametresFinanciers.id, 1));
  if (!existante) {
    await db.insert(parametresFinanciers).values({ id: 1 });
  }
}

/** Enregistre les 5 valeurs initiales du bilan financier. */
export async function enregistrerValeursInitiales(
  _prevState: ParametresActionState,
  formData: FormData
): Promise<ParametresActionState> {
  const champs = [
    "coutsAsl",
    "revisionCarburant",
    "apportMauritanie",
    "fraisAdministratifs",
    "fraisAeroportMauritanie",
  ] as const;

  const valeurs: Record<string, string | null> = {};
  for (const champ of champs) {
    const brut = formData.get(champ);
    valeurs[champ] = brut !== null && String(brut).trim() !== "" ? String(Number(brut)) : null;
  }

  await assurerLigneExiste();
  await db
    .update(parametresFinanciers)
    .set({ ...valeurs, updatedAt: new Date() })
    .where(eq(parametresFinanciers.id, 1));

  revalidatePath("/statistiques");
  return { ok: true };
}

/** Enregistre les dates de début/fin de saison (colonnes du bilan mensuel). */
export async function enregistrerSaison(
  _prevState: ParametresActionState,
  formData: FormData
): Promise<ParametresActionState> {
  const saisonDebut = String(formData.get("saisonDebut") ?? "").trim();
  const saisonFin = String(formData.get("saisonFin") ?? "").trim();

  if (!saisonDebut || !saisonFin) {
    return { error: "Les deux dates (début et fin de saison) sont requises." };
  }
  if (saisonFin < saisonDebut) {
    return { error: "La date de fin de saison doit être postérieure à la date de début." };
  }

  await assurerLigneExiste();
  await db
    .update(parametresFinanciers)
    .set({ saisonDebut, saisonFin, updatedAt: new Date() })
    .where(eq(parametresFinanciers.id, 1));

  revalidatePath("/statistiques");
  return { ok: true };
}

export type CalculDateState = { error?: string; montant?: number; date?: string };

/** Calcule les ventes cumulées à une date choisie par l'utilisateur ("Calculer à une date"). */
export async function calculerADate(
  _prevState: CalculDateState,
  formData: FormData
): Promise<CalculDateState> {
  const date = String(formData.get("date") ?? "").trim();
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "Date invalide." };
  }
  const montant = await calculerVentesCumuleesADate(date);
  return { montant, date };
}
