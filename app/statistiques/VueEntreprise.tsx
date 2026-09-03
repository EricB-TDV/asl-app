import { VueParDirection } from "@/lib/statistiques";
import { isoVersDdmmyyyy } from "@/lib/dates";

export default function VueEntreprise({
  aller,
  retour,
  mode,
}: {
  aller: VueParDirection;
  retour: VueParDirection;
  mode: "engages" | "reels";
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <a
          href={`/api/statistiques/export-entreprise?mode=${mode}`}
          className="bg-slate-800 text-white text-sm px-4 py-2 rounded hover:bg-slate-700"
        >
          Télécharger (Excel)
        </a>
      </div>
      <div className="grid md:grid-cols-2 gap-4 items-start">
        <BlocDirection titre="Aller (CDG → ATR)" vue={aller} mode={mode} />
        <BlocDirection titre="Retour (ATR → CDG)" vue={retour} mode={mode} />
      </div>
    </div>
  );
}

function BlocDirection({
  titre,
  vue,
  mode,
}: {
  titre: string;
  vue: VueParDirection;
  mode: "engages" | "reels";
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <h3 className="font-semibold text-base mb-3">{titre}</h3>
      <table className="w-full table-fixed text-base">
        <thead>
          <tr className="text-slate-500">
            <th className="text-left px-3 py-3">Date</th>
            {vue.entreprises.map((code) => (
              <th key={code} className="text-left px-3 py-3">
                {code}
              </th>
            ))}
            <th className="text-left px-3 py-3">Total</th>
            <th className="text-left px-3 py-3">Stock</th>
            <th className="text-left px-3 py-3">Reste</th>
            <th className="text-left px-3 py-3">%</th>
          </tr>
        </thead>
        <tbody>
          {vue.lignes.map((l, index) => {
            if (l.volId === null) {
              // Modification 3 : case vide pour garder l'alignement des dates
              // avec l'autre sens (aller/retour).
              return (
                <tr key={`${l.date}-${index}`} className="border-t border-slate-100 text-slate-300">
                  <td className="px-3 py-3">{isoVersDdmmyyyy(l.date)}</td>
                  {vue.entreprises.map((code) => (
                    <td key={code} className="px-3 py-3"></td>
                  ))}
                  <td className="px-3 py-3"></td>
                  <td className="px-3 py-3"></td>
                  <td className="px-3 py-3"></td>
                  <td className="px-3 py-3"></td>
                </tr>
              );
            }
            const parEntreprise = mode === "engages" ? l.engages : l.reels;
            const total = mode === "engages" ? l.totalEngages : l.totalReels;
            const reste = mode === "engages" ? l.resteEngages : l.resteReels;
            const taux = mode === "engages" ? l.tauxEngages : l.tauxReels;
            return (
              <tr key={`${l.date}-${index}`} className="border-t border-slate-100">
                <td className="px-3 py-3">{isoVersDdmmyyyy(l.date)}</td>
                {vue.entreprises.map((code) => (
                  <td key={code} className="px-3 py-3">
                    {parEntreprise[code] ?? 0}
                  </td>
                ))}
                <td className="px-3 py-3 font-medium">{total}</td>
                <td className="px-3 py-3">{l.stock}</td>
                <td className="px-3 py-3">{reste}</td>
                <td className="px-3 py-3">{taux != null ? `${(taux * 100).toFixed(0)} %` : ""}</td>
              </tr>
            );
          })}
          {vue.lignes.length === 0 && (
            <tr>
              <td colSpan={vue.entreprises.length + 5} className="py-4 text-center text-slate-400">
                Aucun vol dans ce sens.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
