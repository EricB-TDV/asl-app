import { db } from "@/db";
import { entreprises } from "@/db/schema";
import { asc } from "drizzle-orm";
import { supprimerEntreprise } from "./actions";
import CreerEntrepriseForm from "./CreerEntrepriseForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EntreprisesPage() {
  const liste = await db.select().from(entreprises).orderBy(asc(entreprises.nom));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Entreprises clientes</h1>
        <p className="text-sm text-slate-500">
          Entreprises avec lesquelles Terres d&apos;Aventure a un accord de remplissage.
        </p>
      </div>

      <CreerEntrepriseForm />

      <table className="w-full bg-white border border-slate-200 rounded-lg overflow-hidden text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="text-left px-4 py-2">Nom</th>
            <th className="text-left px-4 py-2">Code</th>
            <th className="px-4 py-2 w-40"></th>
          </tr>
        </thead>
        <tbody>
          {liste.map((e) => (
            <tr key={e.id} className="border-t border-slate-100">
              <td className="px-4 py-2">{e.nom}</td>
              <td className="px-4 py-2">{e.code3Lettres ?? "—"}</td>
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
              <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                Aucune entreprise pour le moment.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
