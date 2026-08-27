/**
 * Pré-remplit la table `pays` avec le référentiel ISO 3166-1 alpha-2
 * (11.5 du cahier des charges). Le fichier pays-iso.json a été généré une
 * fois à partir de la bibliothèque Python `pycountry` (traductions
 * françaises officielles ISO), puis figé ici : il n'y a pas besoin de le
 * régénérer sauf mise à jour de la norme ISO 3166-1.
 *
 * Usage : npx tsx scripts/seed-pays.ts
 */
import { db } from "../db";
import { pays } from "../db/schema";
import donnees from "./pays-iso.json";

async function main() {
  console.log(`Insertion de ${donnees.length} pays...`);
  await db
    .insert(pays)
    .values(donnees)
    .onConflictDoUpdate({
      target: pays.code,
      set: { nom: sqlExcludedNom() },
    });
  console.log("Terminé.");
  process.exit(0);
}

// Petit helper pour l'upsert Drizzle (met à jour le nom si le code existe déjà).
function sqlExcludedNom() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { sql } = require("drizzle-orm");
  return sql`excluded.nom`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
