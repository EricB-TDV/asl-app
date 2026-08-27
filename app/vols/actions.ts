"use server";

import { db } from "@/db";
import { vols } from "@/db/schema";
import { volUnitaireSchema, volSerieSchema } from "@/lib/validation";
import { verifierVolSansPassagers } from "@/lib/rules";
import { eq } from "drizzle-orm";
import { safeRevalidatePath as revalidatePath } from "@/lib/safe-revalidate";
import { randomUUID } from "crypto";

export async function creerVolUnitaire(formData: FormData) {
  const parsed = volUnitaireSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { coutVolHt, taxes, ...reste } = parsed.data;
  await db.insert(vols).values({
    ...reste,
    coutVolHt: String(coutVolHt),
    taxes: String(taxes),
  });
  revalidatePath("/vols");
  return { ok: true };
}

/**
 * 4.1 — Création en série sur une plage de dates. Le jour de la semaine
 * n'est pas fixe : il est déduit de la date du premier vol saisie par
 * l'administrateur. Un vol est créé chaque semaine (même jour) jusqu'à la
 * date de fin incluse.
 *
 * Le numéro de vol est répliqué automatiquement sur toute la série pour les
 * vols "aller". Pour les vols "retour", il diffère d'une occurrence à
 * l'autre : il est donc laissé vide (à saisir vol par vol après création),
 * sauf si l'administrateur en a tout de même fourni un, auquel cas il est
 * répliqué de la même façon (l'administrateur reste libre de le modifier
 * ensuite vol par vol).
 */
export async function creerVolsEnSerie(formData: FormData) {
  const parsed = volSerieSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  const dateDebut = new Date(data.datePremierVol);
  const dateFin = new Date(data.dateFin);

  if (dateFin < dateDebut) {
    return { error: "La date de fin doit être postérieure à la date du premier vol." };
  }

  const serieId = randomUUID();
  const lignes: (typeof vols.$inferInsert)[] = [];

  for (
    let d = new Date(dateDebut);
    d <= dateFin;
    d.setDate(d.getDate() + 7) // même récurrence hebdomadaire que la date initiale
  ) {
    const dateIso = d.toISOString().slice(0, 10);
    lignes.push({
      numeroVol: data.numeroVol,
      aeroportDepart: data.aeroportDepart,
      aeroportArrivee: data.aeroportArrivee,
      dateDepart: dateIso,
      dateArrivee: dateIso,
      nbSieges: data.nbSieges,
      coutVolHt: String(data.coutVolHt),
      taxes: String(data.taxes),
      sens: data.sens,
      serieId,
    });
  }

  if (lignes.length === 0) {
    return { error: "Aucune date générée sur la plage indiquée." };
  }

  await db.insert(vols).values(lignes);
  revalidatePath("/vols");
  return { ok: true, nbCrees: lignes.length };
}

export async function modifierVol(id: number, formData: FormData) {
  const parsed = volUnitaireSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { coutVolHt, taxes, ...reste } = parsed.data;
  await db
    .update(vols)
    .set({ ...reste, coutVolHt: String(coutVolHt), taxes: String(taxes) })
    .where(eq(vols.id, id));
  revalidatePath("/vols");
  return { ok: true };
}

export async function supprimerVol(id: number) {
  const controle = await verifierVolSansPassagers(id);
  if (!controle.ok) return { error: controle.message };

  await db.delete(vols).where(eq(vols.id, id));
  revalidatePath("/vols");
  return { ok: true };
}
