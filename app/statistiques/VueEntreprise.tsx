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
    <div className="grid md:grid-cols-2 gap-4">
      <BlocDirection titre="Aller (CDG → ATR)" vue={aller} mode={mode} />
      <BlocDirection titre="Retour (ATR → CDG)" vue={retour} mode={mode} />
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
    <div className="bg-white border border-slate-200 rounded-lg p-4 overflow-x-auto">
      <h3 className="font-semibold text-sm mb-3">{titre}</h3>
      <table className="text-xs whitespace-nowrap">
        <thead>
          <tr className="text-slate-500">
            <th className="text-left pr-3 py-1">Date</th>
            {vue.entreprises.map((nom) => (
              <th key={nom} className="text-left pr-3 py-1">
                {nom}
              </th>
            ))}
            <th className="text-left pr-3 py-1">Total</th>
            <th className="text-left pr-3 py-1">Stock</th>
            <th className="text-left pr-3 py-1">Reste</th>
            <th className="text-left pr-3 py-1">%</th>
          </tr>
        </thead>
        <tbody>
          {vue.lignes.map((l) => {
            const parEntreprise = mode === "engages" ? l.engages : l.reels;
            const total = mode === "engages" ? l.totalEngages : l.totalReels;
            const reste = mode === "engages" ? l.resteEngages : l.resteReels;
            const taux = mode === "engages" ? l.tauxEngages : l.tauxReels;
            return (
              <tr key={l.volId} className="border-t border-slate-100">
                <td className="pr-3 py-1">{isoVersDdmmyyyy(l.date)}</td>
                {vue.entreprises.map((nom) => (
                  <td key={nom} className="pr-3 py-1">
                    {parEntreprise[nom] ?? 0}
                  </td>
                ))}
                <td className="pr-3 py-1 font-medium">{total}</td>
                <td className="pr-3 py-1">{l.stock}</td>
                <td className="pr-3 py-1">{reste}</td>
                <td className="pr-3 py-1">{(taux * 100).toFixed(0)} %</td>
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
