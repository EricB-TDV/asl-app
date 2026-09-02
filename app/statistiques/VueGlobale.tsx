import { calculerStatistiquesConsolidees } from "@/lib/statistiques";
import { isoVersDdmmyyyy } from "@/lib/dates";

export default async function VueGlobale() {
  const stats = await calculerStatistiquesConsolidees();

  const formatEur = (n: number) =>
    n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <a
          href="/api/statistiques/export"
          className="bg-slate-800 text-white text-sm px-4 py-2 rounded hover:bg-slate-700"
        >
          Télécharger (Excel)
        </a>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Carte titre="Sièges engagés" valeur={String(stats.totalEngages)} />
        <Carte
          titre="Taux de remplissage global"
          valeur={`${(stats.tauxRemplissageGlobal * 100).toFixed(1)} %`}
        />
        <Carte titre="Ventes HT totales" valeur={formatEur(stats.totalVentesHt)} />
      </div>

      <table className="w-full bg-white border border-slate-200 rounded-lg overflow-hidden text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="text-left px-3 py-2">Date du vol</th>
            <th className="text-left px-3 py-2">Origine</th>
            <th className="text-left px-3 py-2">Destination</th>
            <th className="text-left px-3 py-2">Sièges engagés</th>
            <th className="text-left px-3 py-2">Sièges occupés</th>
            <th className="text-left px-3 py-2">Sièges libres</th>
            <th className="text-left px-3 py-2">Sièges total</th>
            <th className="text-left px-3 py-2">Taux de remplissage</th>
            <th className="text-left px-3 py-2">Ventes HT</th>
          </tr>
        </thead>
        <tbody>
          {stats.lignes.map((l) => (
            <tr key={l.volId} className="border-t border-slate-100">
              <td className="px-3 py-2">{isoVersDdmmyyyy(l.flightDate)}</td>
              <td className="px-3 py-2">{l.originCode}</td>
              <td className="px-3 py-2">{l.destinationCode}</td>
              <td className="px-3 py-2">{l.nbSeatsEngaged}</td>
              <td className="px-3 py-2">{l.nbSeatsReal}</td>
              <td className="px-3 py-2">{l.nbSeatsFree}</td>
              <td className="px-3 py-2">{l.nbSeatsTotal}</td>
              <td className="px-3 py-2">{(l.tauxRemplissage * 100).toFixed(0)} %</td>
              <td className="px-3 py-2">{formatEur(l.salesHt)}</td>
            </tr>
          ))}
          {stats.lignes.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-6 text-center text-slate-400">
                Aucune donnée pour le moment.
              </td>
            </tr>
          )}
        </tbody>
        {stats.lignes.length > 0 && (
          <tfoot className="bg-slate-50 font-semibold">
            <tr className="border-t border-slate-200">
              <td className="px-3 py-2">Total</td>
              <td className="px-3 py-2"></td>
              <td className="px-3 py-2"></td>
              <td className="px-3 py-2">{stats.totalEngages}</td>
              <td className="px-3 py-2">{stats.totalReels}</td>
              <td className="px-3 py-2">{stats.totalLibres}</td>
              <td className="px-3 py-2">{stats.totalSieges}</td>
              <td className="px-3 py-2">{(stats.tauxRemplissageGlobal * 100).toFixed(0)} %</td>
              <td className="px-3 py-2">{formatEur(stats.totalVentesHt)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function Carte({ titre, valeur }: { titre: string; valeur: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <p className="text-xs text-slate-500 mb-1">{titre}</p>
      <p className="text-xl font-bold text-slate-800">{valeur}</p>
    </div>
  );
}
