import { db } from "@/db";
import { entreprises } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { modifierEntreprise } from "../actions";

export const dynamic = "force-dynamic";


export default async function ModifierEntreprisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [entreprise] = await db
    .select()
    .from(entreprises)
    .where(eq(entreprises.id, Number(id)));

  if (!entreprise) notFound();

  async function enregistrer(formData: FormData) {
    "use server";
    await modifierEntreprise(entreprise.id, formData);
    redirect("/entreprises");
  }

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-2xl font-bold">Modifier l&apos;entreprise</h1>
      <form action={enregistrer} className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
          <input
            name="nom"
            defaultValue={entreprise.nom}
            required
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
          />
        </div>
        <button className="bg-slate-800 text-white text-sm px-4 py-2 rounded hover:bg-slate-700">
          Enregistrer
        </button>
      </form>
    </div>
  );
}
