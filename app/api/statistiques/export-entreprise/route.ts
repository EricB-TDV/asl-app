import { calculerVuesParEntreprise, VueParDirection } from "@/lib/statistiques";
import { isoVersDdmmyyyy } from "@/lib/dates";
import ExcelJS from "exceljs";
import { NextRequest } from "next/server";

function ajouterFeuille(workbook: ExcelJS.Workbook, nom: string, vue: VueParDirection, mode: "engages" | "reels") {
  const feuille = workbook.addWorksheet(nom);
  feuille.columns = [
    { header: "Date", key: "date", width: 14 },
    ...vue.entreprises.map((code) => ({ header: code, key: code, width: 10 })),
    { header: "Total", key: "total", width: 10 },
    { header: "Stock", key: "stock", width: 10 },
    { header: "Reste", key: "reste", width: 10 },
    { header: "%", key: "taux", width: 8 },
  ];
  feuille.getRow(1).font = { bold: true };

  for (const l of vue.lignes) {
    if (l.volId === null) {
      feuille.addRow({ date: isoVersDdmmyyyy(l.date) });
      continue;
    }
    const parEntreprise = mode === "engages" ? l.engages : l.reels;
    const total = mode === "engages" ? l.totalEngages : l.totalReels;
    const reste = mode === "engages" ? l.resteEngages : l.resteReels;
    const taux = mode === "engages" ? l.tauxEngages : l.tauxReels;
    const ligne: Record<string, string | number> = { date: isoVersDdmmyyyy(l.date) };
    for (const code of vue.entreprises) ligne[code] = parEntreprise[code] ?? 0;
    ligne.total = total;
    ligne.stock = l.stock ?? "";
    ligne.reste = reste ?? "";
    ligne.taux = taux != null ? `${(taux * 100).toFixed(0)} %` : "";
    feuille.addRow(ligne);
  }
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("mode");
  if (mode !== "engages" && mode !== "reels") {
    return new Response("Paramètre mode requis (engages | reels).", { status: 400 });
  }

  const { aller, retour } = await calculerVuesParEntreprise();

  const workbook = new ExcelJS.Workbook();
  ajouterFeuille(workbook, "Aller", aller, mode);
  ajouterFeuille(workbook, "Retour", retour, mode);

  const buffer = await workbook.xlsx.writeBuffer();
  const suffixe = mode === "engages" ? "sieges_engages" : "sieges_reels";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="statistiques_${suffixe}_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx"`,
    },
  });
}
