CREATE TABLE "parametres_financiers" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"couts_asl" numeric(12, 2),
	"revision_carburant" numeric(12, 2),
	"apport_mauritanie" numeric(12, 2),
	"frais_administratifs" numeric(12, 2),
	"frais_aeroport_mauritanie" numeric(12, 2),
	"saison_debut" date,
	"saison_fin" date,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
