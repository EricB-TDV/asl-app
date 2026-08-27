"use client";

import { useActionState } from "react";
import { creerPassagerAction, PassagerActionState } from "./actions";

type Option = { id: number; label: string };

const etatInitial: PassagerActionState = {};

export default function PassagerForm({
  volId,
  entreprises,
}: {
  volId: number;
  entreprises: Option[];
}) {
  const [state, formAction, isPending] = useActionState(creerPassagerAction, etatInitial);

  return (
    <form action={formAction} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
      <h2 className="font-semibold text-slate-800">Enregistrer un passager</h2>
      <input type="hidden" name="volId" value={volId} />

      <div className="grid grid-cols-3 gap-3">
        <Select label="Entreprise" name="entrepriseId" options={entreprises} />
        <Select
          label="Type de siège"
          name="typeSiege"
          options={[
            { id: "Engagement", label: "Engagement" },
            { id: "Free-sale", label: "Free-sale" },
          ]}
        />
        <Select
          label="Civilité"
          name="civilite"
          options={[
            { id: "MR", label: "MR" },
            { id: "MRS", label: "MRS" },
            { id: "MME", label: "MME" },
          ]}
        />
        <Champ label="Nom" name="nom" />
        <Champ label="Prénom" name="prenom" />
        <Champ label="Date de naissance" name="dateNaissance" type="date" />
        <Select
          label="Genre"
          name="genre"
          options={[
            { id: "M", label: "M" },
            { id: "F", label: "F" },
          ]}
        />
        <Champ label="N° réservation (optionnel)" name="numeroReservation" requis={false} />
        <Champ label="Code pays nationalité" name="nationaliteCodePays" placeholder="FR" />
        <Select
          label="Type de document"
          name="typeDocument"
          options={[
            { id: "PP", label: "Passeport (PP)" },
            { id: "CNI", label: "CNI" },
          ]}
        />
        <Champ label="Numéro de document" name="numeroDocument" />
        <Champ
          label="Code pays émission document"
          name="documentPaysEmissionCodePays"
          placeholder="FR"
        />
        <Champ
          label="Date d'émission document (optionnel)"
          name="dateEmissionDocument"
          type="date"
          requis={false}
        />
        <Champ label="Date d'expiration document" name="dateExpirationDocument" type="date" />
        <Champ label="N° siège (optionnel)" name="seatRow" requis={false} />
        <Champ label="Excess bag (optionnel)" name="excessBag" requis={false} />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 whitespace-pre-line">
          {state.error}
        </p>
      )}
      {"ok" in state && state.ok && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          Passager enregistré.
        </p>
      )}

      <button
        disabled={isPending}
        className="bg-slate-800 text-white text-sm px-4 py-2 rounded hover:bg-slate-700 disabled:opacity-50"
      >
        {isPending ? "Enregistrement..." : "Enregistrer le passager"}
      </button>
    </form>
  );
}

function Champ({
  label,
  name,
  type = "text",
  placeholder,
  requis = true,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  requis?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={requis}
        className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
      />
    </div>
  );
}

function Select({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: { id: number | string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <select name={name} required className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
