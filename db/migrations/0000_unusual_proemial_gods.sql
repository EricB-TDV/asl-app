CREATE TABLE "assignations" (
	"id" serial PRIMARY KEY NOT NULL,
	"vol_id" integer NOT NULL,
	"entreprise_id" integer NOT NULL,
	"nb_engagement_total" integer DEFAULT 0 NOT NULL,
	"nb_free_sale_total" integer DEFAULT 0 NOT NULL,
	"prix_engagement_ht" numeric(10, 2),
	"taxes_engagement" numeric(10, 2),
	"prix_free_sale_ht" numeric(10, 2),
	"taxes_free_sale" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entreprises" (
	"id" serial PRIMARY KEY NOT NULL,
	"nom" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "passagers" (
	"id" serial PRIMARY KEY NOT NULL,
	"vol_id" integer NOT NULL,
	"entreprise_id" integer NOT NULL,
	"type_siege" text NOT NULL,
	"civilite" text NOT NULL,
	"nom" text NOT NULL,
	"prenom" text NOT NULL,
	"date_naissance" date NOT NULL,
	"genre" text NOT NULL,
	"numero_reservation" text,
	"nationalite_code_pays" text NOT NULL,
	"type_document" text DEFAULT 'PP' NOT NULL,
	"numero_document" text NOT NULL,
	"document_pays_emission_code_pays" text NOT NULL,
	"date_emission_document" date,
	"date_expiration_document" date NOT NULL,
	"seat_row" text,
	"excess_bag" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pays" (
	"code" text PRIMARY KEY NOT NULL,
	"nom" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "utilisateurs" (
	"id" serial PRIMARY KEY NOT NULL,
	"nom" text NOT NULL,
	"email" text NOT NULL,
	"mot_de_passe_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "utilisateurs_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vols" (
	"id" serial PRIMARY KEY NOT NULL,
	"numero_vol" text NOT NULL,
	"aeroport_depart" text NOT NULL,
	"aeroport_arrivee" text NOT NULL,
	"date_depart" date NOT NULL,
	"date_arrivee" date NOT NULL,
	"nb_sieges" integer NOT NULL,
	"cout_vol_ht" numeric(10, 2) NOT NULL,
	"taxes" numeric(10, 2) NOT NULL,
	"sens" text NOT NULL,
	"serie_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assignations" ADD CONSTRAINT "assignations_vol_id_vols_id_fk" FOREIGN KEY ("vol_id") REFERENCES "public"."vols"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignations" ADD CONSTRAINT "assignations_entreprise_id_entreprises_id_fk" FOREIGN KEY ("entreprise_id") REFERENCES "public"."entreprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passagers" ADD CONSTRAINT "passagers_vol_id_vols_id_fk" FOREIGN KEY ("vol_id") REFERENCES "public"."vols"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passagers" ADD CONSTRAINT "passagers_entreprise_id_entreprises_id_fk" FOREIGN KEY ("entreprise_id") REFERENCES "public"."entreprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passagers" ADD CONSTRAINT "passagers_nationalite_code_pays_pays_code_fk" FOREIGN KEY ("nationalite_code_pays") REFERENCES "public"."pays"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passagers" ADD CONSTRAINT "passagers_document_pays_emission_code_pays_pays_code_fk" FOREIGN KEY ("document_pays_emission_code_pays") REFERENCES "public"."pays"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_vol_entreprise" ON "assignations" USING btree ("vol_id","entreprise_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_passager_sur_vol" ON "passagers" USING btree ("vol_id","nom","prenom","date_naissance","numero_document");