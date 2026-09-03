"use client";

import { useActionState, useState } from "react";
import { calculerADate, CalculDateState } from "./actions";
import { formatEurArrondi, couleurMontant } from "@/lib/montant";

type Valeurs = {
  coutsAsl: number | null;
  revisionCarburant: number | null;
  apportMauritanie: number | null;
  fraisAdministratifs: number | null;
  fraisAeroportMauritanie: number | null;
};

export default function CalculerADateBloc({
  valeurs,
  valeurInitiale,
}: {
  valeurs: Valeurs;
  valeurInitiale: { date: string; montant: number };
}) {
  const etatInitial: CalculDateState = {
    montant: valeurInitiale.montant,
    date: valeurInitiale.date,
  };
  const [state, formAction, isPending] = useActionState(calculerADate, etatInitial);
  // Modification 2 : suit la date actuellement affichée pour proposer un
  // export Excel cohérent avec le calcul visible à l'écran.
  const [dateAffichee, setDateAffichee] = useState(valeurInitiale.date);

  const ventes = state?.montant ?? null;
  const resultat =
    ventes != null
      ? (valeurs.coutsAsl ?? 0) +
        (valeurs.revisionCarburant ?? 0) +
        (valeurs.apportMauritanie ?? 0) +
        (valeurs.fraisAdministratifs ?? 0) +
        (valeurs.fraisAeroportMauritanie ?? 0) +
        ventes
      : null;

  const formatEur = (n: number) => formatEurArrondi(n);

  return (
    <div className="space-y-4">
      <form
        action={formAction}
        onSubmit={(e) => {
          const date = (e.currentTarget.elements.namedItem("date") as HTMLInputElement)?.value;
          if (date) setDateAffichee(date);
        }}
        className="flex items-end gap-3"
      >
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Calculer à une date
          </label>
          <input
            type="date"
            name="date"
            defaultValue={valeurInitiale.date}
            required
            className="border border-slate-300 rounded px-2 py-1.5 text-sm"
          />
        </div>
        <button
          disabled={isPending}
          className="bg-slate-800 text-white text-sm px-4 py-2 rounded hover:bg-slate-700 disabled:opacity-50"
        >
          {isPending ? "Calcul..." : "Calculer"}
        </button>
        <a
          href={`/api/statistiques/export-bilan?date=${dateAffichee}`}
          className="bg-slate-800 text-white text-sm px-4 py-2 rounded hover:bg-slate-700"
        >
          Télécharger (Excel)
        </a>
      </form>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {state.error}
        </p>
      )}

      {ventes != null && (
        <table className="w-full max-w-md bg-white border border-slate-200 rounded-lg overflow-hidden text-sm">
          <tbody>
            <Ligne label="Coûts ASL" valeur={valeurs.coutsAsl} formatEur={formatEur} />
            <Ligne
              label="Révision carburant"
              valeur={valeurs.revisionCarburant}
              formatEur={formatEur}
            />
            <Ligne
              label="Apport Mauritanie"
              valeur={valeurs.apportMauritanie}
              formatEur={formatEur}
            />
            <Ligne
              label="Frais administratifs"
              valeur={valeurs.fraisAdministratifs}
              formatEur={formatEur}
            />
            <Ligne
              label="Frais aéroport Mauritanie"
              valeur={valeurs.fraisAeroportMauritanie}
              formatEur={formatEur}
            />
            <Ligne label="Ventes réalisées" valeur={ventes} formatEur={formatEur} />
            <tr className="border-t border-slate-200 font-semibold bg-slate-50">
              <td className="px-3 py-2">Résultat financier</td>
              <td className={`px-3 py-2 text-right ${couleurMontant(resultat)}`}>
                {resultat != null ? formatEur(resultat) : ""}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

function Ligne({
  label,
  valeur,
  formatEur,
}: {
  label: string;
  valeur: number | null;
  formatEur: (n: number) => string;
}) {
  return (
    <tr className="border-t border-slate-100">
      <td className="px-3 py-2">{label}</td>
      <td className={`px-3 py-2 text-right ${couleurMontant(valeur)}`}>
        {valeur != null ? formatEur(valeur) : ""}
      </td>
    </tr>
  );
}
