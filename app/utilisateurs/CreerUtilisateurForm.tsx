"use client";

import { useActionState } from "react";
import { creerUtilisateurAction, UtilisateurActionState } from "./actions";

const etatInitial: UtilisateurActionState = {};

export default function CreerUtilisateurForm() {
  const [state, formAction, isPending] = useActionState(creerUtilisateurAction, etatInitial);

  return (
    <form
      action={formAction}
      className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap gap-3 items-end"
    >
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
        <input
          name="nom"
          required
          className="border border-slate-300 rounded px-3 py-2 text-sm"
          placeholder="Jean Dupont"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email (identifiant)</label>
        <input
          name="email"
          type="email"
          required
          className="border border-slate-300 rounded px-3 py-2 text-sm"
          placeholder="jean.dupont@terresdaventure.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label>
        <input
          name="motDePasse"
          type="password"
          required
          minLength={6}
          className="border border-slate-300 rounded px-3 py-2 text-sm"
        />
      </div>
      <button
        disabled={isPending}
        className="bg-slate-800 text-white text-sm px-4 py-2 rounded hover:bg-slate-700 disabled:opacity-50"
      >
        {isPending ? "Création..." : "Créer le compte"}
      </button>

      {state?.error && (
        <p className="w-full text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {state.error}
        </p>
      )}
      {"ok" in state && state.ok && (
        <p className="w-full text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          Compte créé.
        </p>
      )}
    </form>
  );
}
