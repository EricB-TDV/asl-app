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

/**
 * Modification (correction affichage, 2026) : taille de police et padding des
 * cellules adaptés au nombre d'entreprises du bloc (aller / retour ajustés
 * indépendamment), pour que toutes les colonnes restent visibles sans
 * scroll horizontal. Plus il y a d'entreprises (donc de colonnes), plus le
 * texte et les marges se resserrent.
 */
function classesTaille(nbEntreprises: number): { texte: string; cellule: string } {
  if (nbEntreprises <= 4) return { texte: "text-sm", cellule: "px-2 py-2" };
  if (nbEntreprises <= 6) return { texte: "text-sm", cellule: "px-1.5 py-2" };
  if (nbEntreprises <= 8) return { texte: "text-xs", cellule: "px-1.5 py-1.5" };
  return { texte: "text-xs", cellule: "px-1 py-1.5" };
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
  const { texte, cellule } = classesTaille(vue.entreprises.length);
  const th = `text-left ${cellule} whitespace-nowrap`;
  const td = `${cellule} whitespace-nowrap`;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3">
      <h3 className="font-semibold text-base mb-3">{titre}</h3>
      {/* overflow-x-auto en filet de sécurité : avec les tailles ci-dessus,
          ne se déclenche pas dans les cas d'usage courants, mais évite un
          contenu tronqué et invisible si le nombre d'entreprises grandit. */}
      <div className="overflow-x-auto">
        <table className={`w-full ${texte}`}>
          <thead>
            <tr className="text-slate-500">
              <th className={th}>Date</th>
              {vue.entreprises.map((code) => (
                <th key={code} className={th}>
                  {code}
                </th>
              ))}
              <th className={th}>Total</th>
              <th className={th}>Stock</th>
              <th className={th}>Reste</th>
              <th className={th}>%</th>
            </tr>
          </thead>
          <tbody>
            {vue.lignes.map((l, index) => {
              if (l.volId === null) {
                // Modification 3 : case vide pour garder l'alignement des dates
                // avec l'autre sens (aller/retour).
                return (
                  <tr
                    key={`${l.date}-${index}`}
                    className="border-t border-slate-100 text-slate-300"
                  >
                    <td className={td}>{isoVersDdmmyyyy(l.date)}</td>
                    {vue.entreprises.map((code) => (
                      <td key={code} className={cellule}></td>
                    ))}
                    <td className={cellule}></td>
                    <td className={cellule}></td>
                    <td className={cellule}></td>
                    <td className={cellule}></td>
                  </tr>
                );
              }
              const parEntreprise = mode === "engages" ? l.engages : l.reels;
              const total = mode === "engages" ? l.totalEngages : l.totalReels;
              const reste = mode === "engages" ? l.resteEngages : l.resteReels;
              const taux = mode === "engages" ? l.tauxEngages : l.tauxReels;
              return (
                <tr key={`${l.date}-${index}`} className="border-t border-slate-100">
                  <td className={td}>{isoVersDdmmyyyy(l.date)}</td>
                  {vue.entreprises.map((code) => (
                    <td key={code} className={td}>
                      {parEntreprise[code] ?? 0}
                    </td>
                  ))}
                  <td className={`${td} font-medium`}>{total}</td>
                  <td className={td}>{l.stock}</td>
                  <td className={td}>{reste}</td>
                  <td className={td}>{taux != null ? `${(taux * 100).toFixed(0)} %` : ""}</td>
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
    </div>
  );
}
