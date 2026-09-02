import {
  lireParametresFinanciers,
  calculerVentesCumuleesADate,
  genererFinsDeMois,
} from "@/lib/statistiques";
import { isoVersDdmmyyyy } from "@/lib/dates";
import ExcelJS from "exceljs";

const LIGNES = [
  { cle: "coutsAsl" as const, label: "Coûts ASL" },
  { cle: "revisionCarburant" as const, label: "Révision carburant" },
  { cle: "apportMauritanie" as const, label: "Apport Mauritanie" },
  { cle: "fraisAdministratifs" as const, label: "Frais administratifs" },
  { cle: "fraisAeroportMauritanie" as const, label: "Frais aéroport Mauritanie" },
];

export async function GET() {
  const parametres = await lireParametresFinanciers();

  const sommeValeursInitiales =
    (parametres.coutsAsl ?? 0) +
    (parametres.revisionCarburant ?? 0) +
    (parametres.apportMauritanie ?? 0) +
    (parametres.fraisAdministratifs ?? 0) +
    (parametres.fraisAeroportMauritanie ?? 0);

  const aujourdHui = new Date().toISOString().slice(0, 10);
  const dates =
    parametres.saisonDebut && parametres.saisonFin
      ? genererFinsDeMois(parametres.saisonDebut, parametres.saisonFin)
      : [];

  const ventesParDate = new Map<string, number>();
  for (const date of dates) {
    if (date <= aujourdHui) {
      ventesParDate.set(date, await calculerVentesCumuleesADate(date));
    }
  }

  const workbook = new ExcelJS.Workbook();
  const feuille = workbook.addWorksheet("Bilan financier");

  feuille.columns = [
    { header: "", key: "label", width: 26 },
    { header: "Valeurs initiales", key: "initial", width: 16 },
    ...dates.map((d) => ({ header: isoVersDdmmyyyy(d), key: d, width: 14 })),
  ];
  feuille.getRow(1).font = { bold: true };

  for (const ligne of LIGNES) {
    const valeur = parametres[ligne.cle];
    const donnees: Record<string, string | number> = { label: ligne.label, initial: valeur ?? 0 };
    for (const d of dates) donnees[d] = valeur ?? 0;
    feuille.addRow(donnees).eachCell((cell, colNumber) => {
      if (colNumber > 1) cell.alignment = { horizontal: "right" };
    });
  }

  const ligneVentes: Record<string, string | number> = { label: "Ventes réalisées" };
  for (const d of dates) if (ventesParDate.has(d)) ligneVentes[d] = ventesParDate.get(d)!;
  feuille.addRow(ligneVentes).eachCell((cell, colNumber) => {
    if (colNumber > 1) cell.alignment = { horizontal: "right" };
  });

  const ligneResultat: Record<string, string | number> = { label: "Résultat financier" };
  for (const d of dates) {
    if (ventesParDate.has(d)) ligneResultat[d] = sommeValeursInitiales + ventesParDate.get(d)!;
  }
  const rowResultat = feuille.addRow(ligneResultat);
  rowResultat.font = { bold: true };
  rowResultat.eachCell((cell, colNumber) => {
    if (colNumber > 1) cell.alignment = { horizontal: "right" };
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="bilan_financier_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx"`,
    },
  });
}
