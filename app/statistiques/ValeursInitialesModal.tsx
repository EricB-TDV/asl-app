"use client";

import { useState, useTransition } from "react";
import { enregistrerValeursInitiales } from "./actions";

type Valeurs = {
  coutsAsl: number | null;
  revisionCarburant: number | null;
  apportMauritanie: number | null;
  fraisAdministratifs: number | null;
  fraisAeroportMauritanie: number | null;
};

const CHAMPS: { cle: keyof Valeurs; label: string }[] = [
  { cle: "coutsAsl", label: "Coûts ASL" },
  { cle: "revisionCarburant", label: "Révision carburant" },
  { cle: "apportMauritanie", label: "Apport Mauritanie" },
  { cle: "fraisAdministratifs", label: "Frais administratifs" },
  { cle: "fraisAeroportMauritanie", label: "Frais aéroport Mauritanie" },
];

export default function ValeursInitialesModal({ valeurs }: { valeurs: Valeurs }) {
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function soumettre(formData: FormData) {
    setErreur(null);
    startTransition(async () => {
      const resultat = await enregistrerValeursInitiales({}, formData);
      if (resultat && "error" in resultat && resultat.error) {
        setErreur(resultat.error);
      } else {
        setOuvert(false);
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOuvert(true)}
        className="underline decoration-slate-400 hover:decoration-slate-800"
      >
        Valeurs initiales
      </button>

      {ouvert && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
            <h3 className="font-semibold text-slate-800">Valeurs initiales du bilan financier</h3>
            <form action={soumettre} className="space-y-3">
              {CHAMPS.map((c) => (
                <div key={c.cle}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{c.label}</label>
                  <input
                    type="number"
                    step="0.01"
                    name={c.cle}
                    defaultValue={valeurs[c.cle] ?? ""}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                  />
                </div>
              ))}

              {erreur && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                  {erreur}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOuvert(false)}
                  disabled={isPending}
                  className="text-sm px-4 py-2 rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-slate-800 text-white text-sm px-4 py-2 rounded hover:bg-slate-700 disabled:opacity-50"
                >
                  {isPending ? "Enregistrement..." : "Valider"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
