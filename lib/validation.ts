import { z } from "zod";

export const entrepriseSchema = z.object({
  nom: z.string().trim().min(1, "Le nom de l'entreprise est requis."),
  code3Lettres: z
    .string()
    .trim()
    .toUpperCase()
    .length(3, "Le code doit comporter exactement 3 lettres.")
    .regex(/^[A-Z]{3}$/, "Le code ne doit contenir que 3 lettres."),
});

export const utilisateurCreationSchema = z.object({
  nom: z.string().trim().min(1, "Le nom est requis."),
  email: z.string().trim().toLowerCase().email("Email invalide."),
  motDePasse: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères."),
});

export const utilisateurModificationSchema = z.object({
  nom: z.string().trim().min(1, "Le nom est requis."),
  email: z.string().trim().toLowerCase().email("Email invalide."),
  motDePasse: z
    .string()
    .min(6, "Le mot de passe doit contenir au moins 6 caractères.")
    .optional()
    .or(z.literal("")),
});

const codePaysIso2 = z
  .string()
  .trim()
  .toUpperCase()
  .length(2, "Code pays ISO à 2 lettres attendu.");

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.");

export const volUnitaireSchema = z.object({
  numeroVol: z.string().trim().min(1, "Numéro de vol requis."),
  aeroportDepart: z.string().trim().min(3).max(4).toUpperCase(),
  aeroportArrivee: z.string().trim().min(3).max(4).toUpperCase(),
  dateDepart: dateStr,
  dateArrivee: dateStr,
  nbSieges: z.coerce.number().int().positive(),
  coutVolHt: z.coerce.number().nonnegative(),
  taxes: z.coerce.number().nonnegative(),
  sens: z.enum(["aller", "retour"]),
});

export const volSerieSchema = z.object({
  numeroVol: z.string().trim().min(1, "Numéro de vol requis."),
  aeroportDepart: z.string().trim().min(3).max(4).toUpperCase(),
  aeroportArrivee: z.string().trim().min(3).max(4).toUpperCase(),
  datePremierVol: dateStr,
  dateFin: dateStr,
  nbSieges: z.coerce.number().int().positive(),
  coutVolHt: z.coerce.number().nonnegative(),
  taxes: z.coerce.number().nonnegative(),
  sens: z.enum(["aller", "retour"]),
});

export const assignationSchema = z.object({
  volIds: z.array(z.coerce.number().int()).min(1, "Sélectionnez au moins un vol."),
  entrepriseId: z.coerce.number().int(),
  nbEngagementTotal: z.coerce.number().int().nonnegative(),
  nbFreeSaleTotal: z.coerce.number().int().nonnegative(),
  prixEngagementHt: z.coerce.number().nonnegative().optional(),
  taxesEngagement: z.coerce.number().nonnegative().optional(),
  prixFreeSaleHt: z.coerce.number().nonnegative().optional(),
  taxesFreeSale: z.coerce.number().nonnegative().optional(),
});

export const passagerSchema = z.object({
  volId: z.coerce.number().int(),
  entrepriseId: z.coerce.number().int(),
  typeSiege: z.enum(["Engagement", "Free-sale"]),
  civilite: z.enum(["MR", "MRS", "MME"]),
  nom: z.string().trim().min(1, "Nom requis."),
  prenom: z.string().trim().min(1, "Prénom requis."),
  dateNaissance: dateStr,
  genre: z.enum(["M", "F"]),
  numeroReservation: z.string().trim().optional().or(z.literal("")),
  nationaliteCodePays: codePaysIso2,
  typeDocument: z.enum(["PP", "CNI"]).default("PP"),
  numeroDocument: z.string().trim().optional().or(z.literal("")),
  documentPaysEmissionCodePays: codePaysIso2,
  dateEmissionDocument: dateStr.optional().or(z.literal("")),
  dateExpirationDocument: dateStr.optional().or(z.literal("")),
  seatRow: z.string().trim().optional().or(z.literal("")),
  excessBag: z.string().trim().optional().or(z.literal("")),
});

export type PassagerInput = z.infer<typeof passagerSchema>;

/** Colonnes attendues dans le fichier d'import CSV (section 7). */
export const COLONNES_IMPORT_CSV = [
  "SeatType",
  "CivilityCode",
  "Surname",
  "Firstname",
  "BirthDate",
  "BookingNumber",
  "Gender",
  "NationalityCountryCode",
  "DocumentType",
  "DocumentNumber",
  "DocumentIssuingCountryCode",
  "DocumentIssuanceDate",
  "DocumentExpiryDate",
  "PassengerEmail",
  "PassengerPhone",
  "SeatRow",
] as const;

/** Champs obligatoires du fichier d'import (surlignés en jaune dans le modèle). */
export const CHAMPS_OBLIGATOIRES_IMPORT_CSV = [
  "SeatType",
  "CivilityCode",
  "Surname",
  "Firstname",
  "BirthDate",
  "Gender",
  "NationalityCountryCode",
  "DocumentType",
  "DocumentIssuingCountryCode",
] as const;

/** Colonnes du fichier d'export ASL (section 8), ordre imposé. */
export const COLONNES_EXPORT_ASL = [
  "Brand",
  "FlightDate",
  "FlightNumber",
  "OriginCode",
  "DestinationCode",
  "CivilityCode",
  "Surname",
  "FirstName",
  "BirthDate",
  "BookingNumber",
  "Gender",
  "NationalityCountryCode",
  "DocumentTypeCode",
  "DocumentNumber",
  "DocumentIssuingCountryCode",
  "DocumentIssuanceDate",
  "DocumentExpiryDate",
  "PassengerEmail",
  "PassengerPhone",
  "SeatRow",
  "ExcessBag",
] as const;
