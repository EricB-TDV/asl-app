"use client";

import { useActionState } from "react";
import { importerPassagersCsvAction, ImportActionState } from "./actions";

type Option = { id: number; label: string };

const etatInitial: ImportActionState = {};

export default function ImportForm({
  volId,
  entreprises,
}: {
  volId: number;
  entreprises: Option[];
}) {
  const [state, formAction, isPending] = useActionState(importerPassagersCsvAction, etatInitial);

  return (
    <form action={formAction} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
      <h2 className="font-semibold text-slate-800">Importer une liste de passagers (CSV)</h2>
      <p className="text-xs text-slate-500">
        Le fichier doit respecter le format du modèle fourni. En cas d&apos;erreur, l&apos;import
        entier est rejeté et le détail des lignes en cause est affiché ci-dessous.
      </p>
      <input type="hidden" name="volId" value={volId} />

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Entreprise</label>
        <select
          name="entrepriseId"
          required
          className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
        >
          {entreprises.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Fichier CSV</label>
        <input
          type="file"
          name="fichier"
          accept=".csv"
          required
          className="w-full text-sm"
        />
      </div>

      {state?.error && (
        <pre className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 whitespace-pre-wrap max-h-64 overflow-auto">
          {state.error}
        </pre>
      )}
      {"ok" in state && state.ok && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          {state.nbImportes} passager(s) importé(s).
        </p>
      )}

      <button
        disabled={isPending}
        className="bg-slate-800 text-white text-sm px-4 py-2 rounded hover:bg-slate-700 disabled:opacity-50"
      >
        {isPending ? "Import..." : "Importer"}
      </button>
    </form>
  );
}
