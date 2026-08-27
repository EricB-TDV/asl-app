import { calculerStatistiquesConsolidees } from "@/lib/statistiques";
import ExcelJS from "exceljs";

export async function GET() {
  const stats = await calculerStatistiquesConsolidees();

  const workbook = new ExcelJS.Workbook();
  const feuille = workbook.addWorksheet("Statistiques");

  feuille.columns = [
    { header: "Entreprise", key: "entreprise", width: 28 },
    { header: "Sièges engagement", key: "engagement", width: 18 },
    { header: "Sièges free-sale", key: "freeSale", width: 18 },
    { header: "Total sièges", key: "total", width: 14 },
    { header: "Ventes HT (€)", key: "ventes", width: 16 },
  ];
  feuille.getRow(1).font = { bold: true };

  for (const l of stats.lignes) {
    feuille.addRow({
      entreprise: l.entrepriseNom,
      engagement: l.nbEngagement,
      freeSale: l.nbFreeSale,
      total: l.nbEngagement + l.nbFreeSale,
      ventes: Math.round(l.ventesHt * 100) / 100,
    });
  }

  const ligneTotal = feuille.addRow({
    entreprise: "Total",
    engagement: stats.totalEngagement,
    freeSale: stats.totalFreeSale,
    total: stats.totalEngagement + stats.totalFreeSale,
    ventes: Math.round(stats.totalVentesHt * 100) / 100,
  });
  ligneTotal.font = { bold: true };

  feuille.addRow({});
  feuille.addRow({
    entreprise: "Taux de remplissage global",
    engagement: `${(stats.tauxRemplissage * 100).toFixed(1)} %`,
  });

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
