"use client";

import { useActionState } from "react";
import { creerEntreprise } from "./actions";

type EtatAction = { error?: string; ok?: boolean };

async function creerEntrepriseAction(
  _prevState: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  return creerEntreprise(formData);
}

const etatInitial: EtatAction = {};

export default function CreerEntrepriseForm() {
  const [state, formAction, isPending] = useActionState(creerEntrepriseAction, etatInitial);

  return (
    <form
      action={formAction}
      className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap gap-3 items-end"
    >
      <div className="flex-1 min-w-[200px]">
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Nom de l&apos;entreprise
        </label>
        <input
          name="nom"
          required
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
          placeholder="ex: Point Afrique"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Code (3 lettres)</label>
        <input
          name="code3Lettres"
          required
          maxLength={3}
          className="w-24 border border-slate-300 rounded px-3 py-2 text-sm uppercase"
          placeholder="PAF"
        />
      </div>
      <button
        disabled={isPending}
        className="bg-slate-800 text-white text-sm px-4 py-2 rounded hover:bg-slate-700 disabled:opacity-50"
      >
        {isPending ? "Création..." : "Créer"}
      </button>

      {state?.error && (
        <p className="w-full text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {state.error}
        </p>
      )}
    </form>
  );
}
