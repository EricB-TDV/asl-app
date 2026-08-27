import { db } from "@/db";
import { vols, entreprises, passagers } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import PassagerForm from "./PassagerForm";
import ImportForm from "./ImportForm";
import { supprimerPassager } from "./actions";

export const dynamic = "force-dynamic";


export default async function PassagersPage({
  searchParams,
}: {
  searchParams: Promise<{ vol?: string }>;
}) {
  const { vol: volParam } = await searchParams;
  const listeVols = await db.select().from(vols).orderBy(desc(vols.dateDepart));
  const volId = volParam ? Number(volParam) : listeVols[0]?.id;

  const listeEntreprises = await db.select().from(entreprises).orderBy(entreprises.nom);
  const optionsEntreprises = listeEntreprises.map((e) => ({ id: e.id, label: e.nom }));

  const listePassagers = volId
    ? await db
        .select({
          id: passagers.id,
          nom: passagers.nom,
          prenom: passagers.prenom,
          typeSiege: passagers.typeSiege,
          entrepriseNom: entreprises.nom,
          numeroDocument: passagers.numeroDocument,
        })
        .from(passagers)
        .innerJoin(entreprises, eq(passagers.entrepriseId, entreprises.id))
        .where(eq(passagers.volId, volId))
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Passagers</h1>
        <p className="text-sm text-slate-500">Saisie manuelle ou import CSV, vol par vol.</p>
      </div>

      <form method="get" className="max-w-md flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-600 mb-1">Vol</label>
          <select
            name="vol"
            defaultValue={volId}
            className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
          >
            {listeVols.map((v) => (
              <option key={v.id} value={v.id}>
                {v.dateDepart} — {v.numeroVol} — {v.aeroportDepart} → {v.aeroportArrivee}
              </option>
            ))}
          </select>
        </div>
        <button className="bg-slate-700 text-white text-sm px-3 py-1.5 rounded hover:bg-slate-600">
          Afficher
        </button>
      </form>

      {volId && (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            <PassagerForm volId={volId} entreprises={optionsEntreprises} />
            <ImportForm volId={volId} entreprises={optionsEntreprises} />
          </div>

          <table className="w-full bg-white border border-slate-200 rounded-lg overflow-hidden text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left px-3 py-2">Nom</th>
                <th className="text-left px-3 py-2">Prénom</th>
                <th className="text-left px-3 py-2">Entreprise</th>
                <th className="text-left px-3 py-2">Type de siège</th>
                <th className="text-left px-3 py-2">N° document</th>
                <th className="px-3 py-2 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {listePassagers.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{p.nom}</td>
                  <td className="px-3 py-2">{p.prenom}</td>
                  <td className="px-3 py-2">{p.entrepriseNom}</td>
                  <td className="px-3 py-2">{p.typeSiege}</td>
                  <td className="px-3 py-2">{p.numeroDocument}</td>
                  <td className="px-3 py-2 text-right">
                    <form
                      action={async () => {
                        "use server";
                        await supprimerPassager(p.id);
                      }}
                    >
                      <button className="text-red-600 hover:underline text-xs">Supprimer</button>
                    </form>
                  </td>
                </tr>
              ))}
              {listePassagers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    Aucun passager sur ce vol.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
