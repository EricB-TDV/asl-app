import { db } from "@/db";
import { vols } from "@/db/schema";
import { asc } from "drizzle-orm";
import Link from "next/link";
import { creerVolUnitaire, creerVolsEnSerie } from "./actions";
import SupprimerVolBouton from "./SupprimerVolBouton";
import { isoVersDdmmyyyy } from "@/lib/dates";

export const dynamic = "force-dynamic";


export default async function VolsPage() {
  // Tri : date du vol (critère 1), puis aller avant retour (critère 2, "aller" < "retour" alphabétiquement).
  const liste = await db.select().from(vols).orderBy(asc(vols.dateDepart), asc(vols.sens));

  async function creerUnitaire(formData: FormData) {
    "use server";
    await creerVolUnitaire(formData);
  }

  async function creerSerie(formData: FormData) {
    "use server";
    await creerVolsEnSerie(formData);
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-1">Vols</h1>
        <p className="text-sm text-slate-500">
          Un vol est créé dans un seul sens à la fois : aller (PAR → ATR) ou retour (ATR → PAR).
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <form
          action={creerUnitaire}
          className="bg-white border border-slate-200 rounded-lg p-4 space-y-3"
        >
          <h2 className="font-semibold text-slate-800">Créer un vol unique</h2>
          <ChampsVolCommuns />
          <button className="bg-slate-800 text-white text-sm px-4 py-2 rounded hover:bg-slate-700">
            Créer le vol
          </button>
        </form>

        <form
          action={creerSerie}
          className="bg-white border border-slate-200 rounded-lg p-4 space-y-3"
        >
          <h2 className="font-semibold text-slate-800">Créer une série de vols</h2>
          <p className="text-xs text-slate-500">
            Un vol est créé chaque semaine, à partir de la date du premier vol, jusqu&apos;à la
            date de fin.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Champ label="N° vol (répliqué)" name="numeroVol" />
            <ChampSens />
            <Champ label="Aéroport départ" name="aeroportDepart" placeholder="CDG" />
            <Champ label="Aéroport arrivée" name="aeroportArrivee" placeholder="ATR" />
            <Champ label="Date du premier vol" name="datePremierVol" type="date" />
            <Champ label="Date de fin" name="dateFin" type="date" />
            <Champ label="Nombre de sièges" name="nbSieges" type="number" />
            <Champ label="Coût vol HT" name="coutVolHt" type="number" step="0.01" />
            <Champ label="Taxes" name="taxes" type="number" step="0.01" />
          </div>
          <button className="bg-slate-800 text-white text-sm px-4 py-2 rounded hover:bg-slate-700">
            Créer la série
          </button>
        </form>
      </div>

      <table className="w-full bg-white border border-slate-200 rounded-lg overflow-hidden text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="text-left px-3 py-2">N° vol</th>
            <th className="text-left px-3 py-2">Sens</th>
            <th className="text-left px-3 py-2">Départ</th>
            <th className="text-left px-3 py-2">Arrivée</th>
            <th className="text-left px-3 py-2">Date</th>
            <th className="text-left px-3 py-2">Sièges</th>
            <th className="px-3 py-2 w-40"></th>
          </tr>
        </thead>
        <tbody>
          {liste.map((v) => (
            <tr key={v.id} className="border-t border-slate-100">
              <td className="px-3 py-2">{v.numeroVol}</td>
              <td className="px-3 py-2 capitalize">{v.sens}</td>
              <td className="px-3 py-2">{v.aeroportDepart}</td>
              <td className="px-3 py-2">{v.aeroportArrivee}</td>
              <td className="px-3 py-2">{v.dateDepart ? isoVersDdmmyyyy(v.dateDepart) : ""}</td>
              <td className="px-3 py-2">{v.nbSieges}</td>
              <td className="px-3 py-2 text-right space-x-3">
                <Link href={`/vols/${v.id}`} className="text-slate-600 hover:underline">
                  Modifier
                </Link>
                <SupprimerVolBouton id={v.id} numeroVol={v.numeroVol} />
              </td>
            </tr>
          ))}
          {liste.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                Aucun vol pour le moment.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ChampsVolCommuns() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Champ label="N° vol" name="numeroVol" />
      <ChampSens />
      <Champ label="Aéroport départ" name="aeroportDepart" placeholder="CDG" />
      <Champ label="Aéroport arrivée" name="aeroportArrivee" placeholder="ATR" />
      <Champ label="Date de départ" name="dateDepart" type="date" />
      <Champ label="Date d'arrivée" name="dateArrivee" type="date" />
      <Champ label="Nombre de sièges" name="nbSieges" type="number" />
      <Champ label="Coût vol HT" name="coutVolHt" type="number" step="0.01" />
      <Champ label="Taxes" name="taxes" type="number" step="0.01" />
    </div>
  );
}

function Champ({
  label,
  name,
  type = "text",
  placeholder,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        name={name}
        type={type}
        step={step}
        placeholder={placeholder}
        required
        className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
      />
    </div>
  );
}

function ChampSens() {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">Sens</label>
      <select name="sens" required className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
        <option value="aller">Aller (PAR → ATR)</option>
        <option value="retour">Retour (ATR → PAR)</option>
      </select>
    </div>
  );
}
