"use server";

import { db } from "@/db";
import { passagers } from "@/db/schema";
import { passagerSchema, CHAMPS_OBLIGATOIRES_IMPORT_CSV } from "@/lib/validation";
import { verifierContingentEntreprisePourAjoutPassagers } from "@/lib/rules";
import { ddmmyyyyVersIso } from "@/lib/dates";
import { and, eq } from "drizzle-orm";
import { safeRevalidatePath as revalidatePath } from "@/lib/safe-revalidate";
import * as XLSX from "xlsx";

export async function creerPassager(formData: FormData) {
  const parsed = passagerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  const controle = await verifierContingentEntreprisePourAjoutPassagers({
    volId: data.volId,
    entrepriseId: data.entrepriseId,
    nbEngagementAAjouter: data.typeSiege === "Engagement" ? 1 : 0,
    nbFreeSaleAAjouter: data.typeSiege === "Free-sale" ? 1 : 0,
  });
  if (!controle.ok) return { error: controle.message };

  const [doublon] = await db
    .select()
    .from(passagers)
    .where(
      and(
        eq(passagers.volId, data.volId),
        eq(passagers.nom, data.nom),
        eq(passagers.prenom, data.prenom),
        eq(passagers.dateNaissance, data.dateNaissance),
        eq(passagers.numeroDocument, data.numeroDocument)
      )
    );
  if (doublon) {
    return { error: "Ce passager est déjà enregistré sur ce vol (doublon)." };
  }

  await db.insert(passagers).values({
    ...data,
    numeroReservation: data.numeroReservation || null,
    dateEmissionDocument: data.dateEmissionDocument || null,
    seatRow: data.seatRow || null,
    excessBag: data.excessBag || null,
  });

  revalidatePath("/passagers");
  revalidatePath("/stocks");
  return { ok: true };
}

// Wrappers compatibles avec useActionState (signature (prevState, formData)).
export type PassagerActionState = { error?: string; ok?: boolean };
export async function creerPassagerAction(
  _prevState: PassagerActionState,
  formData: FormData
): Promise<PassagerActionState> {
  return creerPassager(formData);
}

export type ImportActionState = { error?: string; ok?: boolean; nbImportes?: number };
export async function importerPassagersCsvAction(
  _prevState: ImportActionState,
  formData: FormData
): Promise<ImportActionState> {
  return importerPassagersCsv(formData);
}

export async function supprimerPassager(id: number) {
  await db.delete(passagers).where(eq(passagers.id, id));
  revalidatePath("/passagers");
  revalidatePath("/stocks");
  return { ok: true };
}

/** Convertit une valeur de cellule (texte ou nombre) en texte propre. */
function texteCellule(valeur: unknown): string {
  if (valeur == null) return "";
  if (valeur instanceof Date) return valeur.toString();
  return String(valeur).trim();
}

/** Convertit une cellule de date Excel (objet Date ou texte JJ/MM/AAAA) en ISO (yyyy-mm-dd). */
function dateCelluleVersIso(valeur: unknown): string | null {
  if (valeur == null || valeur === "") return null;
  if (valeur instanceof Date) {
    const annee = valeur.getFullYear();
    const mois = String(valeur.getMonth() + 1).padStart(2, "0");
    const jour = String(valeur.getDate()).padStart(2, "0");
    return `${annee}-${mois}-${jour}`;
  }
  return ddmmyyyyVersIso(String(valeur));
}

type LigneImport = Record<string, unknown>;

/**
 * 7. Import Excel (.xlsx) — toutes les colonnes du fichier modèle sont
 * acceptées ; seuls les champs obligatoires (CHAMPS_OBLIGATOIRES_IMPORT_CSV)
 * sont requis. Rejet total du fichier en cas d'erreur, avec message
 * précisant ligne, champ et nature du problème.
 */
export async function importerPassagersCsv(formData: FormData) {
  const volId = Number(formData.get("volId"));
  const entrepriseId = Number(formData.get("entrepriseId"));
  const fichier = formData.get("fichier") as File | null;

  if (!volId || !entrepriseId) return { error: "Vol et entreprise requis." };
  if (!fichier || fichier.size === 0) return { error: "Aucun fichier sélectionné." };

  let lignes: LigneImport[];
  try {
    const buffer = Buffer.from(await fichier.arrayBuffer());
    const classeur = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const nomFeuille = classeur.SheetNames[0];
    if (!nomFeuille) return { error: "Le fichier Excel ne contient aucune feuille." };
    const feuille = classeur.Sheets[nomFeuille];
    lignes = XLSX.utils.sheet_to_json<LigneImport>(feuille, { defval: "", raw: true });
  } catch {
    return { error: "Impossible de lire le fichier : ce n'est pas un fichier Excel (.xlsx) valide." };
  }

  if (lignes.length === 0) return { error: "Le fichier ne contient aucune ligne de données." };

  const erreurs: string[] = [];
  const aInserer: (typeof passagers.$inferInsert)[] = [];
  const vus = new Set<string>(); // anti-doublon interne au fichier

  let nbEngagementFichier = 0;
  let nbFreeSaleFichier = 0;

  lignes.forEach((ligneBrute, index) => {
    const numeroLigne = index + 2; // +1 pour l'en-tête, +1 pour un index base 1
    const ligne: Record<string, string> = {};
    for (const cle of Object.keys(ligneBrute)) {
      ligne[cle] = texteCellule(ligneBrute[cle]);
    }

    for (const champ of CHAMPS_OBLIGATOIRES_IMPORT_CSV) {
      if (!ligne[champ] || ligne[champ].trim() === "") {
        erreurs.push(`Ligne ${numeroLigne}, champ "${champ}" : valeur obligatoire manquante.`);
      }
    }
    if (ligne.SeatType && !["Engagement", "Free-sale"].includes(ligne.SeatType.trim())) {
      erreurs.push(
        `Ligne ${numeroLigne}, champ "SeatType" : valeur "${ligne.SeatType}" invalide (attendu Engagement ou Free-sale).`
      );
    }
    if (ligne.CivilityCode && !["MR", "MRS", "MME"].includes(ligne.CivilityCode.trim())) {
      erreurs.push(
        `Ligne ${numeroLigne}, champ "CivilityCode" : valeur "${ligne.CivilityCode}" invalide (attendu MR, MRS ou MME).`
      );
    }
    if (ligne.Gender && !["M", "F"].includes(ligne.Gender.trim())) {
      erreurs.push(
        `Ligne ${numeroLigne}, champ "Gender" : valeur "${ligne.Gender}" invalide (attendu M ou F).`
      );
    }

    const dateNaissance = dateCelluleVersIso(ligneBrute.BirthDate);
    if (ligne.BirthDate && !dateNaissance) {
      erreurs.push(
        `Ligne ${numeroLigne}, champ "BirthDate" : format de date invalide ("${ligne.BirthDate}", attendu JJ/MM/AAAA).`
      );
    }
    const dateExpiration = dateCelluleVersIso(ligneBrute.DocumentExpiryDate);
    if (ligne.DocumentExpiryDate && !dateExpiration) {
      erreurs.push(
        `Ligne ${numeroLigne}, champ "DocumentExpiryDate" : format de date invalide ("${ligne.DocumentExpiryDate}", attendu JJ/MM/AAAA).`
      );
    }
    let dateEmission: string | null = null;
    if (ligne.DocumentIssuanceDate && ligne.DocumentIssuanceDate.trim() !== "") {
      dateEmission = dateCelluleVersIso(ligneBrute.DocumentIssuanceDate);
      if (!dateEmission) {
        erreurs.push(
          `Ligne ${numeroLigne}, champ "DocumentIssuanceDate" : format de date invalide ("${ligne.DocumentIssuanceDate}", attendu JJ/MM/AAAA).`
        );
      }
    }

    if (
      ligne.NationalityCountryCode &&
      ligne.NationalityCountryCode.trim().length !== 2
    ) {
      erreurs.push(
        `Ligne ${numeroLigne}, champ "NationalityCountryCode" : code pays ISO à 2 lettres attendu ("${ligne.NationalityCountryCode}").`
      );
    }
    if (
      ligne.DocumentIssuingCountryCode &&
      ligne.DocumentIssuingCountryCode.trim().length !== 2
    ) {
      erreurs.push(
        `Ligne ${numeroLigne}, champ "DocumentIssuingCountryCode" : code pays ISO à 2 lettres attendu ("${ligne.DocumentIssuingCountryCode}").`
      );
    }

    // Anti-doublon interne au fichier (même vol) : nom+prénom+naissance+n°document
    const cleDoublon = `${ligne.Surname}|${ligne.Firstname}|${ligne.BirthDate}|${ligne.DocumentNumber}`;
    if (vus.has(cleDoublon)) {
      erreurs.push(
        `Ligne ${numeroLigne} : passager en double dans le fichier (déjà présent à une ligne précédente pour ce vol).`
      );
    }
    vus.add(cleDoublon);

    if (ligne.SeatType?.trim() === "Engagement") nbEngagementFichier += 1;
    if (ligne.SeatType?.trim() === "Free-sale") nbFreeSaleFichier += 1;

    if (erreurs.length === 0 && dateNaissance && dateExpiration) {
      aInserer.push({
        volId,
        entrepriseId,
        typeSiege: ligne.SeatType.trim() as "Engagement" | "Free-sale",
        civilite: ligne.CivilityCode.trim() as "MR" | "MRS" | "MME",
        nom: ligne.Surname.trim(),
        prenom: ligne.Firstname.trim(),
        dateNaissance,
        genre: ligne.Gender.trim() as "M" | "F",
        numeroReservation: ligne.BookingNumber?.trim() || null,
        nationaliteCodePays: ligne.NationalityCountryCode.trim().toUpperCase(),
        typeDocument: (ligne.DocumentType?.trim() as "PP" | "CNI") || "PP",
        numeroDocument: ligne.DocumentNumber.trim(),
        documentPaysEmissionCodePays: ligne.DocumentIssuingCountryCode.trim().toUpperCase(),
        dateEmissionDocument: dateEmission,
        dateExpirationDocument: dateExpiration,
        seatRow: ligne.SeatRow?.trim() || null,
        excessBag: null,
      });
    }
  });

  // Anti-doublon contre les passagers déjà en base sur ce vol
  if (erreurs.length === 0) {
    for (const [i, p] of aInserer.entries()) {
      const [existant] = await db
        .select()
        .from(passagers)
        .where(
          and(
            eq(passagers.volId, volId),
            eq(passagers.nom, p.nom),
            eq(passagers.prenom, p.prenom),
            eq(passagers.dateNaissance, p.dateNaissance),
            eq(passagers.numeroDocument, p.numeroDocument)
          )
        );
      if (existant) {
        erreurs.push(
          `Ligne ${i + 2} : passager "${p.nom} ${p.prenom}" déjà enregistré sur ce vol.`
        );
      }
    }
  }

  if (erreurs.length > 0) {
    return {
      error: `Fichier rejeté (${erreurs.length} erreur(s)) :\n${erreurs.slice(0, 30).join("\n")}${
        erreurs.length > 30 ? `\n... et ${erreurs.length - 30} autre(s) erreur(s).` : ""
      }`,
    };
  }

  const controleContingent = await verifierContingentEntreprisePourAjoutPassagers({
    volId,
    entrepriseId,
    nbEngagementAAjouter: nbEngagementFichier,
    nbFreeSaleAAjouter: nbFreeSaleFichier,
  });
  if (!controleContingent.ok) {
    return { error: `Fichier rejeté : ${controleContingent.message}` };
  }

  await db.insert(passagers).values(aInserer);

  revalidatePath("/passagers");
  revalidatePath("/stocks");
  return { ok: true, nbImportes: aInserer.length };
}
