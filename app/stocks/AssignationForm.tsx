"use client";

import { useActionState } from "react";
import { creerOuModifierAssignationAction, AssignationActionState } from "./actions";

type VolOption = { id: number; label: string };
type EntrepriseOption = { id: number; label: string };

const etatInitial: AssignationActionState = {};

export default function AssignationForm({
  vols,
  entreprises,
}: {
  vols: VolOption[];
  entreprises: EntrepriseOption[];
}) {
  const [state, formAction, isPending] = useActionState(
    creerOuModifierAssignationAction,
    etatInitial
  );

  return (
    <form action={formAction} className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
      <h2 className="font-semibold text-slate-800">Créer / mettre à jour une assignation</h2>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Vol(s) — sélectionnez un ou plusieurs vols (Ctrl/Cmd + clic) pour appliquer la même
          quantité à chacun
        </label>
        <select
          name="volIds"
          multiple
          required
          size={6}
          className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
        >
          {vols.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

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

      <div className="grid grid-cols-3 gap-3">
        <Champ label="Sièges engagement" name="nbEngagementTotal" type="number" defaultValue="0" />
        <Champ label="Prix engagement HT" name="prixEngagementHt" type="number" step="0.01" />
        <Champ label="Taxes engagement" name="taxesEngagement" type="number" step="0.01" />
        <Champ label="Sièges free sale" name="nbFreeSaleTotal" type="number" defaultValue="0" />
        <Champ label="Prix free sale HT" name="prixFreeSaleHt" type="number" step="0.01" />
        <Champ label="Taxes free sale" name="taxesFreeSale" type="number" step="0.01" />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 whitespace-pre-line">
          {state.error}
        </p>
      )}
      {"ok" in state && state.ok && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          Assignation enregistrée.
        </p>
      )}

      <button
        disabled={isPending}
        className="bg-slate-800 text-white text-sm px-4 py-2 rounded hover:bg-slate-700 disabled:opacity-50"
      >
        {isPending ? "Enregistrement..." : "Créer l'assignation"}
      </button>
    </form>
  );
}

function Champ({
  label,
  name,
  type = "text",
  step,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  step?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
      />
    </div>
  );
}
