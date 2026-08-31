"use client";

import { useActionState, useEffect } from "react";
import { modifierPassagerAction, PassagerActionState } from "./actions";

type Option = { id: number; label: string };

export type PassagerAModifier = {
  id: number;
  volId: number;
  entrepriseId: number;
  typeSiege: string;
  civilite: string;
  nom: string;
  prenom: string;
  dateNaissance: string;
  genre: string;
  numeroReservation: string | null;
  nationaliteCodePays: string;
  typeDocument: string;
  numeroDocument: string | null;
  documentPaysEmissionCodePays: string;
  dateEmissionDocument: string | null;
  dateExpirationDocument: string | null;
  seatRow: string | null;
  excessBag: string | null;
};

const etatInitial: PassagerActionState = {};

export default function ModifierPassagerModal({
  passager,
  entreprises,
  onFermer,
}: {
  passager: PassagerAModifier;
  entreprises: Option[];
  onFermer: () => void;
}) {
  const actionAvecId = modifierPassagerAction.bind(null, passager.id);
  const [state, formAction, isPending] = useActionState(actionAvecId, etatInitial);

  useEffect(() => {
    if ("ok" in state && state.ok) {
      onFermer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 className="font-semibold text-slate-800">
          Modifier le passager — {passager.nom} {passager.prenom}
        </h3>

        <form action={formAction} className="space-y-3">
          <input type="hidden" name="volId" value={passager.volId} />
          <div className="grid grid-cols-3 gap-3">
            <Select
              label="Entreprise"
              name="entrepriseId"
              options={entreprises}
              defaultValue={passager.entrepriseId}
            />
            <Select
              label="Type de siège"
              name="typeSiege"
              options={[
                { id: "Engagement", label: "Engagement" },
                { id: "Free-sale", label: "Free-sale" },
              ]}
              defaultValue={passager.typeSiege}
            />
            <Select
              label="Civilité"
              name="civilite"
              options={[
                { id: "MR", label: "MR" },
                { id: "MRS", label: "MRS" },
                { id: "MME", label: "MME" },
              ]}
              defaultValue={passager.civilite}
            />
            <Champ label="Nom" name="nom" defaultValue={passager.nom} />
            <Champ label="Prénom" name="prenom" defaultValue={passager.prenom} />
            <Champ
              label="Date de naissance"
              name="dateNaissance"
              type="date"
              defaultValue={passager.dateNaissance}
            />
            <Select
              label="Genre"
              name="genre"
              options={[
                { id: "M", label: "M" },
                { id: "F", label: "F" },
              ]}
              defaultValue={passager.genre}
            />
            <Champ
              label="N° réservation (optionnel)"
              name="numeroReservation"
              requis={false}
              defaultValue={passager.numeroReservation ?? ""}
            />
            <Champ
              label="Code pays nationalité"
              name="nationaliteCodePays"
              placeholder="FR"
              defaultValue={passager.nationaliteCodePays}
            />
            <Select
              label="Type de document"
              name="typeDocument"
              options={[
                { id: "PP", label: "Passeport (PP)" },
                { id: "CNI", label: "CNI" },
              ]}
              defaultValue={passager.typeDocument}
            />
            <Champ
              label="Numéro de document (optionnel)"
              name="numeroDocument"
              requis={false}
              defaultValue={passager.numeroDocument ?? ""}
            />
            <Champ
              label="Code pays émission document"
              name="documentPaysEmissionCodePays"
              placeholder="FR"
              defaultValue={passager.documentPaysEmissionCodePays}
            />
            <Champ
              label="Date d'émission document (optionnel)"
              name="dateEmissionDocument"
              type="date"
              requis={false}
              defaultValue={passager.dateEmissionDocument ?? ""}
            />
            <Champ
              label="Date d'expiration document (optionnel)"
              name="dateExpirationDocument"
              type="date"
              requis={false}
              defaultValue={passager.dateExpirationDocument ?? ""}
            />
            <Champ
              label="N° siège (optionnel)"
              name="seatRow"
              requis={false}
              defaultValue={passager.seatRow ?? ""}
            />
            <Champ
              label="Excess bag (optionnel)"
              name="excessBag"
              requis={false}
              defaultValue={passager.excessBag ?? ""}
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 whitespace-pre-line">
              {state.error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onFermer}
              disabled={isPending}
              className="text-sm px-4 py-2 rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="bg-slate-800 text-white text-sm px-4 py-2 rounded hover:bg-slate-700 disabled:opacity-50"
            >
              {isPending ? "Enregistrement..." : "Valider"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Champ({
  label,
  name,
  type = "text",
  placeholder,
  requis = true,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  requis?: boolean;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="flex items-end min-h-[2.25rem] text-xs font-medium text-slate-600 mb-1">
        {label}
      </label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={requis}
        defaultValue={defaultValue}
        className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
      />
    </div>
  );
}

function Select({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: { id: number | string; label: string }[];
  defaultValue?: number | string;
}) {
  return (
    <div>
      <label className="flex items-end min-h-[2.25rem] text-xs font-medium text-slate-600 mb-1">
        {label}
      </label>
      <select
        name={name}
        required
        defaultValue={defaultValue}
        className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
