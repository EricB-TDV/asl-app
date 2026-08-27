/**
 * Test end-to-end de la logique métier (contourne le protocole interne des
 * server actions Next.js, mais appelle exactement les mêmes fonctions que
 * l'interface). Usage : npx tsx scripts/test-e2e.ts
 */
import { db } from "../db";
import { entreprises, vols, assignations, passagers, utilisateurs } from "../db/schema";
import { creerEntreprise } from "../app/entreprises/actions";
import { creerVolUnitaire, supprimerVol } from "../app/vols/actions";
import { creerOuModifierAssignation } from "../app/stocks/actions";
import { creerPassager, supprimerPassager, importerPassagersCsv } from "../app/passagers/actions";
import { creerUtilisateur, supprimerUtilisateur } from "../app/utilisateurs/actions";
import { calculerStatistiquesConsolidees } from "../lib/statistiques";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import fs from "fs";

let nbOk = 0;
let nbKo = 0;

function verifier(label: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`✅ ${label}`);
    nbOk++;
  } else {
    console.log(`❌ ${label}`, detail ?? "");
    nbKo++;
  }
}

function formData(obj: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(obj)) fd.set(k, v);
  return fd;
}

async function main() {
  console.log("--- Nettoyage des données de test précédentes ---");
  await db.delete(passagers);
  await db.delete(assignations);
  await db.delete(vols);
  await db.delete(entreprises);
  await db.delete(utilisateurs).where(sql`email = 'second@terdav.com'`);

  console.log("\n--- 1. Entreprise ---");
  const resEntreprise = await creerEntreprise(formData({ nom: "Point Afrique Test" }));
  verifier("Création entreprise OK", !("error" in resEntreprise), resEntreprise);
  const [entreprise] = await db.select().from(entreprises).where(eq(entreprises.nom, "Point Afrique Test"));
  verifier("Entreprise retrouvée en base", !!entreprise);

  console.log("\n--- 2. Vol ---");
  const resVol = await creerVolUnitaire(
    formData({
      numeroVol: "5O707",
      aeroportDepart: "CDG",
      aeroportArrivee: "ATR",
      dateDepart: "2026-12-05",
      dateArrivee: "2026-12-05",
      nbSieges: "10",
      coutVolHt: "5000",
      taxes: "500",
      sens: "aller",
    })
  );
  verifier("Création vol OK", !("error" in resVol), resVol);
  const [vol] = await db.select().from(vols).where(eq(vols.numeroVol, "5O707"));
  verifier("Vol retrouvé en base (10 sièges)", vol?.nbSieges === 10);

  console.log("\n--- 3. Assignation (5 engagement + 3 free-sale = 8 <= 10) ---");
  const resAssignationOk = await creerOuModifierAssignation(
    formData({
      entrepriseId: String(entreprise.id),
      nbEngagementTotal: "5",
      nbFreeSaleTotal: "3",
    }).also((fd) => fd.append("volIds", String(vol.id)))
  );
  verifier("Assignation dans la limite acceptée", !("error" in resAssignationOk), resAssignationOk);

  console.log("\n--- 4. Anti-surbooking (nouvelle entreprise, 4 sièges alors qu'il n'en reste que 2) ---");
  const resEntreprise2 = await creerEntreprise(formData({ nom: "Allibert Test" }));
  verifier("Création 2e entreprise OK", !("error" in resEntreprise2));
  const [entreprise2] = await db.select().from(entreprises).where(eq(entreprises.nom, "Allibert Test"));

  const resSurbooking = await creerOuModifierAssignation(
    formData({
      entrepriseId: String(entreprise2.id),
      nbEngagementTotal: "4",
      nbFreeSaleTotal: "0",
    }).also((fd) => fd.append("volIds", String(vol.id)))
  );
  verifier(
    "Anti-surbooking déclenché (8+4=12 > 10 sièges)",
    "error" in resSurbooking,
    resSurbooking
  );

  console.log("\n--- 5. Assignation dans la limite restante (2 sièges pile) ---");
  const resAssignationLimite = await creerOuModifierAssignation(
    formData({
      entrepriseId: String(entreprise2.id),
      nbEngagementTotal: "2",
      nbFreeSaleTotal: "0",
    }).also((fd) => fd.append("volIds", String(vol.id)))
  );
  verifier("Assignation exactement à la limite acceptée", !("error" in resAssignationLimite), resAssignationLimite);

  console.log("\n--- 6. Passager (saisie manuelle) ---");
  const resPassager = await creerPassager(
    formData({
      volId: String(vol.id),
      entrepriseId: String(entreprise.id),
      typeSiege: "Engagement",
      civilite: "MR",
      nom: "DUPONT",
      prenom: "Jean",
      dateNaissance: "1980-05-12",
      genre: "M",
      nationaliteCodePays: "FR",
      typeDocument: "PP",
      numeroDocument: "X1234567",
      documentPaysEmissionCodePays: "FR",
      dateExpirationDocument: "2030-01-01",
    })
  );
  verifier("Création passager OK", !("error" in resPassager), resPassager);

  console.log("\n--- 7. Anti-doublon passager (même vol) ---");
  const resDoublon = await creerPassager(
    formData({
      volId: String(vol.id),
      entrepriseId: String(entreprise.id),
      typeSiege: "Engagement",
      civilite: "MR",
      nom: "DUPONT",
      prenom: "Jean",
      dateNaissance: "1980-05-12",
      genre: "M",
      nationaliteCodePays: "FR",
      typeDocument: "PP",
      numeroDocument: "X1234567",
      documentPaysEmissionCodePays: "FR",
      dateExpirationDocument: "2030-01-01",
    })
  );
  verifier("Doublon rejeté", "error" in resDoublon, resDoublon);

  console.log("\n--- 8. Suppression de vol bloquée (passager présent) ---");
  const resSuppressionBloquee = await supprimerVol(vol.id);
  verifier("Suppression du vol refusée", "error" in resSuppressionBloquee, resSuppressionBloquee);

  console.log("\n--- 9. Suppression du passager puis suppression du vol ---");
  const [passagerCree] = await db.select().from(passagers).where(eq(passagers.numeroDocument, "X1234567"));
  await supprimerPassager(passagerCree.id);
  const resSuppressionOk = await supprimerVol(vol.id);
  verifier("Suppression du vol acceptée après retrait du passager", !("error" in resSuppressionOk), resSuppressionOk);

  console.log("\n--- 10. Import Excel (.xlsx, fichier valide) ---");
  const [vol2Res] = await db
    .insert(vols)
    .values({
      numeroVol: "5O708",
      aeroportDepart: "ATR",
      aeroportArrivee: "CDG",
      dateDepart: "2026-12-06",
      dateArrivee: "2026-12-06",
      nbSieges: 50,
      coutVolHt: "5000",
      taxes: "500",
      sens: "retour",
    })
    .returning();
  await db.insert(assignations).values({
    volId: vol2Res.id,
    entrepriseId: entreprise.id,
    nbEngagementTotal: 5,
    nbFreeSaleTotal: 5,
    prixEngagementHt: "350",
    prixFreeSaleHt: "300",
  });

  const cheminExcel = "/tmp/test_import.xlsx";
  const bufferExcel = fs.readFileSync(cheminExcel);
  const fichierValide = new File([bufferExcel], "test.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const fdImportOk = new FormData();
  fdImportOk.set("volId", String(vol2Res.id));
  fdImportOk.set("entrepriseId", String(entreprise.id));
  fdImportOk.set("fichier", fichierValide);
  const resImportOk = await importerPassagersCsv(fdImportOk);
  verifier("Import Excel valide accepté (2 lignes)", !("error" in resImportOk), resImportOk);

  console.log("\n--- 11. Statistiques par vol ---");
  const stats = await calculerStatistiquesConsolidees();
  const ligneVol2 = stats.lignes.find((l) => l.volId === vol2Res.id);
  verifier("Une ligne de statistique existe pour le vol 5O708", !!ligneVol2, stats.lignes);
  verifier(
    "2 sièges occupés sur le vol 5O708 (1 engagement + 1 free-sale)",
    ligneVol2?.nbSeatsOccupied === 2,
    ligneVol2
  );
  verifier(
    "Ventes HT = 350 (engagement) + 300 (free-sale) = 650",
    ligneVol2?.salesHt === 650,
    ligneVol2
  );

  console.log("\n--- 12. Import Excel invalide (champ obligatoire manquant + date invalide) ---");
  const csvInvalide = [
    "SeatType,CivilityCode,Surname,Firstname,BirthDate,BookingNumber,Gender,NationalityCountryCode,DocumentType,DocumentNumber,DocumentIssuingCountryCode,DocumentIssuanceDate,DocumentExpiryDate,PassengerEmail,PassengerPhone,SeatRow",
    "Engagement,MR,,Robert,31-12-1980,,M,FR,PP,Z0000001,FR,,2031-01-01,,,",
  ].join("\n");
  const fichierInvalide = new File([csvInvalide], "test-invalide.csv", { type: "text/csv" });
  const fdImportKo = new FormData();
  fdImportKo.set("volId", String(vol2Res.id));
  fdImportKo.set("entrepriseId", String(entreprise.id));
  fdImportKo.set("fichier", fichierInvalide);
  const resImportKo = await importerPassagersCsv(fdImportKo);
  verifier("Import CSV invalide rejeté en totalité", "error" in resImportKo);
  if ("error" in resImportKo) {
    console.log("   Détail de l'erreur retournée :\n" + resImportKo.error);
  }

  console.log("\n--- 13. Gestion des comptes administrateurs ---");
  // Compte de départ nécessaire (créé par create-admin.ts en amont du test complet)
  const [adminExistant] = await db.select().from(utilisateurs).limit(1);
  if (!adminExistant) {
    console.log("⚠️  Aucun compte administrateur en base, section ignorée (lancez create-admin.ts d'abord).");
  } else {
    const fd1 = formData({ nom: "Second Admin", email: "second@terdav.com", motDePasse: "motdepasse123" });
    const resCreation = await creerUtilisateur(fd1);
    verifier("Création d'un 2e compte admin OK", !("error" in resCreation), resCreation);

    const fd2 = formData({ nom: "Doublon", email: "second@terdav.com", motDePasse: "motdepasse123" });
    const resDoublon = await creerUtilisateur(fd2);
    verifier("Création rejetée si email déjà utilisé", "error" in resDoublon, resDoublon);

    const [secondAdmin] = await db
      .select()
      .from(utilisateurs)
      .where(eq(utilisateurs.email, "second@terdav.com"));

    const resSuppressionOk = await supprimerUtilisateur(secondAdmin.id);
    verifier("Suppression du 2e compte admin OK", !("error" in resSuppressionOk), resSuppressionOk);

    const [{ count: nbRestants }] = await db
      .select({ count: sql`count(*)` })
      .from(utilisateurs);
    const resSuppressionDernier = await supprimerUtilisateur(adminExistant.id);
    verifier(
      "Suppression du dernier compte admin refusée",
      "error" in resSuppressionDernier,
      { nbRestants, resSuppressionDernier }
    );
  }

  console.log(`\n=== Résultat : ${nbOk} OK, ${nbKo} KO ===`);
  process.exit(nbKo > 0 ? 1 : 0);
}

// Petit utilitaire pour chaîner un ajout sur un FormData déjà construit.
declare global {
  interface FormData {
    also(fn: (fd: FormData) => void): FormData;
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(FormData.prototype as any).also = function (fn: (fd: FormData) => void) {
  fn(this);
  return this;
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
