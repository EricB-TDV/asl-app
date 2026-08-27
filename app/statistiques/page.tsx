import { calculerStatistiquesConsolidees } from "@/lib/statistiques";

export default async function StatistiquesPage() {
  const stats = await calculerStatistiquesConsolidees();

  const formatEur = (n: number) =>
    n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Statistiques</h1>
          <p className="text-sm text-slate-500">
            Vue consolidée sur l&apos;ensemble des vols (aller et retour confondus).
          </p>
        </div>
        <a
          href="/api/statistiques/export"
          className="bg-slate-800 text-white text-sm px-4 py-2 rounded hover:bg-slate-700"
        >
          Télécharger (Excel)
        </a>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Carte titre="Sièges vendus" valeur={String(stats.totalEngagement + stats.totalFreeSale)} />
        <Carte
          titre="Taux de remplissage global"
          valeur={`${(stats.tauxRemplissage * 100).toFixed(1)} %`}
        />
        <Carte titre="Ventes HT totales" valeur={formatEur(stats.totalVentesHt)} />
      </div>

      <table className="w-full bg-white border border-slate-200 rounded-lg overflow-hidden text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="text-left px-3 py-2">Entreprise</th>
            <th className="text-left px-3 py-2">Sièges engagement</th>
            <th className="text-left px-3 py-2">Sièges free-sale</th>
            <th className="text-left px-3 py-2">Total sièges</th>
            <th className="text-left px-3 py-2">Ventes HT</th>
          </tr>
        </thead>
        <tbody>
          {stats.lignes.map((l) => (
            <tr key={l.entrepriseId} className="border-t border-slate-100">
              <td className="px-3 py-2">{l.entrepriseNom}</td>
              <td className="px-3 py-2">{l.nbEngagement}</td>
              <td className="px-3 py-2">{l.nbFreeSale}</td>
              <td className="px-3 py-2">{l.nbEngagement + l.nbFreeSale}</td>
              <td className="px-3 py-2">{formatEur(l.ventesHt)}</td>
            </tr>
          ))}
          {stats.lignes.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                Aucune donnée pour le moment.
              </td>
            </tr>
          )}
        </tbody>
        {stats.lignes.length > 0 && (
          <tfoot className="bg-slate-50 font-semibold">
            <tr className="border-t border-slate-200">
              <td className="px-3 py-2">Total</td>
              <td className="px-3 py-2">{stats.totalEngagement}</td>
              <td className="px-3 py-2">{stats.totalFreeSale}</td>
              <td className="px-3 py-2">{stats.totalEngagement + stats.totalFreeSale}</td>
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
