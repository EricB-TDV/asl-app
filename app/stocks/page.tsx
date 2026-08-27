import { db } from "@/db";
import { vols, entreprises, assignations, passagers } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { creerOuModifierAssignation } from "./actions";

export default async function StocksPage() {
  const listeVols = await db.select().from(vols).orderBy(desc(vols.dateDepart));
  const listeEntreprises = await db.select().from(entreprises).orderBy(entreprises.nom);

  async function creer(formData: FormData) {
    "use server";
    await creerOuModifierAssignation(formData);
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-1">Stocks / assignations</h1>
        <p className="text-sm text-slate-500">
          Attribution de contingents de sièges (engagement / free sale) aux entreprises clientes.
        </p>
      </div>

      <form action={creer} className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
        <h2 className="font-semibold text-slate-800">Créer / mettre à jour une assignation</h2>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Vol(s) — sélectionnez un ou plusieurs vols (Ctrl/Cmd + clic) pour appliquer la même
            quantité à chacun
          </label>
          <select
            name="volIds"
            multiple
            required
            size={6}
            className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
          >
            {listeVols.map((v) => (
              <option key={v.id} value={v.id}>
                {v.dateDepart} — {v.numeroVol} — {v.aeroportDepart} → {v.aeroportArrivee} (
                {v.nbSieges} sièges)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Entreprise</label>
          <select
            name="entrepriseId"
            required
            className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
          >
            {listeEntreprises.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nom}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Champ label="Sièges engagement" name="nbEngagementTotal" type="number" defaultValue="0" />
          <Champ label="Prix engagement HT" name="prixEngagementHt" type="number" step="0.01" />
          <Champ label="Taxes engagement" name="taxesEngagement" type="number" step="0.01" />
          <Champ label="Sièges free sale" name="nbFreeSaleTotal" type="number" defaultValue="0" />
          <Champ label="Prix free sale HT" name="prixFreeSaleHt" type="number" step="0.01" />
          <Champ label="Taxes free sale" name="taxesFreeSale" type="number" step="0.01" />
        </div>

        <button className="bg-slate-800 text-white text-sm px-4 py-2 rounded hover:bg-slate-700">
          Créer l&apos;assignation
        </button>
      </form>

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

function Champ({
  label,
  name,
  type = "text",
  step,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  step?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
      />
    </div>
  );
}
