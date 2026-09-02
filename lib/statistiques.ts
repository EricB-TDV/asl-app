import { db } from "@/db";
import { passagers, assignations, vols, parametresFinanciers, entreprises } from "@/db/schema";
import { eq, and, asc, sql, lte, inArray } from "drizzle-orm";

export type LigneStatistiqueVol = {
  volId: number;
  flightDate: string;
  originCode: string;
  destinationCode: string;
  nbSeatsEngaged: number;
  nbSeatsReal: number;
  nbSeatsFree: number;
  nbSeatsTotal: number;
  tauxRemplissage: number;
  salesHt: number;
};

/**
 * 9. / Modification 4-5 — Statistiques vue globale : calcul par vol (une
 * ligne par vol, aller et retour confondus).
 *
 * Règles :
 * - "Sièges engagés" = somme des contingents ENGAGEMENT attribués sur ce vol
 *   (toutes entreprises), considérés "consommés" dès attribution, PLUS le
 *   nombre de passagers réellement enregistrés en FREE-SALE sur ce vol.
 * - "Sièges occupés" (nouveau) = nombre RÉEL de passagers enregistrés sur ce
 *   vol, tous types de siège confondus (le décompte physique réel).
 * - "Ventes HT" = somme, pour chaque entreprise ayant un contingent sur ce
 *   vol, de (contingent engagement total × prix engagement HT) + (nombre de
 *   passagers réellement enregistrés en free-sale pour cette entreprise ×
 *   prix free-sale HT). L'engagement est facturé en totalité, qu'il soit
 *   utilisé ou non ; le free-sale n'est facturé qu'à l'usage réel.
 */
export async function calculerStatistiquesConsolidees(): Promise<{
  lignes: LigneStatistiqueVol[];
  totalEngages: number;
  totalReels: number;
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

  // Décompte réel (tous types confondus), par vol.
  const reelParVolBrut = await db
    .select({ volId: passagers.volId, nb: sql<number>`count(*)` })
    .from(passagers)
    .groupBy(passagers.volId);
  const reelParVol = new Map(reelParVolBrut.map((r) => [r.volId, Number(r.nb)]));

  // Ventes HT : engagement facturé en totalité (contingent × prix), free-sale
  // facturé à l'usage réel (passagers effectivement enregistrés × prix).
  const ventesEngagement = await db
    .select({
      volId: assignations.volId,
      montant: sql<number>`coalesce(sum(${assignations.nbEngagementTotal} * coalesce(${assignations.prixEngagementHt}, 0)), 0)`,
    })
    .from(assignations)
    .groupBy(assignations.volId);
  const ventesEngagementParVol = new Map(
    ventesEngagement.map((v) => [v.volId, Number(v.montant)])
  );

  const ventesFreeSaleBrutes = await db
    .select({
      volId: passagers.volId,
      prixFreeSaleHt: assignations.prixFreeSaleHt,
    })
    .from(passagers)
    .innerJoin(
      assignations,
      and(
        eq(assignations.volId, passagers.volId),
        eq(assignations.entrepriseId, passagers.entrepriseId)
      )
    )
    .where(eq(passagers.typeSiege, "Free-sale"));
  const ventesFreeSaleParVol = new Map<number, number>();
  for (const v of ventesFreeSaleBrutes) {
    const montant = v.prixFreeSaleHt ? Number(v.prixFreeSaleHt) : 0;
    ventesFreeSaleParVol.set(v.volId, (ventesFreeSaleParVol.get(v.volId) ?? 0) + montant);
  }

  const lignes: LigneStatistiqueVol[] = tousLesVols.map((v) => {
    const engages = (engagementParVol.get(v.id) ?? 0) + (freeSaleParVol.get(v.id) ?? 0);
    const reels = reelParVol.get(v.id) ?? 0;
    const libres = v.nbSieges - engages;
    const ventes = (ventesEngagementParVol.get(v.id) ?? 0) + (ventesFreeSaleParVol.get(v.id) ?? 0);
    return {
      volId: v.id,
      flightDate: v.dateDepart,
      originCode: v.aeroportDepart,
      destinationCode: v.aeroportArrivee,
      nbSeatsEngaged: engages,
      nbSeatsReal: reels,
      nbSeatsFree: libres,
      nbSeatsTotal: v.nbSieges,
      tauxRemplissage: v.nbSieges > 0 ? engages / v.nbSieges : 0,
      salesHt: ventes,
    };
  });

  const totalEngages = lignes.reduce((s, l) => s + l.nbSeatsEngaged, 0);
  const totalReels = lignes.reduce((s, l) => s + l.nbSeatsReal, 0);
  const totalLibres = lignes.reduce((s, l) => s + l.nbSeatsFree, 0);
  const totalSieges = lignes.reduce((s, l) => s + l.nbSeatsTotal, 0);
  const totalVentesHt = lignes.reduce((s, l) => s + l.salesHt, 0);
  const tauxRemplissageGlobal = totalSieges > 0 ? totalEngages / totalSieges : 0;

  return {
    lignes,
    totalEngages,
    totalReels,
    totalLibres,
    totalSieges,
    totalVentesHt,
    tauxRemplissageGlobal,
  };
}

// ---------------------------------------------------------------------------
// Modification 6 — Vues par entreprise (aller / retour côte à côte, une ligne
// par date), pour les deux indicateurs : "sièges engagés" et "sièges réels".
// ---------------------------------------------------------------------------

export type LigneVueEntreprise = {
  date: string;
  volId: number;
  engages: Record<string, number>; // clé = nom entreprise
  reels: Record<string, number>;
  totalEngages: number;
  totalReels: number;
  stock: number;
  resteEngages: number;
  resteReels: number;
  tauxEngages: number;
  tauxReels: number;
};

export type VueParDirection = {
  entreprises: string[];
  lignes: LigneVueEntreprise[];
};

async function calculerVuePourDirection(sens: "aller" | "retour"): Promise<VueParDirection> {
  const volsDirection = await db
    .select()
    .from(vols)
    .where(eq(vols.sens, sens))
    .orderBy(asc(vols.dateDepart));

  if (volsDirection.length === 0) return { entreprises: [], lignes: [] };

  const volIds = volsDirection.map((v) => v.id);

  const assignationsDirection = await db
    .select({
      volId: assignations.volId,
      entrepriseNom: entreprises.nom,
      entrepriseId: assignations.entrepriseId,
      nbEngagementTotal: assignations.nbEngagementTotal,
    })
    .from(assignations)
    .innerJoin(entreprises, eq(assignations.entrepriseId, entreprises.id))
    .where(inArray(assignations.volId, volIds));

  const passagersDirection = await db
    .select({
      volId: passagers.volId,
      entrepriseId: passagers.entrepriseId,
      typeSiege: passagers.typeSiege,
      nb: sql<number>`count(*)`,
    })
    .from(passagers)
    .where(inArray(passagers.volId, volIds))
    .groupBy(passagers.volId, passagers.entrepriseId, passagers.typeSiege);

  const entreprisesSet = new Set<string>();
  for (const a of assignationsDirection) entreprisesSet.add(a.entrepriseNom);
  const nomsEntreprises = Array.from(entreprisesSet).sort((a, b) => a.localeCompare(b));

  // occupesFreeSale[volId][entrepriseId] / occupesEngagement[volId][entrepriseId]
  const occupesFreeSale = new Map<string, number>();
  const occupesEngagement = new Map<string, number>();
  for (const p of passagersDirection) {
    const cle = `${p.volId}-${p.entrepriseId}`;
    if (p.typeSiege === "Free-sale") occupesFreeSale.set(cle, Number(p.nb));
    else occupesEngagement.set(cle, Number(p.nb));
  }

  const lignes: LigneVueEntreprise[] = volsDirection.map((v) => {
    const engages: Record<string, number> = {};
    const reels: Record<string, number> = {};
    for (const nom of nomsEntreprises) {
      engages[nom] = 0;
      reels[nom] = 0;
    }
    for (const a of assignationsDirection.filter((a) => a.volId === v.id)) {
      const cle = `${a.volId}-${a.entrepriseId}`;
      const fs = occupesFreeSale.get(cle) ?? 0;
      const eng = occupesEngagement.get(cle) ?? 0;
      engages[a.entrepriseNom] = a.nbEngagementTotal + fs;
      reels[a.entrepriseNom] = eng + fs;
    }
    const totalEngages = Object.values(engages).reduce((s, n) => s + n, 0);
    const totalReels = Object.values(reels).reduce((s, n) => s + n, 0);
    return {
      date: v.dateDepart,
      volId: v.id,
      engages,
      reels,
      totalEngages,
      totalReels,
      stock: v.nbSieges,
      resteEngages: v.nbSieges - totalEngages,
      resteReels: v.nbSieges - totalReels,
      tauxEngages: v.nbSieges > 0 ? totalEngages / v.nbSieges : 0,
      tauxReels: v.nbSieges > 0 ? totalReels / v.nbSieges : 0,
    };
  });

  return { entreprises: nomsEntreprises, lignes };
}

export async function calculerVuesParEntreprise(): Promise<{
  aller: VueParDirection;
  retour: VueParDirection;
}> {
  const [aller, retour] = await Promise.all([
    calculerVuePourDirection("aller"),
    calculerVuePourDirection("retour"),
  ]);
  return { aller, retour };
}

// ---------------------------------------------------------------------------
// Modification 7 — Bilan financier
// ---------------------------------------------------------------------------

export type ParametresFinanciersValeurs = {
  coutsAsl: number | null;
  revisionCarburant: number | null;
  apportMauritanie: number | null;
  fraisAdministratifs: number | null;
  fraisAeroportMauritanie: number | null;
  saisonDebut: string | null;
  saisonFin: string | null;
};

export async function lireParametresFinanciers(): Promise<ParametresFinanciersValeurs> {
  const [ligne] = await db.select().from(parametresFinanciers).where(eq(parametresFinanciers.id, 1));
  if (!ligne) {
    return {
      coutsAsl: null,
      revisionCarburant: null,
      apportMauritanie: null,
      fraisAdministratifs: null,
      fraisAeroportMauritanie: null,
      saisonDebut: null,
      saisonFin: null,
    };
  }
  return {
    coutsAsl: ligne.coutsAsl != null ? Number(ligne.coutsAsl) : null,
    revisionCarburant: ligne.revisionCarburant != null ? Number(ligne.revisionCarburant) : null,
    apportMauritanie: ligne.apportMauritanie != null ? Number(ligne.apportMauritanie) : null,
    fraisAdministratifs:
      ligne.fraisAdministratifs != null ? Number(ligne.fraisAdministratifs) : null,
    fraisAeroportMauritanie:
      ligne.fraisAeroportMauritanie != null ? Number(ligne.fraisAeroportMauritanie) : null,
    saisonDebut: ligne.saisonDebut,
    saisonFin: ligne.saisonFin,
  };
}

/**
 * Ventes réalisées cumulées à une date donnée (approximation validée avec
 * l'utilisateur : un contingent s'applique depuis sa date de création,
 * indépendamment de modifications ultérieures de sa valeur ; un passager
 * free-sale compte depuis sa date d'enregistrement réelle).
 */
export async function calculerVentesCumuleesADate(dateLimiteIso: string): Promise<number> {
  const finDeJournee = new Date(`${dateLimiteIso}T23:59:59.999Z`);

  const [engagementResult] = await db
    .select({
      montant: sql<number>`coalesce(sum(${assignations.nbEngagementTotal} * coalesce(${assignations.prixEngagementHt}, 0)), 0)`,
    })
    .from(assignations)
    .where(lte(assignations.createdAt, finDeJournee));
  const montantEngagement = Number(engagementResult.montant);

  const freeSaleBrutes = await db
    .select({ prixFreeSaleHt: assignations.prixFreeSaleHt })
    .from(passagers)
    .innerJoin(
      assignations,
      and(
        eq(assignations.volId, passagers.volId),
        eq(assignations.entrepriseId, passagers.entrepriseId)
      )
    )
    .where(and(eq(passagers.typeSiege, "Free-sale"), lte(passagers.createdAt, finDeJournee)));
  const montantFreeSale = freeSaleBrutes.reduce(
    (s, p) => s + (p.prixFreeSaleHt ? Number(p.prixFreeSaleHt) : 0),
    0
  );

  return montantEngagement + montantFreeSale;
}

/** Génère les dates de fin de mois entre deux dates (incluses), au format ISO. */
export function genererFinsDeMois(debutIso: string, finIso: string): string[] {
  const dates: string[] = [];
  const debut = new Date(debutIso + "T00:00:00Z");
  const fin = new Date(finIso + "T00:00:00Z");

  const curseur = new Date(Date.UTC(debut.getUTCFullYear(), debut.getUTCMonth(), 1));
  while (curseur <= fin) {
    const finDeMois = new Date(
      Date.UTC(curseur.getUTCFullYear(), curseur.getUTCMonth() + 1, 0)
    );
    if (finDeMois >= debut && finDeMois <= fin) {
      dates.push(finDeMois.toISOString().slice(0, 10));
    }
    curseur.setUTCMonth(curseur.getUTCMonth() + 1);
  }
  return dates;
}
