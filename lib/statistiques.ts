import { db } from "@/db";
import { passagers, assignations, vols } from "@/db/schema";
import { eq, and, asc, sql } from "drizzle-orm";

export type LigneStatistiqueVol = {
  volId: number;
  flightDate: string;
  originCode: string;
  destinationCode: string;
  nbSeatsOccupied: number;
  nbSeatsFree: number;
  nbSeatsTotal: number;
  tauxRemplissage: number;
  salesHt: number;
};

/**
 * 9. Statistiques — calcul par vol (une ligne par vol, aller et retour
 * confondus), avec pour chacun : sièges occupés, sièges libres, total,
 * taux de remplissage et ventes HT (toutes entreprises confondues).
 *
 * Règle métier : les sièges en engagement sont considérés comme "consommés"
 * dès lors qu'ils sont attribués à une entreprise (contingent payé,
 * indépendamment du nombre de passagers réellement enregistrés dessus). Le
 * nombre de sièges occupés d'un vol est donc :
 *   (somme des contingents engagement attribués sur ce vol)
 *   + (nombre de passagers réellement enregistrés en free-sale sur ce vol)
 * Les sièges free-sale, eux, ne sont comptés que s'ils sont effectivement
 * utilisés par un passager enregistré.
 */
export async function calculerStatistiquesConsolidees(): Promise<{
  lignes: LigneStatistiqueVol[];
  totalOccupes: number;
  totalLibres: number;
  totalSieges: number;
  totalVentesHt: number;
  tauxRemplissageGlobal: number;
}> {
  const tousLesVols = await db.select().from(vols).orderBy(asc(vols.dateDepart));

  // Sièges engagement attribués (consommés), toutes entreprises confondues, par vol.
  const engagementAttribue = await db
    .select({
      volId: assignations.volId,
      total: sql<number>`coalesce(sum(${assignations.nbEngagementTotal}), 0)`,
    })
    .from(assignations)
    .groupBy(assignations.volId);
  const engagementParVol = new Map(engagementAttribue.map((e) => [e.volId, Number(e.total)]));

  // Sièges free-sale réellement occupés (passagers effectivement enregistrés), par vol.
  const freeSaleOccupe = await db
    .select({
      volId: passagers.volId,
      nb: sql<number>`count(*)`,
    })
    .from(passagers)
    .where(eq(passagers.typeSiege, "Free-sale"))
    .groupBy(passagers.volId);
  const freeSaleParVol = new Map(freeSaleOccupe.map((f) => [f.volId, Number(f.nb)]));

  // Ventes HT : basées sur les passagers réellement enregistrés (engagement et
  // free-sale), au prix défini dans l'assignation correspondante.
  const ventesBrutes = await db
    .select({
      volId: passagers.volId,
      typeSiege: passagers.typeSiege,
      prixEngagementHt: assignations.prixEngagementHt,
      prixFreeSaleHt: assignations.prixFreeSaleHt,
    })
    .from(passagers)
    .leftJoin(
      assignations,
      and(
        eq(assignations.volId, passagers.volId),
        eq(assignations.entrepriseId, passagers.entrepriseId)
      )
    );

  const ventesParVol = new Map<number, number>();
  for (const v of ventesBrutes) {
    const prix =
      v.typeSiege === "Engagement"
        ? v.prixEngagementHt
          ? Number(v.prixEngagementHt)
          : 0
        : v.prixFreeSaleHt
          ? Number(v.prixFreeSaleHt)
          : 0;
    ventesParVol.set(v.volId, (ventesParVol.get(v.volId) ?? 0) + prix);
  }

  const lignes: LigneStatistiqueVol[] = tousLesVols.map((v) => {
    const occupes = (engagementParVol.get(v.id) ?? 0) + (freeSaleParVol.get(v.id) ?? 0);
    const libres = v.nbSieges - occupes;
    return {
      volId: v.id,
      flightDate: v.dateDepart,
      originCode: v.aeroportDepart,
      destinationCode: v.aeroportArrivee,
      nbSeatsOccupied: occupes,
      nbSeatsFree: libres,
      nbSeatsTotal: v.nbSieges,
      tauxRemplissage: v.nbSieges > 0 ? occupes / v.nbSieges : 0,
      salesHt: ventesParVol.get(v.id) ?? 0,
    };
  });

  const totalOccupes = lignes.reduce((s, l) => s + l.nbSeatsOccupied, 0);
  const totalLibres = lignes.reduce((s, l) => s + l.nbSeatsFree, 0);
  const totalSieges = lignes.reduce((s, l) => s + l.nbSeatsTotal, 0);
  const totalVentesHt = lignes.reduce((s, l) => s + l.salesHt, 0);
  const tauxRemplissageGlobal = totalSieges > 0 ? totalOccupes / totalSieges : 0;

  return { lignes, totalOccupes, totalLibres, totalSieges, totalVentesHt, tauxRemplissageGlobal };
}
