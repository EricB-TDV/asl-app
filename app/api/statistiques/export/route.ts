import { calculerStatistiquesConsolidees } from "@/lib/statistiques";
import { isoVersDdmmyyyy } from "@/lib/dates";
import ExcelJS from "exceljs";

export async function GET() {
  const stats = await calculerStatistiquesConsolidees();

  const workbook = new ExcelJS.Workbook();
  const feuille = workbook.addWorksheet("Statistiques");

  feuille.columns = [
    { header: "Date du vol", key: "flightDate", width: 14 },
    { header: "Origine", key: "origin", width: 12 },
    { header: "Destination", key: "destination", width: 16 },
    { header: "Sièges engagés", key: "engaged", width: 16 },
    { header: "Sièges occupés", key: "real", width: 16 },
    { header: "Sièges libres", key: "free", width: 14 },
    { header: "Sièges total", key: "total", width: 14 },
    { header: "Taux de remplissage", key: "taux", width: 18 },
    { header: "Ventes HT", key: "ventes", width: 14 },
  ];
  feuille.getRow(1).font = { bold: true };

  for (const l of stats.lignes) {
    feuille.addRow({
      flightDate: isoVersDdmmyyyy(l.flightDate),
      origin: l.originCode,
      destination: l.destinationCode,
      engaged: l.nbSeatsEngaged,
      real: l.nbSeatsReal,
      free: l.nbSeatsFree,
      total: l.nbSeatsTotal,
      taux: `${(l.tauxRemplissage * 100).toFixed(0)} %`,
      ventes: Math.round(l.salesHt * 100) / 100,
    });
  }

  const ligneTotal = feuille.addRow({
    flightDate: "Total",
    engaged: stats.totalEngages,
    real: stats.totalReels,
    free: stats.totalLibres,
    total: stats.totalSieges,
    taux: `${(stats.tauxRemplissageGlobal * 100).toFixed(0)} %`,
    ventes: Math.round(stats.totalVentesHt * 100) / 100,
  });
  ligneTotal.font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="statistiques_asl_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx"`,
    },
  });
}
