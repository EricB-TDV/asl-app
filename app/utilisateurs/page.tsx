import { db } from "@/db";
import { utilisateurs } from "@/db/schema";
import { asc } from "drizzle-orm";
import CreerUtilisateurForm from "./CreerUtilisateurForm";
import { getSession } from "@/lib/auth";
import SupprimerUtilisateurBouton from "./SupprimerUtilisateurBouton";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function UtilisateursPage() {
  const session = await getSession();
  const liste = await db.select().from(utilisateurs).orderBy(asc(utilisateurs.nom));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Comptes administrateurs</h1>
        <p className="text-sm text-slate-500">
          Toute personne créée ici pourra se connecter à l&apos;application avec les mêmes droits.
        </p>
      </div>

      <CreerUtilisateurForm />

      <table className="w-full bg-white border border-slate-200 rounded-lg overflow-hidden text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="text-left px-4 py-2">Nom</th>
            <th className="text-left px-4 py-2">Email</th>
            <th className="px-4 py-2 w-48"></th>
          </tr>
        </thead>
        <tbody>
          {liste.map((u) => (
            <tr key={u.id} className="border-t border-slate-100">
              <td className="px-4 py-2">
                {u.nom}
                {session?.userId === u.id && (
                  <span className="ml-2 text-xs text-slate-400">(vous)</span>
                )}
              </td>
              <td className="px-4 py-2">{u.email}</td>
              <td className="px-4 py-2 text-right space-x-3">
                <Link href={`/utilisateurs/${u.id}`} className="text-slate-600 hover:underline">
                  Modifier
                </Link>
                <SupprimerUtilisateurBouton id={u.id} nom={u.nom} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
