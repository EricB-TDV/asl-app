import { db } from "@/db";
import { vols, entreprises, assignations, passagers } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import AssignationForm from "./AssignationForm";

export const dynamic = "force-dynamic";

export default async function StocksPage() {
  const listeVols = await db.select().from(vols).orderBy(desc(vols.dateDepart));
  const listeEntreprises = await db.select().from(entreprises).orderBy(entreprises.nom);

  const optionsVols = listeVols.map((v) => ({
    id: v.id,
    label: `${v.dateDepart} — ${v.numeroVol} — ${v.aeroportDepart} → ${v.aeroportArrivee} (${v.nbSieges} sièges)`,
  }));
  const optionsEntreprises = listeEntreprises.map((e) => ({ id: e.id, label: e.nom }));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-1">Stocks / assignations</h1>
        <p className="text-sm text-slate-500">
          Attribution de contingents de sièges (engagement / free sale) aux entreprises clientes.
        </p>
      </div>

      <AssignationForm vols={optionsVols} entreprises={optionsEntreprises} />

      <div className="space-y-6">
        {await Promise.all(listeVols.map((v) => <VolStock key={v.id} volId={v.id} />))}
      </div>
    </div>
  );
}

async function VolStock({ volId }: { volId: number }) {
  const [vol] = await db.select().from(vols).where(eq(vols.id, volId));
  const lignes = await db
    .select({
      entrepriseNom: entreprises.nom,
      nbEngagementTotal: assignations.nbEngagementTotal,
      nbFreeSaleTotal: assignations.nbFreeSaleTotal,
    })
    .from(assignations)
    .innerJoin(entreprises, eq(assignations.entrepriseId, entreprises.id))
    .where(eq(assignations.volId, volId));

  const [{ occupes }] = await db
    .select({ occupes: sql<number>`count(*)` })
    .from(passagers)
    .where(eq(passagers.volId, volId));

  const totalAttribue = lignes.reduce(
    (acc, l) => acc + l.nbEngagementTotal + l.nbFreeSaleTotal,
    0
  );

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex justify-between items-baseline mb-2">
        <h3 className="font-semibold">
          {vol.dateDepart} — {vol.numeroVol} — {vol.aeroportDepart} → {vol.aeroportArrivee}
        </h3>
        <span className="text-sm text-slate-500">
          Occupés / Total : {Number(occupes)} / {vol.nbSieges} · Restants à attribuer :{" "}
          {vol.nbSieges - totalAttribue}
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-500 text-xs">
            <th className="text-left py-1">Entreprise</th>
            <th className="text-left py-1">Total engagement</th>
            <th className="text-left py-1">Total free sale</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l, i) => (
            <tr key={i} className="border-t border-slate-100">
              <td className="py-1">{l.entrepriseNom}</td>
              <td className="py-1">{l.nbEngagementTotal}</td>
              <td className="py-1">{l.nbFreeSaleTotal}</td>
            </tr>
          ))}
          {lignes.length === 0 && (
            <tr>
              <td colSpan={3} className="py-2 text-center text-slate-400">
                Aucune assignation.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
