import {
  lireParametresFinanciers,
  calculerVentesCumuleesADate,
  genererFinsDeMois,
} from "@/lib/statistiques";
import { isoVersDdmmyyyy } from "@/lib/dates";
import ValeursInitialesModal from "./ValeursInitialesModal";
import ConfigurerSaisonModal from "./ConfigurerSaisonModal";
import CalculerADateBloc from "./CalculerADateBloc";

const LIGNES = [
  { cle: "coutsAsl" as const, label: "Coûts ASL" },
  { cle: "revisionCarburant" as const, label: "Révision carburant" },
  { cle: "apportMauritanie" as const, label: "Apport Mauritanie" },
  { cle: "fraisAdministratifs" as const, label: "Frais administratifs" },
  { cle: "fraisAeroportMauritanie" as const, label: "Frais aéroport Mauritanie" },
];

export default async function BilanFinancier() {
  const parametres = await lireParametresFinanciers();

  const formatEur = (n: number | null) =>
    n == null ? "" : n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

  const sommeValeursInitiales =
    (parametres.coutsAsl ?? 0) +
    (parametres.revisionCarburant ?? 0) +
    (parametres.apportMauritanie ?? 0) +
    (parametres.fraisAdministratifs ?? 0) +
    (parametres.fraisAeroportMauritanie ?? 0);

  const aujourdHui = new Date().toISOString().slice(0, 10);
  const dates =
    parametres.saisonDebut && parametres.saisonFin
      ? genererFinsDeMois(parametres.saisonDebut, parametres.saisonFin)
      : [];

  // Ventes réalisées : calculées uniquement pour les mois déjà passés (ou en cours).
  const ventesParDate = new Map<string, number>();
  for (const date of dates) {
    if (date <= aujourdHui) {
      ventesParDate.set(date, await calculerVentesCumuleesADate(date));
    }
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-semibold text-slate-800 mb-3">Bilan financier mensuel</h2>

        {!parametres.saisonDebut || !parametres.saisonFin ? (
          <p className="text-sm text-slate-500 mb-3">
            Aucune saison configurée. <ConfigurerSaisonModal saisonDebut={parametres.saisonDebut} saisonFin={parametres.saisonFin} />
          </p>
        ) : (
          <p className="text-xs text-slate-500 mb-3">
            Saison : {isoVersDdmmyyyy(parametres.saisonDebut)} → {isoVersDdmmyyyy(parametres.saisonFin)} —{" "}
            <ConfigurerSaisonModal saisonDebut={parametres.saisonDebut} saisonFin={parametres.saisonFin} />
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="text-sm whitespace-nowrap bg-white border border-slate-200 rounded-lg">
            <thead>
              <tr className="text-slate-500 bg-slate-50">
                <th className="text-left px-3 py-2"></th>
                <th className="text-left px-3 py-2">
                  <ValeursInitialesModal
                    valeurs={{
                      coutsAsl: parametres.coutsAsl,
                      revisionCarburant: parametres.revisionCarburant,
                      apportMauritanie: parametres.apportMauritanie,
                      fraisAdministratifs: parametres.fraisAdministratifs,
                      fraisAeroportMauritanie: parametres.fraisAeroportMauritanie,
                    }}
                  />
                </th>
                {dates.map((d) => (
                  <th key={d} className="text-left px-3 py-2">
                    {isoVersDdmmyyyy(d)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LIGNES.map((ligne) => (
                <tr key={ligne.cle} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium">{ligne.label}</td>
                  <td className="px-3 py-2">{formatEur(parametres[ligne.cle])}</td>
                  {dates.map((d) => (
                    <td key={d} className="px-3 py-2">
                      {formatEur(parametres[ligne.cle])}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium">Ventes réalisées</td>
                <td className="px-3 py-2"></td>
                {dates.map((d) => (
                  <td key={d} className="px-3 py-2">
                    {ventesParDate.has(d) ? formatEur(ventesParDate.get(d)!) : ""}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-slate-200 font-semibold bg-slate-50">
                <td className="px-3 py-2">Résultat financier</td>
                <td className="px-3 py-2"></td>
                {dates.map((d) => (
                  <td key={d} className="px-3 py-2">
                    {ventesParDate.has(d)
                      ? formatEur(sommeValeursInitiales + ventesParDate.get(d)!)
                      : ""}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-semibold text-slate-800 mb-3">Calcul à une date donnée</h2>
        <CalculerADateBloc
          valeurs={{
            coutsAsl: parametres.coutsAsl,
            revisionCarburant: parametres.revisionCarburant,
            apportMauritanie: parametres.apportMauritanie,
            fraisAdministratifs: parametres.fraisAdministratifs,
            fraisAeroportMauritanie: parametres.fraisAeroportMauritanie,
          }}
        />
      </section>
    </div>
  );
}
