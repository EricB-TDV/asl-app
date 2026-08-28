import { db } from "@/db";
import { vols, entreprises, passagers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isoVersDdmmyyyy } from "@/lib/dates";
import { COLONNES_EXPORT_ASL } from "@/lib/validation";
import ExcelJS from "exceljs";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const volId = Number(request.nextUrl.searchParams.get("volId"));
  if (!volId) {
    return new Response("Paramètre volId requis.", { status: 400 });
  }

  const [vol] = await db.select().from(vols).where(eq(vols.id, volId));
  if (!vol) {
    return new Response("Vol introuvable.", { status: 404 });
  }

  const lignes = await db
    .select({
      entrepriseNom: entreprises.nom,
      civilite: passagers.civilite,
      nom: passagers.nom,
      prenom: passagers.prenom,
      dateNaissance: passagers.dateNaissance,
      numeroReservation: passagers.numeroReservation,
      genre: passagers.genre,
      nationaliteCodePays: passagers.nationaliteCodePays,
      typeDocument: passagers.typeDocument,
      numeroDocument: passagers.numeroDocument,
      documentPaysEmissionCodePays: passagers.documentPaysEmissionCodePays,
      dateEmissionDocument: passagers.dateEmissionDocument,
      dateExpirationDocument: passagers.dateExpirationDocument,
      seatRow: passagers.seatRow,
      excessBag: passagers.excessBag,
    })
    .from(passagers)
    .innerJoin(entreprises, eq(passagers.entrepriseId, entreprises.id))
    .where(eq(passagers.volId, volId));

  const donnees = lignes.map((l) => ({
    Brand: l.entrepriseNom,
    FlightDate: isoVersDdmmyyyy(vol.dateDepart),
    FlightNumber: vol.numeroVol,
    OriginCode: vol.aeroportDepart,
    DestinationCode: vol.aeroportArrivee,
    CivilityCode: l.civilite,
    Surname: l.nom,
    FirstName: l.prenom,
    BirthDate: isoVersDdmmyyyy(l.dateNaissance),
    BookingNumber: l.numeroReservation ?? "",
    Gender: l.genre,
    NationalityCountryCode: l.nationaliteCodePays,
    DocumentTypeCode: l.typeDocument,
    DocumentNumber: l.numeroDocument ?? "",
    DocumentIssuingCountryCode: l.documentPaysEmissionCodePays,
    DocumentIssuanceDate: l.dateEmissionDocument ? isoVersDdmmyyyy(l.dateEmissionDocument) : "",
    DocumentExpiryDate: l.dateExpirationDocument ? isoVersDdmmyyyy(l.dateExpirationDocument) : "",
    // Non collectés (6.2) : colonnes conservées vides pour respecter le format imposé (8.)
    PassengerEmail: "",
    PassengerPhone: "",
    SeatRow: l.seatRow ?? "",
    ExcessBag: l.excessBag ?? "",
  }));

  const workbook = new ExcelJS.Workbook();
  const feuille = workbook.addWorksheet("Liste ASL");

  feuille.columns = COLONNES_EXPORT_ASL.map((nom) => ({ header: nom, key: nom, width: 16 }));
  feuille.getRow(1).font = { bold: true };

  for (const ligne of donnees) {
    feuille.addRow(ligne);
  }
  // Toutes les valeurs (y compris les dates) restent du texte brut (format imposé par ASL),
  // jamais de type "date" Excel natif.
  feuille.eachRow((row) => {
    row.eachCell((cell) => {
      cell.numFmt = "@";
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const nomFichier = `ASL_${vol.numeroVol}_${vol.dateDepart}.xlsx`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
    },
  });
}
