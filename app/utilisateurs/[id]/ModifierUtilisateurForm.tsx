"use client";

import { useActionState } from "react";
import { modifierUtilisateurAction, UtilisateurActionState } from "../actions";

const etatInitial: UtilisateurActionState = {};

export default function ModifierUtilisateurForm({
  id,
  nomInitial,
  emailInitial,
}: {
  id: number;
  nomInitial: string;
  emailInitial: string;
}) {
  const actionAvecId = modifierUtilisateurAction.bind(null, id);
  const [state, formAction, isPending] = useActionState(actionAvecId, etatInitial);

  return (
    <form action={formAction} className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
        <input
          name="nom"
          defaultValue={nomInitial}
          required
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email (identifiant)</label>
        <input
          name="email"
          type="email"
          defaultValue={emailInitial}
          required
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Nouveau mot de passe (laisser vide pour ne pas le changer)
        </label>
        <input
          name="motDePasse"
          type="password"
          minLength={6}
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {state.error}
        </p>
      )}
      {"ok" in state && state.ok && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          Compte mis à jour.
        </p>
      )}

      <button
        disabled={isPending}
        className="bg-slate-800 text-white text-sm px-4 py-2 rounded hover:bg-slate-700 disabled:opacity-50"
      >
        {isPending ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
