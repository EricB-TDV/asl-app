import { db } from "@/db";
import { entreprises } from "@/db/schema";
import { desc } from "drizzle-orm";
import { creerEntreprise, supprimerEntreprise } from "./actions";
import Link from "next/link";

export const dynamic = "force-dynamic";


export default async function EntreprisesPage() {
  const liste = await db.select().from(entreprises).orderBy(desc(entreprises.createdAt));

  async function creer(formData: FormData) {
    "use server";
    await creerEntreprise(formData);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Entreprises clientes</h1>
        <p className="text-sm text-slate-500">
          Entreprises avec lesquelles Terres d&apos;Aventure a un accord de remplissage.
        </p>
      </div>

      <form action={creer} className="bg-white border border-slate-200 rounded-lg p-4 flex gap-3 items-end max-w-md">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nom de l&apos;entreprise
          </label>
          <input
            name="nom"
            required
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            placeholder="ex: Point Afrique"
          />
        </div>
        <button className="bg-slate-800 text-white text-sm px-4 py-2 rounded hover:bg-slate-700">
          Créer
        </button>
      </form>

      <table className="w-full bg-white border border-slate-200 rounded-lg overflow-hidden text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="text-left px-4 py-2">Nom</th>
            <th className="px-4 py-2 w-40"></th>
          </tr>
        </thead>
        <tbody>
          {liste.map((e) => (
            <tr key={e.id} className="border-t border-slate-100">
              <td className="px-4 py-2">{e.nom}</td>
              <td className="px-4 py-2 text-right space-x-3">
                <Link href={`/entreprises/${e.id}`} className="text-slate-600 hover:underline">
                  Modifier
                </Link>
                <form
                  action={async () => {
                    "use server";
                    await supprimerEntreprise(e.id);
                  }}
                  className="inline"
                >
                  <button className="text-red-600 hover:underline">Supprimer</button>
                </form>
              </td>
            </tr>
          ))}
          {liste.length === 0 && (
            <tr>
              <td colSpan={2} className="px-4 py-6 text-center text-slate-400">
                Aucune entreprise pour le moment.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
