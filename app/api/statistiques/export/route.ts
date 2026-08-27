import { calculerStatistiquesConsolidees } from "@/lib/statistiques";
import { isoVersDdmmyyyy } from "@/lib/dates";
import ExcelJS from "exceljs";

export async function GET() {
  const stats = await calculerStatistiquesConsolidees();

  const workbook = new ExcelJS.Workbook();
  const feuille = workbook.addWorksheet("Statistiques");

  feuille.columns = [
    { header: "FlightDate", key: "flightDate", width: 14 },
    { header: "OriginCode", key: "origin", width: 12 },
    { header: "DestinationCode", key: "destination", width: 16 },
    { header: "Nb seats occupied", key: "occupied", width: 18 },
    { header: "Nb seats free", key: "free", width: 14 },
    { header: "Nb seats total", key: "total", width: 14 },
    { header: "Taux remplissage", key: "taux", width: 16 },
    { header: "Sales HT", key: "ventes", width: 14 },
  ];
  feuille.getRow(1).font = { bold: true };

  for (const l of stats.lignes) {
    feuille.addRow({
      flightDate: isoVersDdmmyyyy(l.flightDate),
      origin: l.originCode,
      destination: l.destinationCode,
      occupied: l.nbSeatsOccupied,
      free: l.nbSeatsFree,
      total: l.nbSeatsTotal,
      taux: `${(l.tauxRemplissage * 100).toFixed(0)} %`,
      ventes: Math.round(l.salesHt * 100) / 100,
    });
  }

  const ligneTotal = feuille.addRow({
    flightDate: "Total",
    occupied: stats.totalOccupes,
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
