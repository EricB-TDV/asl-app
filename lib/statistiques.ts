import { db } from "@/db";
import { passagers, assignations, vols } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

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
 */
export async function calculerStatistiquesConsolidees(): Promise<{
  lignes: LigneStatistiqueVol[];
  totalOccupes: number;
  totalLibres: number;
  totalSieges: number;
  totalVentesHt: number;
  tauxRemplissageGlobal: number;
}> {
  const tousLesVols = await db.select().from(vols).orderBy(desc(vols.dateDepart));

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

  const occupesParVol = new Map<number, number>();
  const ventesParVol = new Map<number, number>();
  for (const v of ventesBrutes) {
    occupesParVol.set(v.volId, (occupesParVol.get(v.volId) ?? 0) + 1);
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
    const occupes = occupesParVol.get(v.id) ?? 0;
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
