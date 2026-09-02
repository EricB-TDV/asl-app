"use server";

import { db } from "@/db";
import { assignations } from "@/db/schema";
import { assignationSchema } from "@/lib/validation";
import { verifierContingentDisponible, verifierPassagersDejaEnregistres } from "@/lib/rules";
import { and, eq } from "drizzle-orm";
import { safeRevalidatePath as revalidatePath } from "@/lib/safe-revalidate";

/**
 * 5.2 — Créer/écraser une assignation pour une entreprise sur un ou
 * plusieurs vols. Si plusieurs vols sont sélectionnés ("tous les vols"), le
 * même nombre de sièges est appliqué à l'identique sur chacun.
 * Si une assignation existe déjà pour (vol, entreprise), elle est écrasée.
 */
export async function creerOuModifierAssignation(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const volIds = formData.getAll("volIds").map(Number);
  const parsed = assignationSchema.safeParse({ ...raw, volIds });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  // On vérifie chaque vol AVANT d'écrire quoi que ce soit (tout ou rien).
  for (const volId of data.volIds) {
    const [existante] = await db
      .select()
      .from(assignations)
      .where(and(eq(assignations.volId, volId), eq(assignations.entrepriseId, data.entrepriseId)));

    const controleContingent = await verifierContingentDisponible({
      volId,
      nbEngagementDemande: data.nbEngagementTotal,
      nbFreeSaleDemande: data.nbFreeSaleTotal,
      excludeAssignationId: existante?.id,
    });
    if (!controleContingent.ok) {
      return { error: `Vol #${volId} : ${controleContingent.message}` };
    }

    if (existante) {
      const controlePassagers = await verifierPassagersDejaEnregistres({
        volId,
        entrepriseId: data.entrepriseId,
        nbEngagementDemande: data.nbEngagementTotal,
        nbFreeSaleDemande: data.nbFreeSaleTotal,
      });
      if (!controlePassagers.ok) {
        return { error: `Vol #${volId} : ${controlePassagers.message}` };
      }
    }
  }

  for (const volId of data.volIds) {
    const [existante] = await db
      .select()
      .from(assignations)
      .where(and(eq(assignations.volId, volId), eq(assignations.entrepriseId, data.entrepriseId)));

    const valeurs = {
      volId,
      entrepriseId: data.entrepriseId,
      nbEngagementTotal: data.nbEngagementTotal,
      nbFreeSaleTotal: data.nbFreeSaleTotal,
      prixEngagementHt: data.prixEngagementHt != null ? String(data.prixEngagementHt) : null,
      taxesEngagement: data.taxesEngagement != null ? String(data.taxesEngagement) : null,
      prixFreeSaleHt: data.prixFreeSaleHt != null ? String(data.prixFreeSaleHt) : null,
      taxesFreeSale: data.taxesFreeSale != null ? String(data.taxesFreeSale) : null,
      updatedAt: new Date(),
    };

    if (existante) {
      await db.update(assignations).set(valeurs).where(eq(assignations.id, existante.id));
    } else {
      await db.insert(assignations).values(valeurs);
    }
  }

  revalidatePath("/stocks");
  return { ok: true };
}

// Wrapper compatible avec useActionState (signature (prevState, formData)).
export type AssignationActionState = { error?: string; ok?: boolean };
export async function creerOuModifierAssignationAction(
  _prevState: AssignationActionState,
  formData: FormData
): Promise<AssignationActionState> {
  return creerOuModifierAssignation(formData);
}

/**
 * 2.4 (modification 1) — Modification rapide d'une assignation existante
 * depuis la fenêtre d'édition en surimpression du tableau : nombre de
 * sièges (engagement/free-sale) ET prix HT / taxes associés.
 */
export async function modifierMontantsAssignation(params: {
  assignationId: number;
  nbEngagementTotal: number;
  nbFreeSaleTotal: number;
  prixEngagementHt: number | null;
  taxesEngagement: number | null;
  prixFreeSaleHt: number | null;
  taxesFreeSale: number | null;
}): Promise<AssignationActionState> {
  const [existante] = await db
    .select()
    .from(assignations)
    .where(eq(assignations.id, params.assignationId));
  if (!existante) return { error: "Assignation introuvable." };

  const controleContingent = await verifierContingentDisponible({
    volId: existante.volId,
    nbEngagementDemande: params.nbEngagementTotal,
    nbFreeSaleDemande: params.nbFreeSaleTotal,
    excludeAssignationId: existante.id,
  });
  if (!controleContingent.ok) return { error: controleContingent.message };

  const controlePassagers = await verifierPassagersDejaEnregistres({
    volId: existante.volId,
    entrepriseId: existante.entrepriseId,
    nbEngagementDemande: params.nbEngagementTotal,
    nbFreeSaleDemande: params.nbFreeSaleTotal,
  });
  if (!controlePassagers.ok) return { error: controlePassagers.message };

  await db
    .update(assignations)
    .set({
      nbEngagementTotal: params.nbEngagementTotal,
      nbFreeSaleTotal: params.nbFreeSaleTotal,
      prixEngagementHt: params.prixEngagementHt != null ? String(params.prixEngagementHt) : null,
      taxesEngagement: params.taxesEngagement != null ? String(params.taxesEngagement) : null,
      prixFreeSaleHt: params.prixFreeSaleHt != null ? String(params.prixFreeSaleHt) : null,
      taxesFreeSale: params.taxesFreeSale != null ? String(params.taxesFreeSale) : null,
      updatedAt: new Date(),
    })
    .where(eq(assignations.id, params.assignationId));

  revalidatePath("/stocks");
  return { ok: true };
}
