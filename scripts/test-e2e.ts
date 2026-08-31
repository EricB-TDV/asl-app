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
import { eq, and, ne } from "drizzle-orm";
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

  console.log("\n--- 11. Statistiques par vol (engagement = consommé) ---");
  const stats = await calculerStatistiquesConsolidees();
  const ligneVol2 = stats.lignes.find((l) => l.volId === vol2Res.id);
  verifier("Une ligne de statistique existe pour le vol 5O708", !!ligneVol2, stats.lignes);
  verifier(
    "Sièges occupés = 5 (engagement attribué, consommé) + 1 (free-sale réellement enregistré) = 6",
    ligneVol2?.nbSeatsOccupied === 6,
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

  console.log("\n--- 14. Vols triés par ordre chronologique croissant ---");
  const volA = await db
    .insert(vols)
    .values({
      numeroVol: "5O709",
      aeroportDepart: "CDG",
      aeroportArrivee: "ATR",
      dateDepart: "2027-01-01",
      dateArrivee: "2027-01-01",
      nbSieges: 100,
      coutVolHt: "1000",
      taxes: "100",
      sens: "aller",
    })
    .returning();
  const volB = await db
    .insert(vols)
    .values({
      numeroVol: "5O710",
      aeroportDepart: "CDG",
      aeroportArrivee: "ATR",
      dateDepart: "2026-06-01",
      dateArrivee: "2026-06-01",
      nbSieges: 100,
      coutVolHt: "1000",
      taxes: "100",
      sens: "aller",
    })
    .returning();
  const { asc } = await import("drizzle-orm");
  const volsTries = await db.select().from(vols).orderBy(asc(vols.dateDepart));
  const indexA = volsTries.findIndex((v) => v.id === volA[0].id);
  const indexB = volsTries.findIndex((v) => v.id === volB[0].id);
  verifier(
    "Le vol du 01/06/2026 apparaît avant celui du 01/01/2027 (tri croissant)",
    indexB < indexA,
    { indexA, indexB }
  );
  await db.delete(vols).where(eq(vols.id, volA[0].id));
  await db.delete(vols).where(eq(vols.id, volB[0].id));

  console.log("\n--- 15. Message exact de blocage de suppression de vol ---");
  const entreprisePourTest = await creerEntreprise(formData({ nom: "Test Suppression Vol" }));
  verifier("Création entreprise OK", !("error" in entreprisePourTest));
  const [entrepriseSup] = await db
    .select()
    .from(entreprises)
    .where(eq(entreprises.nom, "Test Suppression Vol"));
  const volSup = await db
    .insert(vols)
    .values({
      numeroVol: "5O711",
      aeroportDepart: "CDG",
      aeroportArrivee: "ATR",
      dateDepart: "2026-07-01",
      dateArrivee: "2026-07-01",
      nbSieges: 10,
      coutVolHt: "1000",
      taxes: "100",
      sens: "aller",
    })
    .returning();
  await db.insert(assignations).values({
    volId: volSup[0].id,
    entrepriseId: entrepriseSup.id,
    nbEngagementTotal: 5,
    nbFreeSaleTotal: 5,
  });
  await creerPassager(
    formData({
      volId: String(volSup[0].id),
      entrepriseId: String(entrepriseSup.id),
      typeSiege: "Engagement",
      civilite: "MR",
      nom: "TESTSUP",
      prenom: "Jean",
      dateNaissance: "1980-01-01",
      genre: "M",
      nationaliteCodePays: "FR",
      documentPaysEmissionCodePays: "FR",
    })
  );
  const resSuppressionMessage = await supprimerVol(volSup[0].id);
  verifier(
    "Message exact retourné lors du blocage de suppression",
    "error" in resSuppressionMessage &&
      resSuppressionMessage.error ===
        "Des passagers sont enregistrés sur ce vol, les supprimer avant de supprimer le vol.",
    resSuppressionMessage
  );

  console.log("\n--- 16. Passager sans numéro de document ni date d'expiration (3.3) ---");
  const resPassagerSansDoc = await creerPassager(
    formData({
      volId: String(volSup[0].id),
      entrepriseId: String(entrepriseSup.id),
      typeSiege: "Free-sale",
      civilite: "MRS",
      nom: "SANSDOC",
      prenom: "Marie",
      dateNaissance: "1985-05-05",
      genre: "F",
      nationaliteCodePays: "FR",
      documentPaysEmissionCodePays: "FR",
    })
  );
  verifier(
    "Passager créé sans numéro de document ni date d'expiration",
    !("error" in resPassagerSansDoc),
    resPassagerSansDoc
  );

  console.log("\n--- 17. Modification rapide des montants d'une assignation (2.4) ---");
  const { modifierMontantsAssignation } = await import("../app/stocks/actions");
  const [assignationSup] = await db
    .select()
    .from(assignations)
    .where(eq(assignations.volId, volSup[0].id));
  const resModifMontants = await modifierMontantsAssignation({
    assignationId: assignationSup.id,
    nbEngagementTotal: 8,
    nbFreeSaleTotal: 2,
  });
  verifier("Modification des montants acceptée", !("error" in resModifMontants), resModifMontants);
  const resModifMontantsTropBas = await modifierMontantsAssignation({
    assignationId: assignationSup.id,
    nbEngagementTotal: 0,
    nbFreeSaleTotal: 0,
  });
  verifier(
    "Modification refusée si en-dessous des passagers déjà enregistrés (1 engagement enregistré)",
    "error" in resModifMontantsTropBas,
    resModifMontantsTropBas
  );

  console.log("\n--- 18. Suppression en masse des passagers (3.4) ---");
  const { supprimerTousPassagersDuVol, supprimerPassagersDuVolPourEntreprise } = await import(
    "../app/passagers/actions"
  );
  const [{ count: avantSuppression }] = await db
    .select({ count: sql`count(*)` })
    .from(passagers)
    .where(eq(passagers.volId, volSup[0].id));
  verifier("2 passagers présents avant suppression en masse", Number(avantSuppression) === 2);

  const resSuppressionEntreprise = await supprimerPassagersDuVolPourEntreprise(
    volSup[0].id,
    entrepriseSup.id
  );
  verifier(
    "Suppression par entreprise : 2 passagers supprimés",
    "nbSupprimes" in resSuppressionEntreprise && resSuppressionEntreprise.nbSupprimes === 2,
    resSuppressionEntreprise
  );

  const resSuppressionVolVide = await supprimerTousPassagersDuVol(volSup[0].id);
  verifier(
    "Suppression totale sur un vol déjà vide ne plante pas (0 supprimé)",
    "nbSupprimes" in resSuppressionVolVide && resSuppressionVolVide.nbSupprimes === 0,
    resSuppressionVolVide
  );

  await db.delete(assignations).where(eq(assignations.volId, volSup[0].id));
  await db.delete(vols).where(eq(vols.id, volSup[0].id));

  console.log("\n--- 19. Cinématique de remplacement à l'import (2e import) ---");
  // Ajout manuel d'un passager supplémentaire pour la même entreprise/vol
  // (doit s'ajouter, sans écraser les 2 déjà importés au test 10).
  const resAjoutManuelAvantReimport = await creerPassager(
    formData({
      volId: String(vol2Res.id),
      entrepriseId: String(entreprise.id),
      typeSiege: "Engagement",
      civilite: "MR",
      nom: "AJOUTMANUEL",
      prenom: "Avant",
      dateNaissance: "1970-01-01",
      genre: "M",
      nationaliteCodePays: "FR",
      documentPaysEmissionCodePays: "FR",
    })
  );
  verifier("Ajout manuel supplémentaire OK (additif)", !("error" in resAjoutManuelAvantReimport));

  const [{ count: avantReimport }] = await db
    .select({ count: sql`count(*)` })
    .from(passagers)
    .where(and(eq(passagers.volId, vol2Res.id), eq(passagers.entrepriseId, entreprise.id)));
  verifier("3 passagers pour cette entreprise avant le 2e import (2 importés + 1 manuel)", Number(avantReimport) === 3);

  // Un nouvel import pour la même entreprise/vol doit tout remplacer : les 3
  // existants (dont le manuel) disparaissent, seuls les 2 du nouveau fichier restent.
  const csvReimport = [
    "SeatType,CivilityCode,Surname,Firstname,BirthDate,BookingNumber,Gender,NationalityCountryCode,DocumentType,DocumentNumber,DocumentIssuingCountryCode,DocumentIssuanceDate,DocumentExpiryDate,PassengerEmail,PassengerPhone,SeatRow",
    "Engagement,MR,NOUVEAU,Un,10/10/1980,,M,FR,PP,,FR,,,,,",
    "Engagement,MR,NOUVEAU,Deux,11/11/1981,,M,FR,PP,,FR,,,,,",
  ].join("\n");
  const fichierReimport = new File([csvReimport], "reimport.csv", { type: "text/csv" });
  const fdReimport = new FormData();
  fdReimport.set("volId", String(vol2Res.id));
  fdReimport.set("entrepriseId", String(entreprise.id));
  fdReimport.set("fichier", fichierReimport);
  const resReimport = await importerPassagersCsv(fdReimport);
  verifier("2e import accepté", !("error" in resReimport), resReimport);

  const apresReimport = await db
    .select()
    .from(passagers)
    .where(and(eq(passagers.volId, vol2Res.id), eq(passagers.entrepriseId, entreprise.id)));
  verifier("Exactement 2 passagers après le 2e import (remplacement total)", apresReimport.length === 2);
  verifier(
    "Le passager saisi manuellement (AJOUTMANUEL) a bien été supprimé par le 2e import",
    !apresReimport.some((p) => p.nom === "AJOUTMANUEL"),
    apresReimport.map((p) => p.nom)
  );
  verifier(
    "Les anciens passagers importés au 1er import (MARTIN, DURAND) ont aussi été supprimés",
    !apresReimport.some((p) => p.nom === "MARTIN" || p.nom === "DURAND"),
    apresReimport.map((p) => p.nom)
  );

  console.log("\n--- 20. Modification d'un passager existant ---");
  const [passagerAModifier] = await db
    .select()
    .from(passagers)
    .where(eq(passagers.volId, vol2Res.id));
  const fdModif = formData({
    volId: String(vol2Res.id),
    entrepriseId: String(entreprise.id),
    typeSiege: passagerAModifier.typeSiege,
    civilite: "MRS",
    nom: "NOUVEAUNOM",
    prenom: passagerAModifier.prenom,
    dateNaissance: passagerAModifier.dateNaissance,
    genre: passagerAModifier.genre,
    nationaliteCodePays: passagerAModifier.nationaliteCodePays,
    typeDocument: passagerAModifier.typeDocument,
    documentPaysEmissionCodePays: passagerAModifier.documentPaysEmissionCodePays,
  });
  const { modifierPassager } = await import("../app/passagers/actions");
  const resModifPassager = await modifierPassager(passagerAModifier.id, fdModif);
  verifier("Modification du passager acceptée", !("error" in resModifPassager), resModifPassager);
  const [passagerModifie] = await db
    .select()
    .from(passagers)
    .where(eq(passagers.id, passagerAModifier.id));
  verifier(
    "Le nom a bien été mis à jour en base",
    passagerModifie.nom === "NOUVEAUNOM" && passagerModifie.civilite === "MRS",
    passagerModifie
  );

  console.log("\n--- 21. Modification refusée si doublon avec un autre passager du même vol ---");
  const [autrePassagerDuVol] = await db
    .select()
    .from(passagers)
    .where(and(eq(passagers.volId, vol2Res.id), ne(passagers.id, passagerAModifier.id)));
  const fdModifDoublon = formData({
    volId: String(vol2Res.id),
    entrepriseId: String(entreprise.id),
    typeSiege: passagerAModifier.typeSiege,
    civilite: "MR",
    nom: autrePassagerDuVol.nom,
    prenom: autrePassagerDuVol.prenom,
    dateNaissance: autrePassagerDuVol.dateNaissance,
    genre: "M",
    nationaliteCodePays: "FR",
    typeDocument: "PP",
    documentPaysEmissionCodePays: "FR",
  });
  const resModifDoublon = await modifierPassager(passagerAModifier.id, fdModifDoublon);
  verifier("Modification refusée en cas de doublon avec un autre passager", "error" in resModifDoublon, resModifDoublon);

  console.log(`\n=== Résultat : ${nbOk} OK, ${nbKo} KO ===`);  process.exit(nbKo > 0 ? 1 : 0);
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
