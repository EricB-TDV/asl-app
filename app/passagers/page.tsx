import { db } from "@/db";
import { vols, entreprises, passagers } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import PassagerForm from "./PassagerForm";
import ImportForm from "./ImportForm";
import ZoneDangerPassagers from "./ZoneDangerPassagers";
import TablePassagers from "./TablePassagers";
import { isoVersDdmmyyyy } from "@/lib/dates";

export const dynamic = "force-dynamic";


export default async function PassagersPage({
  searchParams,
}: {
  searchParams: Promise<{ vol?: string }>;
}) {
  const { vol: volParam } = await searchParams;
  const listeVols = await db.select().from(vols).orderBy(asc(vols.dateDepart));
  const volId = volParam ? Number(volParam) : listeVols[0]?.id;
  const volActuel = listeVols.find((v) => v.id === volId);
  const volLabel = volActuel
    ? `${isoVersDdmmyyyy(volActuel.dateDepart)} — ${volActuel.numeroVol} — ${volActuel.aeroportDepart} → ${volActuel.aeroportArrivee}`
    : "";

  const listeEntreprises = await db.select().from(entreprises).orderBy(entreprises.nom);
  const optionsEntreprises = listeEntreprises.map((e) => ({ id: e.id, label: e.nom }));

  const listePassagers = volId
    ? await db
        .select({
          id: passagers.id,
          volId: passagers.volId,
          entrepriseId: passagers.entrepriseId,
          entrepriseNom: entreprises.nom,
          typeSiege: passagers.typeSiege,
          civilite: passagers.civilite,
          nom: passagers.nom,
          prenom: passagers.prenom,
          dateNaissance: passagers.dateNaissance,
          genre: passagers.genre,
          numeroReservation: passagers.numeroReservation,
          nationaliteCodePays: passagers.nationaliteCodePays,
          typeDocument: passagers.typeDocument,
          numeroDocument: passagers.numeroDocument,
          documentPaysEmissionCodePays: passagers.documentPaysEmissionCodePays,
          dateEmissionDocument: passagers.dateEmissionDocument,
          dateExpirationDocument: passagers.dateExpirationDocument,
          seatRow: passagers.seatRow,
          excessBag: passagers.excessBag,
        })
        .from(passagers)
        .innerJoin(entreprises, eq(passagers.entrepriseId, entreprises.id))
        .where(eq(passagers.volId, volId))
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Passagers</h1>
        <p className="text-sm text-slate-500">Saisie manuelle ou import Excel, vol par vol.</p>
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
                {isoVersDdmmyyyy(v.dateDepart)} — {v.numeroVol} — {v.aeroportDepart} → {v.aeroportArrivee}
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

          <TablePassagers lignes={listePassagers} entreprises={optionsEntreprises} />

          <ZoneDangerPassagers volId={volId} volLabel={volLabel} entreprises={optionsEntreprises} />
        </>
      )}
    </div>
  );
}
