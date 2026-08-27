import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  date,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Référentiel Pays (11.5) — pré-rempli au déploiement (ISO 3166-1 alpha-2).
 */
export const pays = pgTable("pays", {
  code: text("code").primaryKey(), // ISO2, ex: "FR"
  nom: text("nom").notNull(),
});

/**
 * Utilisateur administrateur (11.6). Profil unique : administrateur.
 * Plusieurs comptes admin possibles (2. Comptes et accès).
 */
export const utilisateurs = pgTable("utilisateurs", {
  id: serial("id").primaryKey(),
  nom: text("nom").notNull(),
  email: text("email").notNull().unique(),
  motDePasseHash: text("mot_de_passe_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Entreprise cliente (3.). Attribut unique nécessaire : le nom.
 */
export const entreprises = pgTable("entreprises", {
  id: serial("id").primaryKey(),
  nom: text("nom").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Vol (4.). Un vol est unidirectionnel : sensAllerRetour = "aller" | "retour".
 */
export const vols = pgTable("vols", {
  id: serial("id").primaryKey(),
  numeroVol: text("numero_vol").notNull(),
  aeroportDepart: text("aeroport_depart").notNull(), // code, ex "CDG"
  aeroportArrivee: text("aeroport_arrivee").notNull(), // code, ex "ATR"
  dateDepart: date("date_depart").notNull(),
  dateArrivee: date("date_arrivee").notNull(),
  nbSieges: integer("nb_sieges").notNull(),
  coutVolHt: numeric("cout_vol_ht", { precision: 10, scale: 2 }).notNull(),
  taxes: numeric("taxes", { precision: 10, scale: 2 }).notNull(),
  sens: text("sens", { enum: ["aller", "retour"] }).notNull(),
  // identifie les vols créés en une même opération de série (4.1), pour retrouver
  // et, le cas échéant, corriger en masse une série (ex: numéro de vol répliqué).
  serieId: text("serie_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Assignation = contingent de sièges attribué à une entreprise sur un vol (5.).
 * Une seule assignation par (vol, entreprise) : une nouvelle saisie écrase
 * l'ancienne (5.2).
 */
export const assignations = pgTable(
  "assignations",
  {
    id: serial("id").primaryKey(),
    volId: integer("vol_id")
      .notNull()
      .references(() => vols.id, { onDelete: "cascade" }),
    entrepriseId: integer("entreprise_id")
      .notNull()
      .references(() => entreprises.id, { onDelete: "cascade" }),
    nbEngagementTotal: integer("nb_engagement_total").notNull().default(0),
    nbFreeSaleTotal: integer("nb_free_sale_total").notNull().default(0),
    prixEngagementHt: numeric("prix_engagement_ht", { precision: 10, scale: 2 }),
    taxesEngagement: numeric("taxes_engagement", { precision: 10, scale: 2 }),
    prixFreeSaleHt: numeric("prix_free_sale_ht", { precision: 10, scale: 2 }),
    taxesFreeSale: numeric("taxes_free_sale", { precision: 10, scale: 2 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    uniqVolEntreprise: uniqueIndex("uniq_vol_entreprise").on(t.volId, t.entrepriseId),
  })
);

/**
 * Passager (6.). Contrainte d'unicité : un passager (identifié par nom,
 * prénom, date de naissance, numéro de document) ne peut apparaître qu'une
 * seule fois sur le MÊME vol (6.1) — il peut en revanche figurer sur un vol
 * aller et un vol retour différents, ou sur deux vols à des dates différentes.
 */
export const passagers = pgTable(
  "passagers",
  {
    id: serial("id").primaryKey(),
    volId: integer("vol_id")
      .notNull()
      .references(() => vols.id, { onDelete: "restrict" }), // 4.2 : on ne supprime pas un vol qui a des passagers
    entrepriseId: integer("entreprise_id")
      .notNull()
      .references(() => entreprises.id, { onDelete: "restrict" }),
    typeSiege: text("type_siege", { enum: ["Engagement", "Free-sale"] }).notNull(),
    civilite: text("civilite", { enum: ["MR", "MRS", "MME"] }).notNull(),
    nom: text("nom").notNull(),
    prenom: text("prenom").notNull(),
    dateNaissance: date("date_naissance").notNull(),
    genre: text("genre", { enum: ["M", "F"] }).notNull(),
    numeroReservation: text("numero_reservation"), // optionnel (BookingNumber)
    nationaliteCodePays: text("nationalite_code_pays")
      .notNull()
      .references(() => pays.code),
    typeDocument: text("type_document", { enum: ["PP", "CNI"] })
      .notNull()
      .default("PP"), // PP uniquement à ce stade, CNI prévu pour évolution future
    numeroDocument: text("numero_document").notNull(),
    documentPaysEmissionCodePays: text("document_pays_emission_code_pays")
      .notNull()
      .references(() => pays.code),
    dateEmissionDocument: date("date_emission_document"), // optionnel
    dateExpirationDocument: date("date_expiration_document").notNull(),
    seatRow: text("seat_row"), // optionnel, saisi occasionnellement
    excessBag: text("excess_bag"), // optionnel, saisi occasionnellement
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    // anti-doublon sur un même vol (6.1)
    uniqPassagerSurVol: uniqueIndex("uniq_passager_sur_vol").on(
      t.volId,
      t.nom,
      t.prenom,
      t.dateNaissance,
      t.numeroDocument
    ),
  })
);

// -------- Relations (pour les requêtes avec jointures via Drizzle) --------

export const volsRelations = relations(vols, ({ many }) => ({
  assignations: many(assignations),
  passagers: many(passagers),
}));

export const entreprisesRelations = relations(entreprises, ({ many }) => ({
  assignations: many(assignations),
  passagers: many(passagers),
}));

export const assignationsRelations = relations(assignations, ({ one }) => ({
  vol: one(vols, { fields: [assignations.volId], references: [vols.id] }),
  entreprise: one(entreprises, {
    fields: [assignations.entrepriseId],
    references: [entreprises.id],
  }),
}));

export const passagersRelations = relations(passagers, ({ one }) => ({
  vol: one(vols, { fields: [passagers.volId], references: [vols.id] }),
  entreprise: one(entreprises, {
    fields: [passagers.entrepriseId],
    references: [entreprises.id],
  }),
  nationalite: one(pays, {
    fields: [passagers.nationaliteCodePays],
    references: [pays.code],
  }),
}));
