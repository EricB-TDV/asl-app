import { db } from "@/db";
import { vols, entreprises, passagers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isoVersDdmmyyyy } from "@/lib/dates";
import { COLONNES_EXPORT_ASL } from "@/lib/validation";
import Papa from "papaparse";
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
    DocumentNumber: l.numeroDocument,
    DocumentIssuingCountryCode: l.documentPaysEmissionCodePays,
    DocumentIssuanceDate: l.dateEmissionDocument ? isoVersDdmmyyyy(l.dateEmissionDocument) : "",
    DocumentExpiryDate: isoVersDdmmyyyy(l.dateExpirationDocument),
    // Non collectés (6.2) : colonnes conservées vides pour respecter le format imposé (8.)
    PassengerEmail: "",
    PassengerPhone: "",
    SeatRow: l.seatRow ?? "",
    ExcessBag: l.excessBag ?? "",
  }));

  const csv = Papa.unparse(donnees, { columns: [...COLONNES_EXPORT_ASL] });

  const nomFichier = `ASL_${vol.numeroVol}_${vol.dateDepart}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
    },
  });
}
