import { db } from "@/db";
import { vols, entreprises, assignations, passagers } from "@/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import AssignationForm from "./AssignationForm";
import TableAssignations, { LigneAssignationAffichage } from "./TableAssignations";
import { isoVersDdmmyyyy } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function StocksPage() {
  const listeVols = await db.select().from(vols).orderBy(asc(vols.dateDepart));
  const listeEntreprises = await db.select().from(entreprises).orderBy(entreprises.nom);

  const optionsVols = listeVols.map((v) => ({
    id: v.id,
    label: `${isoVersDdmmyyyy(v.dateDepart)} — ${v.numeroVol} — ${v.aeroportDepart} → ${v.aeroportArrivee} (${v.nbSieges} sièges)`,
  }));
  const optionsEntreprises = listeEntreprises.map((e) => ({ id: e.id, label: e.nom }));

  // Modification 3 : appariement des vols aller/retour par date de départ,
  // affichés en deux colonnes côte à côte plutôt qu'en une seule liste
  // chronologique mêlant les deux sens.
  const vols_aller = listeVols.filter((v) => v.sens === "aller");
  const vols_retour = listeVols.filter((v) => v.sens === "retour");
  const toutesLesDates = Array.from(
    new Set([...vols_aller.map((v) => v.dateDepart), ...vols_retour.map((v) => v.dateDepart)])
  ).sort();

  const paires = toutesLesDates.map((date) => ({
    date,
    aller: vols_aller.find((v) => v.dateDepart === date) ?? null,
    retour: vols_retour.find((v) => v.dateDepart === date) ?? null,
  }));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-1">Stocks / assignations</h1>
        <p className="text-sm text-slate-500">
          Attribution de contingents de sièges (engagement / free sale) aux entreprises clientes.
          Cliquez sur le nom d&apos;une entreprise dans un tableau pour modifier son contingent.
        </p>
      </div>

      <AssignationForm vols={optionsVols} entreprises={optionsEntreprises} />

      <div className="space-y-6">
        {paires.map((paire) => (
          <div key={paire.date} className="grid md:grid-cols-2 gap-4">
            <div>{paire.aller ? <VolStock volId={paire.aller.id} /> : <CaseVide />}</div>
            <div>{paire.retour ? <VolStock volId={paire.retour.id} /> : <CaseVide />}</div>
          </div>
        ))}
        {paires.length === 0 && (
          <p className="text-center text-slate-400 py-6">Aucun vol pour le moment.</p>
        )}
      </div>
    </div>
  );
}

function CaseVide() {
  return (
    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-lg p-4 text-sm text-slate-400 flex items-center justify-center h-full">
      Aucun vol à cette date
    </div>
  );
}

async function VolStock({ volId }: { volId: number }) {
  const [vol] = await db.select().from(vols).where(eq(vols.id, volId));

  const lignesBrutes = await db
    .select({
      assignationId: assignations.id,
      entrepriseId: assignations.entrepriseId,
      entrepriseNom: entreprises.nom,
      nbEngagementTotal: assignations.nbEngagementTotal,
      nbFreeSaleTotal: assignations.nbFreeSaleTotal,
      prixEngagementHt: assignations.prixEngagementHt,
      taxesEngagement: assignations.taxesEngagement,
      prixFreeSaleHt: assignations.prixFreeSaleHt,
      taxesFreeSale: assignations.taxesFreeSale,
    })
    .from(assignations)
    .innerJoin(entreprises, eq(assignations.entrepriseId, entreprises.id))
    .where(eq(assignations.volId, volId));

  const occupesParEntreprise = await db
    .select({
      entrepriseId: passagers.entrepriseId,
      typeSiege: passagers.typeSiege,
      nb: sql<number>`count(*)`,
    })
    .from(passagers)
    .where(eq(passagers.volId, volId))
    .groupBy(passagers.entrepriseId, passagers.typeSiege);

  const mapOccupesEngagement = new Map<number, number>();
  const mapOccupesFreeSale = new Map<number, number>();
  for (const o of occupesParEntreprise) {
    if (o.typeSiege === "Engagement") {
      mapOccupesEngagement.set(o.entrepriseId, Number(o.nb));
    } else {
      mapOccupesFreeSale.set(o.entrepriseId, Number(o.nb));
    }
  }

  const lignes: LigneAssignationAffichage[] = lignesBrutes.map((l) => ({
    assignationId: l.assignationId,
    entrepriseNom: l.entrepriseNom,
    nbEngagementTotal: l.nbEngagementTotal,
    nbFreeSaleTotal: l.nbFreeSaleTotal,
    occupesEngagement: mapOccupesEngagement.get(l.entrepriseId) ?? 0,
    occupesFreeSale: mapOccupesFreeSale.get(l.entrepriseId) ?? 0,
    prixEngagementHt: l.prixEngagementHt,
    taxesEngagement: l.taxesEngagement,
    prixFreeSaleHt: l.prixFreeSaleHt,
    taxesFreeSale: l.taxesFreeSale,
  }));

  const [{ occupes }] = await db
    .select({ occupes: sql<number>`count(*)` })
    .from(passagers)
    .where(eq(passagers.volId, volId));

  const totalAttribue = lignes.reduce(
    (acc, l) => acc + l.nbEngagementTotal + l.nbFreeSaleTotal,
    0
  );

  const volEntete = `${isoVersDdmmyyyy(vol.dateDepart)} — ${vol.numeroVol} — ${vol.aeroportDepart} → ${vol.aeroportArrivee}`;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 h-full">
      <div className="flex justify-between items-baseline mb-2 gap-2 flex-wrap">
        <h3 className="font-semibold text-sm">{volEntete}</h3>
        <span className="text-xs text-slate-500">
          {Number(occupes)}/{vol.nbSieges} · Restants : {vol.nbSieges - totalAttribue}
        </span>
      </div>
      <TableAssignations volEntete={volEntete} lignes={lignes} />
    </div>
  );
}
