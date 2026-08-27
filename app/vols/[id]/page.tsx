import { db } from "@/db";
import { vols } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { modifierVol } from "../actions";

export default async function ModifierVolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [vol] = await db.select().from(vols).where(eq(vols.id, Number(id)));
  if (!vol) notFound();

  async function enregistrer(formData: FormData) {
    "use server";
    const res = await modifierVol(vol.id, formData);
    if (!("error" in res)) redirect("/vols");
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">Modifier le vol {vol.numeroVol}</h1>
      <form action={enregistrer} className="bg-white border border-slate-200 rounded-lg p-4 grid grid-cols-2 gap-3">
        <Champ label="N° vol" name="numeroVol" defaultValue={vol.numeroVol} />
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Sens</label>
          <select
            name="sens"
            defaultValue={vol.sens}
            required
            className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
          >
            <option value="aller">Aller (PAR → ATR)</option>
            <option value="retour">Retour (ATR → PAR)</option>
          </select>
        </div>
        <Champ label="Aéroport départ" name="aeroportDepart" defaultValue={vol.aeroportDepart} />
        <Champ label="Aéroport arrivée" name="aeroportArrivee" defaultValue={vol.aeroportArrivee} />
        <Champ label="Date de départ" name="dateDepart" type="date" defaultValue={vol.dateDepart} />
        <Champ label="Date d'arrivée" name="dateArrivee" type="date" defaultValue={vol.dateArrivee} />
        <Champ label="Nombre de sièges" name="nbSieges" type="number" defaultValue={String(vol.nbSieges)} />
        <Champ label="Coût vol HT" name="coutVolHt" type="number" step="0.01" defaultValue={vol.coutVolHt} />
        <Champ label="Taxes" name="taxes" type="number" step="0.01" defaultValue={vol.taxes} />
        <div className="col-span-2">
          <button className="bg-slate-800 text-white text-sm px-4 py-2 rounded hover:bg-slate-700">
            Enregistrer
          </button>
        </div>
      </form>
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
        required
        className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
      />
    </div>
  );
}
