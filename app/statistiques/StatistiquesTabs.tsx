"use client";

import { useState, ReactNode } from "react";

const ONGLETS = [
  { id: "globale", label: "Vue globale" },
  { id: "engages", label: "Vue entreprise sièges engagés" },
  { id: "reels", label: "Vue entreprise sièges réels" },
  { id: "bilan", label: "Bilan financier" },
] as const;

type OngletId = (typeof ONGLETS)[number]["id"];

export default function StatistiquesTabs({
  vueGlobale,
  vueEngages,
  vueReels,
  bilanFinancier,
}: {
  vueGlobale: ReactNode;
  vueEngages: ReactNode;
  vueReels: ReactNode;
  bilanFinancier: ReactNode;
}) {
  const [ongletActif, setOngletActif] = useState<OngletId>("globale");

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 flex gap-6">
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            onClick={() => setOngletActif(o.id)}
            className={`pb-2 text-sm font-medium border-b-2 -mb-px ${
              ongletActif === o.id
                ? "border-slate-800 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className={ongletActif === "globale" ? "" : "hidden"}>{vueGlobale}</div>
      <div className={ongletActif === "engages" ? "" : "hidden"}>{vueEngages}</div>
      <div className={ongletActif === "reels" ? "" : "hidden"}>{vueReels}</div>
      <div className={ongletActif === "bilan" ? "" : "hidden"}>{bilanFinancier}</div>
    </div>
  );
}
