"use client";

import { useState, useTransition } from "react";
import { supprimerVol } from "./actions";

export default function SupprimerVolBouton({ id, numeroVol }: { id: number; numeroVol: string }) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function gererClic() {
    if (!confirm(`Supprimer le vol ${numeroVol} ?`)) return;
    setErreur(null);
    startTransition(async () => {
      const resultat = await supprimerVol(id);
      if (resultat && "error" in resultat && resultat.error) {
        setErreur(resultat.error);
      }
    });
  }

  return (
    <span className="relative">
      <button
        onClick={gererClic}
        disabled={isPending}
        className="text-red-600 hover:underline disabled:opacity-50"
      >
        Supprimer
      </button>
      {erreur && (
        <span className="absolute right-0 top-6 z-10 w-72 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5 shadow">
          {erreur}
        </span>
      )}
    </span>
  );
}
