import { db } from "@/db";
import { pays, utilisateurs } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import donneesPays from "@/scripts/pays-iso.json";

export const dynamic = "force-dynamic";

/**
 * Route de mise en place initiale de l'environnement de production, pensée
 * pour être exécutée UNE FOIS depuis un simple navigateur (aucun outil à
 * installer). Protégée par SETUP_TOKEN (variable d'environnement) — sans ce
 * jeton, la route refuse toute action.
 *
 * Usage : GET /api/setup?token=XXX
 * Pour créer le premier compte administrateur en même temps :
 * GET /api/setup?token=XXX&adminNom=...&adminEmail=...&adminMotDePasse=...
 *
 * Idempotente : peut être appelée plusieurs fois sans risque (les tables déjà
 * créées, pays déjà présents, ou compte déjà existant sont simplement
 * ignorés / mis à jour).
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const token = params.get("token");

  if (!process.env.SETUP_TOKEN) {
    return texte("SETUP_TOKEN n'est pas configuré côté serveur. Ajoutez cette variable d'environnement avant d'utiliser cette route.", 500);
  }
  if (token !== process.env.SETUP_TOKEN) {
    return texte("Jeton invalide.", 403);
  }

  const rapport: string[] = [];

  // 1. Migration : création/mise à jour des tables (idempotente : ignore les
  // erreurs "existe déjà" et applique tous les fichiers de migration présents,
  // dans l'ordre, pas seulement le premier).
  try {
    const dossierMigrations = path.join(process.cwd(), "db", "migrations");
    const fichiers = fs
      .readdirSync(dossierMigrations)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    let nbExecuteesTotal = 0;
    let nbIgnoreesTotal = 0;

    for (const fichier of fichiers) {
      const contenu = fs.readFileSync(path.join(dossierMigrations, fichier), "utf-8");
      const instructions = contenu
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter(Boolean);

      for (const instruction of instructions) {
        try {
          await db.execute(sql.raw(instruction));
          nbExecuteesTotal++;
        } catch (err: unknown) {
          const code =
            (err as { code?: string })?.code ?? (err as { cause?: { code?: string } })?.cause?.code;
          // 42P07 = table existe déjà, 42710 = objet existe déjà (index, contrainte...)
          if (code === "42P07" || code === "42710") {
            nbIgnoreesTotal++;
          } else {
            throw err;
          }
        }
      }
    }
    rapport.push(
      `✅ Migration : ${fichiers.length} fichier(s) traité(s), ${nbExecuteesTotal} instruction(s) exécutée(s), ${nbIgnoreesTotal} déjà en place (ignorée(s)).`
    );
  } catch (err) {
    rapport.push(`❌ Migration échouée : ${err instanceof Error ? err.message : String(err)}`);
    return texte(rapport.join("\n"), 500);
  }

  // 2. Référentiel Pays
  try {
    await db
      .insert(pays)
      .values(donneesPays)
      .onConflictDoUpdate({ target: pays.code, set: { nom: sql`excluded.nom` } });
    rapport.push(`✅ Référentiel pays : ${donneesPays.length} pays insérés/mis à jour.`);
  } catch (err) {
    rapport.push(`❌ Seed pays échoué : ${err instanceof Error ? err.message : String(err)}`);
    return texte(rapport.join("\n"), 500);
  }

  // 3. Compte administrateur (optionnel, seulement si les 3 paramètres sont fournis)
  const adminNom = params.get("adminNom");
  const adminEmail = params.get("adminEmail")?.trim().toLowerCase();
  const adminMotDePasse = params.get("adminMotDePasse");

  if (adminNom && adminEmail && adminMotDePasse) {
    try {
      const motDePasseHash = await hashPassword(adminMotDePasse);
      const [existant] = await db.select().from(utilisateurs).where(eq(utilisateurs.email, adminEmail));
      if (existant) {
        await db.update(utilisateurs).set({ nom: adminNom, motDePasseHash }).where(eq(utilisateurs.id, existant.id));
        rapport.push(`✅ Compte administrateur mis à jour : ${adminEmail}`);
      } else {
        await db.insert(utilisateurs).values({ nom: adminNom, email: adminEmail, motDePasseHash });
        rapport.push(`✅ Compte administrateur créé : ${adminEmail}`);
      }
    } catch (err) {
      rapport.push(`❌ Création du compte admin échouée : ${err instanceof Error ? err.message : String(err)}`);
      return texte(rapport.join("\n"), 500);
    }
  } else {
    rapport.push("ℹ️ Aucun compte administrateur créé (paramètres adminNom / adminEmail / adminMotDePasse absents).");
  }

  rapport.push("\nTout est prêt. Vous pouvez maintenant vous connecter sur /login.");
  rapport.push("\n⚠️ Pensez à retirer la variable SETUP_TOKEN une fois terminé, pour désactiver cette route.");

  return texte(rapport.join("\n"), 200);
}

function texte(contenu: string, status: number) {
  return new Response(contenu, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
