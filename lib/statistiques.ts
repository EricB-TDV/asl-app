import { db } from "@/db";
import { entreprises, passagers, assignations, vols } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export type LigneStatistique = {
  entrepriseId: number;
  entrepriseNom: string;
  nbEngagement: number;
  nbFreeSale: number;
  ventesHt: number;
};

/**
 * 9. Statistiques — vue unique consolidée sur l'ensemble des vols (aller +
 * retour confondus), sans filtre vol/client : agrégat par entreprise sur
 * toute la base, plus un taux de remplissage global.
 */
export async function calculerStatistiquesConsolidees(): Promise<{
  lignes: LigneStatistique[];
  totalEngagement: number;
  totalFreeSale: number;
  totalVentesHt: number;
  totalSiegesDisponibles: number;
  tauxRemplissage: number;
}> {
  const lignesBrutes = await db
    .select({
      entrepriseId: entreprises.id,
      entrepriseNom: entreprises.nom,
      typeSiege: passagers.typeSiege,
      prixEngagementHt: assignations.prixEngagementHt,
      prixFreeSaleHt: assignations.prixFreeSaleHt,
    })
    .from(passagers)
    .innerJoin(entreprises, eq(passagers.entrepriseId, entreprises.id))
    .leftJoin(
      assignations,
      and(
        eq(assignations.volId, passagers.volId),
        eq(assignations.entrepriseId, passagers.entrepriseId)
      )
    );

  const parEntreprise = new Map<number, LigneStatistique>();

  for (const l of lignesBrutes) {
    if (!parEntreprise.has(l.entrepriseId)) {
      parEntreprise.set(l.entrepriseId, {
        entrepriseId: l.entrepriseId,
        entrepriseNom: l.entrepriseNom,
        nbEngagement: 0,
        nbFreeSale: 0,
        ventesHt: 0,
      });
    }
    const ligne = parEntreprise.get(l.entrepriseId)!;
    if (l.typeSiege === "Engagement") {
      ligne.nbEngagement += 1;
      ligne.ventesHt += l.prixEngagementHt ? Number(l.prixEngagementHt) : 0;
    } else {
      ligne.nbFreeSale += 1;
      ligne.ventesHt += l.prixFreeSaleHt ? Number(l.prixFreeSaleHt) : 0;
    }
  }

  const lignes = Array.from(parEntreprise.values()).sort((a, b) =>
    a.entrepriseNom.localeCompare(b.entrepriseNom)
  );

  const totalEngagement = lignes.reduce((s, l) => s + l.nbEngagement, 0);
  const totalFreeSale = lignes.reduce((s, l) => s + l.nbFreeSale, 0);
  const totalVentesHt = lignes.reduce((s, l) => s + l.ventesHt, 0);

  const [{ totalSieges }] = await db
    .select({ totalSieges: sql<number>`coalesce(sum(${vols.nbSieges}), 0)` })
    .from(vols);

  const totalSiegesDisponibles = Number(totalSieges);
  const totalOccupes = totalEngagement + totalFreeSale;
  const tauxRemplissage = totalSiegesDisponibles > 0 ? totalOccupes / totalSiegesDisponibles : 0;

  return {
    lignes,
    totalEngagement,
    totalFreeSale,
    totalVentesHt,
    totalSiegesDisponibles,
    tauxRemplissage,
  };
}
