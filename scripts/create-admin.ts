/**
 * Crée (ou met à jour le mot de passe d') un compte administrateur.
 *
 * Usage : npx tsx scripts/create-admin.ts "Nom Prénom" email@exemple.com motdepasse
 */
import { db } from "../db";
import { utilisateurs } from "../db/schema";
import { hashPassword } from "../lib/auth";
import { eq } from "drizzle-orm";

async function main() {
  const [nom, email, motDePasse] = process.argv.slice(2);
  if (!nom || !email || !motDePasse) {
    console.error(
      'Usage : npx tsx scripts/create-admin.ts "Nom Prénom" email@exemple.com motdepasse'
    );
    process.exit(1);
  }

  const motDePasseHash = await hashPassword(motDePasse);
  const emailNormalise = email.trim().toLowerCase();

  const [existant] = await db
    .select()
    .from(utilisateurs)
    .where(eq(utilisateurs.email, emailNormalise));

  if (existant) {
    await db
      .update(utilisateurs)
      .set({ nom, motDePasseHash })
      .where(eq(utilisateurs.id, existant.id));
    console.log(`Compte existant mis à jour : ${emailNormalise}`);
  } else {
    await db.insert(utilisateurs).values({ nom, email: emailNormalise, motDePasseHash });
    console.log(`Compte administrateur créé : ${emailNormalise}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
