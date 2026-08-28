import { db } from "@/db";
import { assignations, passagers, vols } from "@/db/schema";
import { and, eq, ne, sql } from "drizzle-orm";

/**
 * 5.3 — Anti-surbooking : le total des sièges attribués (engagement + free
 * sale, toutes entreprises confondues) sur un vol ne peut jamais dépasser le
 * nombre total de sièges du vol.
 *
 * `excludeAssignationId` permet, en cas de modification d'une assignation
 * existante, d'exclure son ancienne valeur du total avant de tester la
 * nouvelle.
 */
export async function verifierContingentDisponible(params: {
  volId: number;
  nbEngagementDemande: number;
  nbFreeSaleDemande: number;
  excludeAssignationId?: number;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const [vol] = await db.select().from(vols).where(eq(vols.id, params.volId));
  if (!vol) return { ok: false, message: "Vol introuvable." };

  const conditions = [eq(assignations.volId, params.volId)];
  if (params.excludeAssignationId) {
    conditions.push(ne(assignations.id, params.excludeAssignationId));
  }

  const [totaux] = await db
    .select({
      totalEngagement: sql<number>`coalesce(sum(${assignations.nbEngagementTotal}), 0)`,
      totalFreeSale: sql<number>`coalesce(sum(${assignations.nbFreeSaleTotal}), 0)`,
    })
    .from(assignations)
    .where(and(...conditions));

  const totalActuel = Number(totaux.totalEngagement) + Number(totaux.totalFreeSale);
  const totalDemande =
    totalActuel + params.nbEngagementDemande + params.nbFreeSaleDemande;

  if (totalDemande > vol.nbSieges) {
    const restants = vol.nbSieges - totalActuel;
    return {
      ok: false,
      message: `Contingent dépassé : il ne reste que ${restants} siège(s) disponible(s) sur ce vol (${vol.nbSieges} au total, ${totalActuel} déjà attribué(s)).`,
    };
  }
  return { ok: true };
}

/**
 * 5.2, commentaire 4 — si l'entreprise a déjà plus de passagers enregistrés
 * sur le vol que ne le permettrait la nouvelle assignation, la modification
 * est refusée.
 */
export async function verifierPassagersDejaEnregistres(params: {
  volId: number;
  entrepriseId: number;
  nbEngagementDemande: number;
  nbFreeSaleDemande: number;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const [comptage] = await db
    .select({
      nbEngagement: sql<number>`coalesce(sum(case when ${passagers.typeSiege} = 'Engagement' then 1 else 0 end), 0)`,
      nbFreeSale: sql<number>`coalesce(sum(case when ${passagers.typeSiege} = 'Free-sale' then 1 else 0 end), 0)`,
    })
    .from(passagers)
    .where(
      and(eq(passagers.volId, params.volId), eq(passagers.entrepriseId, params.entrepriseId))
    );

  const nbEngagementEnregistres = Number(comptage.nbEngagement);
  const nbFreeSaleEnregistres = Number(comptage.nbFreeSale);

  if (
    nbEngagementEnregistres > params.nbEngagementDemande ||
    nbFreeSaleEnregistres > params.nbFreeSaleDemande
  ) {
    return {
      ok: false,
      message: `Modification impossible : cette entreprise a déjà ${nbEngagementEnregistres} passager(s) en engagement et ${nbFreeSaleEnregistres} en free-sale enregistrés sur ce vol, soit plus que le nouveau contingent proposé.`,
    };
  }
  return { ok: true };
}

/**
 * 5.3 / 6. — avant d'enregistrer un ou plusieurs passagers (saisie manuelle
 * ou import CSV) pour une entreprise sur un vol, vérifie que le contingent
 * assigné à cette entreprise sur ce vol n'est pas dépassé.
 */
export async function verifierContingentEntreprisePourAjoutPassagers(params: {
  volId: number;
  entrepriseId: number;
  nbEngagementAAjouter: number;
  nbFreeSaleAAjouter: number;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const [assignation] = await db
    .select()
    .from(assignations)
    .where(
      and(
        eq(assignations.volId, params.volId),
        eq(assignations.entrepriseId, params.entrepriseId)
      )
    );

  if (!assignation) {
    return {
      ok: false,
      message: "Aucun contingent n'est assigné à cette entreprise sur ce vol.",
    };
  }

  const [comptage] = await db
    .select({
      nbEngagement: sql<number>`coalesce(sum(case when ${passagers.typeSiege} = 'Engagement' then 1 else 0 end), 0)`,
      nbFreeSale: sql<number>`coalesce(sum(case when ${passagers.typeSiege} = 'Free-sale' then 1 else 0 end), 0)`,
    })
    .from(passagers)
    .where(
      and(eq(passagers.volId, params.volId), eq(passagers.entrepriseId, params.entrepriseId))
    );

  const engagementApres = Number(comptage.nbEngagement) + params.nbEngagementAAjouter;
  const freeSaleApres = Number(comptage.nbFreeSale) + params.nbFreeSaleAAjouter;

  if (engagementApres > assignation.nbEngagementTotal) {
    return {
      ok: false,
      message: `Contingent engagement dépassé : ${assignation.nbEngagementTotal} siège(s) attribué(s), ${engagementApres} demandé(s) au total.`,
    };
  }
  if (freeSaleApres > assignation.nbFreeSaleTotal) {
    return {
      ok: false,
      message: `Contingent free-sale dépassé : ${assignation.nbFreeSaleTotal} siège(s) attribué(s), ${freeSaleApres} demandé(s) au total.`,
    };
  }
  return { ok: true };
}

/**
 * 4.2, commentaire 3 — un vol ne peut être supprimé s'il a des passagers
 * enregistrés.
 */
export async function verifierVolSansPassagers(
  volId: number
): Promise<{ ok: true } | { ok: false; message: string }> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(passagers)
    .where(eq(passagers.volId, volId));

  if (Number(count) > 0) {
    return {
      ok: false,
      message: "Des passagers sont enregistrés sur ce vol, les supprimer avant de supprimer le vol.",
    };
  }
  return { ok: true };
}
