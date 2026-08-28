"use client";

import { useState, useTransition } from "react";
import { modifierMontantsAssignation } from "./actions";

export type LigneAssignationAffichage = {
  assignationId: number;
  entrepriseNom: string;
  nbEngagementTotal: number;
  nbFreeSaleTotal: number;
  occupesEngagement: number;
  occupesFreeSale: number;
};

export default function TableAssignations({
  volEntete,
  lignes,
}: {
  volEntete: string;
  lignes: LigneAssignationAffichage[];
}) {
  const [ligneEnEdition, setLigneEnEdition] = useState<LigneAssignationAffichage | null>(null);

  return (
    <>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-500 text-xs">
            <th className="text-left py-1">Entreprise</th>
            <th className="text-left py-1">Engagement</th>
            <th className="text-left py-1">Free sale</th>
            <th className="text-left py-1">Reste Engagement</th>
            <th className="text-left py-1">Reste Free sale</th>
            <th className="text-left py-1">Reste total</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => {
            const resteEngagement = l.nbEngagementTotal - l.occupesEngagement;
            const resteFreeSale = l.nbFreeSaleTotal - l.occupesFreeSale;
            return (
              <tr key={l.assignationId} className="border-t border-slate-100">
                <td className="py-1">
                  <button
                    onClick={() => setLigneEnEdition(l)}
                    className="underline decoration-slate-400 hover:decoration-slate-800 text-left"
                  >
                    {l.entrepriseNom}
                  </button>
                </td>
                <td className="py-1">{l.nbEngagementTotal}</td>
                <td className="py-1">{l.nbFreeSaleTotal}</td>
                <td className="py-1">{resteEngagement}</td>
                <td className="py-1">{resteFreeSale}</td>
                <td className="py-1">{resteEngagement + resteFreeSale}</td>
              </tr>
            );
          })}
          {lignes.length === 0 && (
            <tr>
              <td colSpan={6} className="py-2 text-center text-slate-400">
                Aucune assignation.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {ligneEnEdition && (
        <ModaleEdition
          volEntete={volEntete}
          ligne={ligneEnEdition}
          onFermer={() => setLigneEnEdition(null)}
        />
      )}
    </>
  );
}

function ModaleEdition({
  volEntete,
  ligne,
  onFermer,
}: {
  volEntete: string;
  ligne: LigneAssignationAffichage;
  onFermer: () => void;
}) {
  const [nbEngagementTotal, setNbEngagementTotal] = useState(String(ligne.nbEngagementTotal));
  const [nbFreeSaleTotal, setNbFreeSaleTotal] = useState(String(ligne.nbFreeSaleTotal));
  const [erreur, setErreur] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function valider() {
    setErreur(null);
    startTransition(async () => {
      const resultat = await modifierMontantsAssignation({
        assignationId: ligne.assignationId,
        nbEngagementTotal: Number(nbEngagementTotal),
        nbFreeSaleTotal: Number(nbFreeSaleTotal),
      });
      if (resultat && "error" in resultat && resultat.error) {
        setErreur(resultat.error);
      } else {
        onFermer();
      }
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
        <h3 className="font-semibold text-slate-800">{volEntete}</h3>
        <p className="text-sm text-slate-600">{ligne.entrepriseNom}</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Total engagement
            </label>
            <input
              type="number"
              min={0}
              value={nbEngagementTotal}
              onChange={(e) => setNbEngagementTotal(e.target.value)}
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Total free sale
            </label>
            <input
              type="number"
              min={0}
              value={nbFreeSaleTotal}
              onChange={(e) => setNbFreeSaleTotal(e.target.value)}
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
            />
          </div>
        </div>

        {erreur && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {erreur}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onFermer}
            disabled={isPending}
            className="text-sm px-4 py-2 rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={valider}
            disabled={isPending}
            className="bg-slate-800 text-white text-sm px-4 py-2 rounded hover:bg-slate-700 disabled:opacity-50"
          >
            {isPending ? "Enregistrement..." : "Valider"}
          </button>
        </div>
      </div>
    </div>
  );
}
