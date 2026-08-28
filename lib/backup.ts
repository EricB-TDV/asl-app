import { db } from "@/db";
import { vols, entreprises, assignations, passagers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

/** Échappe une valeur JS en littéral SQL PostgreSQL. */
function sqlValeur(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (v instanceof Date) return `'${v.toISOString()}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

/** Ordre de dépendance (clés étrangères) pour un rechargement propre. */
const TABLES_DANS_ORDRE = [
  "pays",
  "entreprises",
  "utilisateurs",
  "vols",
  "assignations",
  "passagers",
] as const;

/**
 * Génère un dump SQL complet et autonome : schéma (toutes les migrations
 * présentes, dans l'ordre) + données (une instruction INSERT par table,
 * dans l'ordre des dépendances). Rechargeable sur une base neuve via
 * `psql "$DATABASE_URL" -f dump.sql` sans aucun autre outil.
 */
export async function genererDumpSql(): Promise<string> {
  const parties: string[] = [];

  parties.push(`-- Sauvegarde ASL générée le ${new Date().toISOString()}`);
  parties.push("-- Schéma (migrations)\n");

  const dossierMigrations = path.join(process.cwd(), "db", "migrations");
  const fichiers = fs
    .readdirSync(dossierMigrations)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const fichier of fichiers) {
    const contenu = fs.readFileSync(path.join(dossierMigrations, fichier), "utf-8");
    parties.push(`-- ${fichier}`);
    parties.push(contenu.replace(/--> statement-breakpoint/g, ";"));
    parties.push("");
  }

  parties.push("-- Données\n");
  parties.push("BEGIN;");

  for (const nomTable of TABLES_DANS_ORDRE) {
    const lignes = (await db.execute(
      sql.raw(`SELECT * FROM "${nomTable}"`)
    )) as unknown as Record<string, unknown>[];

    if (lignes.length === 0) {
      parties.push(`-- ${nomTable} : aucune donnée`);
      continue;
    }

    const colonnes = Object.keys(lignes[0]);
    const colonnesSql = colonnes.map((c) => `"${c}"`).join(", ");
    const valeursSql = lignes
      .map((ligne) => `  (${colonnes.map((c) => sqlValeur(ligne[c])).join(", ")})`)
      .join(",\n");

    parties.push(`INSERT INTO "${nomTable}" (${colonnesSql}) VALUES\n${valeursSql};`);
  }

  parties.push("COMMIT;");

  return parties.join("\n");
}

/**
 * Génère un classeur Excel à trois onglets (Vols, Assignations, Passagers),
 * lisible directement par un humain, en complément du dump SQL technique.
 */
export async function genererClasseurExcel(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  // --- Onglet Vols ---
  const feuilleVols = workbook.addWorksheet("Vols");
  feuilleVols.columns = [
    { header: "N° vol", key: "numeroVol", width: 12 },
    { header: "Sens", key: "sens", width: 10 },
    { header: "Aéroport départ", key: "aeroportDepart", width: 16 },
    { header: "Aéroport arrivée", key: "aeroportArrivee", width: 16 },
    { header: "Date de départ", key: "dateDepart", width: 14 },
    { header: "Date d'arrivée", key: "dateArrivee", width: 14 },
    { header: "Nb sièges", key: "nbSieges", width: 10 },
    { header: "Coût vol HT", key: "coutVolHt", width: 12 },
    { header: "Taxes", key: "taxes", width: 10 },
  ];
  feuilleVols.getRow(1).font = { bold: true };
  const tousLesVols = await db.select().from(vols);
  for (const v of tousLesVols) feuilleVols.addRow(v);

  // --- Onglet Assignations ---
  const feuilleAssignations = workbook.addWorksheet("Assignations");
  feuilleAssignations.columns = [
    { header: "N° vol", key: "numeroVol", width: 12 },
    { header: "Date du vol", key: "dateVol", width: 14 },
    { header: "Entreprise", key: "entrepriseNom", width: 24 },
    { header: "Total engagement", key: "nbEngagementTotal", width: 16 },
    { header: "Total free sale", key: "nbFreeSaleTotal", width: 16 },
    { header: "Prix engagement HT", key: "prixEngagementHt", width: 16 },
    { header: "Taxes engagement", key: "taxesEngagement", width: 16 },
    { header: "Prix free sale HT", key: "prixFreeSaleHt", width: 16 },
    { header: "Taxes free sale", key: "taxesFreeSale", width: 16 },
  ];
  feuilleAssignations.getRow(1).font = { bold: true };
  const toutesLesAssignations = await db
    .select({
      numeroVol: vols.numeroVol,
      dateVol: vols.dateDepart,
      entrepriseNom: entreprises.nom,
      nbEngagementTotal: assignations.nbEngagementTotal,
      nbFreeSaleTotal: assignations.nbFreeSaleTotal,
      prixEngagementHt: assignations.prixEngagementHt,
      taxesEngagement: assignations.taxesEngagement,
      prixFreeSaleHt: assignations.prixFreeSaleHt,
      taxesFreeSale: assignations.taxesFreeSale,
    })
    .from(assignations)
    .innerJoin(vols, eq(assignations.volId, vols.id))
    .innerJoin(entreprises, eq(assignations.entrepriseId, entreprises.id));
  for (const a of toutesLesAssignations) feuilleAssignations.addRow(a);

  // --- Onglet Passagers ---
  const feuillePassagers = workbook.addWorksheet("Passagers");
  feuillePassagers.columns = [
    { header: "N° vol", key: "numeroVol", width: 12 },
    { header: "Date du vol", key: "dateVol", width: 14 },
    { header: "Entreprise", key: "entrepriseNom", width: 24 },
    { header: "Type de siège", key: "typeSiege", width: 14 },
    { header: "Civilité", key: "civilite", width: 10 },
    { header: "Nom", key: "nom", width: 18 },
    { header: "Prénom", key: "prenom", width: 18 },
    { header: "Date de naissance", key: "dateNaissance", width: 16 },
    { header: "Genre", key: "genre", width: 8 },
    { header: "N° réservation", key: "numeroReservation", width: 16 },
    { header: "Nationalité", key: "nationaliteCodePays", width: 12 },
    { header: "Type document", key: "typeDocument", width: 14 },
    { header: "N° document", key: "numeroDocument", width: 16 },
    { header: "Pays émission document", key: "documentPaysEmissionCodePays", width: 20 },
    { header: "Date émission document", key: "dateEmissionDocument", width: 18 },
    { header: "Date expiration document", key: "dateExpirationDocument", width: 20 },
    { header: "N° siège", key: "seatRow", width: 10 },
    { header: "Excess bag", key: "excessBag", width: 12 },
  ];
  feuillePassagers.getRow(1).font = { bold: true };
  const tousLesPassagers = await db
    .select({
      numeroVol: vols.numeroVol,
      dateVol: vols.dateDepart,
      entrepriseNom: entreprises.nom,
      typeSiege: passagers.typeSiege,
      civilite: passagers.civilite,
      nom: passagers.nom,
      prenom: passagers.prenom,
      dateNaissance: passagers.dateNaissance,
      genre: passagers.genre,
      numeroReservation: passagers.numeroReservation,
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
    .innerJoin(vols, eq(passagers.volId, vols.id))
    .innerJoin(entreprises, eq(passagers.entrepriseId, entreprises.id));
  for (const p of tousLesPassagers) feuillePassagers.addRow(p);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
