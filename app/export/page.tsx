import { db } from "@/db";
import { vols, passagers } from "@/db/schema";
import { asc, sql } from "drizzle-orm";
import { isoVersDdmmyyyy } from "@/lib/dates";

export const dynamic = "force-dynamic";


export default async function ExportPage() {
  // Tri : date du vol (critère 1), puis aller avant retour (critère 2, "aller" < "retour" alphabétiquement).
  const listeVols = await db.select().from(vols).orderBy(asc(vols.dateDepart), asc(vols.sens));

  const comptages = await db
    .select({ volId: passagers.volId, nb: sql<number>`count(*)` })
    .from(passagers)
    .groupBy(passagers.volId);
  const nbParVol = new Map(comptages.map((c) => [c.volId, Number(c.nb)]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Listes ASL</h1>
        <p className="text-sm text-slate-500">
          Export Excel au format imposé par la compagnie ASL, un fichier par vol.
        </p>
      </div>

      <table className="w-full bg-white border border-slate-200 rounded-lg overflow-hidden text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="text-left px-3 py-2">Date</th>
            <th className="text-left px-3 py-2">N° vol</th>
            <th className="text-left px-3 py-2">Trajet</th>
            <th className="text-left px-3 py-2">Passagers</th>
            <th className="px-3 py-2 w-40"></th>
          </tr>
        </thead>
        <tbody>
          {listeVols.map((v) => (
            <tr key={v.id} className="border-t border-slate-100">
              <td className="px-3 py-2">{isoVersDdmmyyyy(v.dateDepart)}</td>
              <td className="px-3 py-2">{v.numeroVol}</td>
              <td className="px-3 py-2">
                {v.aeroportDepart} → {v.aeroportArrivee}
              </td>
              <td className="px-3 py-2">{nbParVol.get(v.id) ?? 0}</td>
              <td className="px-3 py-2 text-right">
                <a
                  href={`/api/export/asl?volId=${v.id}`}
                  className="text-slate-700 hover:underline"
                >
                  Télécharger Excel
                </a>
              </td>
            </tr>
          ))}
          {listeVols.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                Aucun vol pour le moment.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
