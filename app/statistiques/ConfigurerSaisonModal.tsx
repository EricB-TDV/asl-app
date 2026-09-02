"use client";

import { useState, useTransition } from "react";
import { enregistrerSaison } from "./actions";

export default function ConfigurerSaisonModal({
  saisonDebut,
  saisonFin,
}: {
  saisonDebut: string | null;
  saisonFin: string | null;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function soumettre(formData: FormData) {
    setErreur(null);
    startTransition(async () => {
      const resultat = await enregistrerSaison({}, formData);
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
        className="text-xs underline decoration-slate-400 hover:decoration-slate-800 text-slate-600"
      >
        Configurer la saison
      </button>

      {ouvert && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4">
            <h3 className="font-semibold text-slate-800">Saison du bilan mensuel</h3>
            <p className="text-xs text-slate-500">
              Détermine les colonnes mensuelles affichées (une par fin de mois entre ces deux
              dates).
            </p>
            <form action={soumettre} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Début de saison
                </label>
                <input
                  type="date"
                  name="saisonDebut"
                  defaultValue={saisonDebut ?? ""}
                  required
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Fin de saison
                </label>
                <input
                  type="date"
                  name="saisonFin"
                  defaultValue={saisonFin ?? ""}
                  required
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                />
              </div>

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
