"use client";

import { useState } from "react";
import ModifierPassagerModal, { PassagerAModifier } from "./ModifierPassagerModal";
import { supprimerPassager } from "./actions";

type Option = { id: number; label: string };

export type LignePassagerAffichage = PassagerAModifier & {
  entrepriseNom: string;
};

export default function TablePassagers({
  lignes,
  entreprises,
}: {
  lignes: LignePassagerAffichage[];
  entreprises: Option[];
}) {
  const [passagerEnEdition, setPassagerEnEdition] = useState<LignePassagerAffichage | null>(null);

  return (
    <>
      <table className="w-full bg-white border border-slate-200 rounded-lg overflow-hidden text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="text-left px-3 py-2">Nom</th>
            <th className="text-left px-3 py-2">Prénom</th>
            <th className="text-left px-3 py-2">Entreprise</th>
            <th className="text-left px-3 py-2">Type de siège</th>
            <th className="text-left px-3 py-2">N° document</th>
            <th className="px-3 py-2 w-24"></th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((p) => (
            <tr key={p.id} className="border-t border-slate-100">
              <td className="px-3 py-2">{p.nom}</td>
              <td className="px-3 py-2">{p.prenom}</td>
              <td className="px-3 py-2">
                <button
                  onClick={() => setPassagerEnEdition(p)}
                  className="underline decoration-slate-400 hover:decoration-slate-800 text-left"
                >
                  {p.entrepriseNom}
                </button>
              </td>
              <td className="px-3 py-2">{p.typeSiege}</td>
              <td className="px-3 py-2">{p.numeroDocument ?? ""}</td>
              <td className="px-3 py-2 text-right">
                <form
                  action={async () => {
                    await supprimerPassager(p.id);
                  }}
                >
                  <button className="text-red-600 hover:underline text-xs">Supprimer</button>
                </form>
              </td>
            </tr>
          ))}
          {lignes.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                Aucun passager sur ce vol.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {passagerEnEdition && (
        <ModifierPassagerModal
          passager={passagerEnEdition}
          entreprises={entreprises}
          onFermer={() => setPassagerEnEdition(null)}
        />
      )}
    </>
  );
}
