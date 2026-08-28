"use client";

import { useState, useTransition } from "react";
import {
  supprimerTousPassagersDuVol,
  supprimerPassagersDuVolPourEntreprise,
} from "./actions";

type EntrepriseOption = { id: number; label: string };

export default function ZoneDangerPassagers({
  volId,
  volLabel,
  entreprises,
}: {
  volId: number;
  volLabel: string;
  entreprises: EntrepriseOption[];
}) {
  const [entrepriseChoisie, setEntrepriseChoisie] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function supprimerTout() {
    const confirmation = confirm(
      `⚠️ ATTENTION — Action irréversible ⚠️\n\nVous êtes sur le point de supprimer TOUS les passagers du vol ${volLabel}.\n\nCette action ne peut pas être annulée. Continuer ?`
    );
    if (!confirmation) return;
    setErreur(null);
    setMessage(null);
    startTransition(async () => {
      const resultat = await supprimerTousPassagersDuVol(volId);
      if ("error" in resultat && resultat.error) {
        setErreur(resultat.error);
      } else if ("nbSupprimes" in resultat) {
        setMessage(`${resultat.nbSupprimes} passager(s) supprimé(s) pour ce vol.`);
      }
    });
  }

  function supprimerPourEntreprise() {
    if (!entrepriseChoisie) {
      setErreur("Sélectionnez une entreprise.");
      return;
    }
    const nomEntreprise =
      entreprises.find((e) => String(e.id) === entrepriseChoisie)?.label ?? "";
    const confirmation = confirm(
      `⚠️ ATTENTION — Action irréversible ⚠️\n\nVous êtes sur le point de supprimer TOUS les passagers de "${nomEntreprise}" sur le vol ${volLabel}.\n\nCette action ne peut pas être annulée. Continuer ?`
    );
    if (!confirmation) return;
    setErreur(null);
    setMessage(null);
    startTransition(async () => {
      const resultat = await supprimerPassagersDuVolPourEntreprise(
        volId,
        Number(entrepriseChoisie)
      );
      if ("error" in resultat && resultat.error) {
        setErreur(resultat.error);
      } else if ("nbSupprimes" in resultat) {
        setMessage(`${resultat.nbSupprimes} passager(s) supprimé(s) pour cette entreprise sur ce vol.`);
      }
    });
  }

  return (
    <div className="border-2 border-red-300 bg-red-50 rounded-lg p-4 space-y-3">
      <h2 className="font-semibold text-red-800">⚠️ Zone de danger</h2>
      <p className="text-sm text-red-700">
        Ces actions suppriment définitivement des passagers. Elles ne peuvent pas être annulées.
      </p>

      <div className="flex flex-wrap gap-3 items-end">
        <button
          onClick={supprimerTout}
          disabled={isPending}
          className="bg-red-600 text-white text-sm px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
        >
          Supprimer tous les passagers de ce vol
        </button>

        <div className="flex gap-2 items-end">
          <div>
            <label className="block text-xs font-medium text-red-700 mb-1">Entreprise</label>
            <select
              value={entrepriseChoisie}
              onChange={(e) => setEntrepriseChoisie(e.target.value)}
              className="border border-red-300 rounded px-2 py-1.5 text-sm bg-white"
            >
              <option value="">— Choisir —</option>
              {entreprises.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={supprimerPourEntreprise}
            disabled={isPending}
            className="bg-red-600 text-white text-sm px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
          >
            Supprimer les passagers de cette entreprise sur ce vol
          </button>
        </div>
      </div>

      {erreur && (
        <p className="text-sm text-red-800 bg-red-100 border border-red-300 rounded px-3 py-2">
          {erreur}
        </p>
      )}
      {message && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          {message}
        </p>
      )}
    </div>
  );
}
