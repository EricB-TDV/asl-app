# ASL App — Document de reprise de projet

**Application de gestion des vols ASL — Terres d'Aventure**
Document rédigé pour permettre la reprise des travaux dans un environnement Claude Code.

---

## 1. Contexte et objectif

Cette application remplace une ancienne application Bubble (no-code) utilisée par Terres d'Aventure pour gérer le remplissage des vols affrétés Paris (CDG) – Atar (ATR) auprès de la compagnie aérienne **ASL** : création des vols, attribution de contingents de sièges aux entreprises clientes, saisie des passagers, extraction des listes destinées à la compagnie aérienne, et suivi statistique.

Il n'y a et n'y aura **aucune intégration à un GDS**. Les échanges de données avec ASL se font exclusivement par fichiers Excel (import et export).

Le document de spécifications fonctionnelles d'origine (`Specification_ASL_v2.docx`) reste la référence pour le **besoin métier initial**. Ce présent document décrit l'**état réel du code livré**, qui a évolué par itérations successives au-delà de la spec initiale (voir section 8, Historique des évolutions).

---

## 2. Dépôts et accès

| Ressource | Emplacement / identifiant |
|---|---|
| Dépôt GitHub | `https://github.com/EricB-TDV/asl-app` (branche `main`) |
| Hébergement application | Clever Cloud, application `asl-app`, zone Paris (`par`) |
| Base de données | Clever Cloud, add-on PostgreSQL `asl-postgresql`, plan XXS Small Space |
| URL de production | `https://app-d6388094-4a04-440e-822c-42c29de1c359.cleverapps.io` (pas de nom de domaine dédié à ce jour) |
| Compte de sauvegarde email | `aslv2backup@gmail.com` (authentification par mot de passe d'application Gmail) |

Aucun identifiant/secret n'est stocké dans ce document ni dans le dépôt — voir section 6 (Variables d'environnement) pour la liste des noms de variables à renseigner.

---

## 3. Stack technique

- **Next.js 16** (App Router, TypeScript, Turbopack en dev, **Webpack en build de production** — voir section 9, point de vigilance)
- **Drizzle ORM** + **PostgreSQL** (driver `postgres` / postgres.js)
- **Tailwind CSS** pour le style
- **Authentification maison** : email/mot de passe (bcryptjs), session par cookie signé JWT (jose), pas de fournisseur tiers
- **exceljs** et **xlsx** (SheetJS) pour la génération/lecture de fichiers Excel
- **nodemailer** pour l'envoi d'email (sauvegarde quotidienne)
- Aucun test unitaire au sens classique : un script de test end-to-end unique (`scripts/test-e2e.ts`) appelle directement les fonctions serveur (server actions) contre une vraie base PostgreSQL, couvrant toutes les règles de gestion critiques (36 scénarios au dernier état).

### Fichiers de repères pour un agent IA
`AGENTS.md` et `CLAUDE.md` à la racine sont **générés automatiquement par `next dev`** (rappels sur les éventuelles nouveautés de Next.js). Ce ne sont pas des fichiers de configuration du projet à modifier.

---

## 4. Modèle de données

Schéma défini dans `db/schema.ts` (Drizzle). Six tables :

### `pays` (référentiel, pré-rempli)
`code` (ISO2, clé primaire), `nom`. Pré-rempli via `scripts/seed-pays.ts` à partir de `scripts/pays-iso.json` (généré une fois depuis la bibliothèque Python `pycountry`, figé — pas besoin de le régénérer).

### `utilisateurs` (comptes administrateurs)
`id`, `nom`, `email` (unique), `mot_de_passe_hash`, `created_at`. Profil unique : administrateur, pas de rôles différenciés. Plusieurs comptes peuvent coexister.

### `entreprises`
`id`, `nom`, `created_at`. Attribut minimal — les entreprises clientes n'ont **aucun accès** à l'application (v2 : accès entreprise supprimé par rapport à la v1 Bubble).

### `vols`
`id`, `numero_vol`, `aeroport_depart`, `aeroport_arrivee`, `date_depart`, `date_arrivee`, `nb_sieges`, `cout_vol_ht`, `taxes`, `sens` (`aller` | `retour`), `serie_id` (nullable, regroupe les vols créés en une même opération de série), `created_at`.

### `assignations` (contingents de sièges)
Une ligne par couple (vol, entreprise). `id`, `vol_id`, `entreprise_id`, `nb_engagement_total`, `nb_free_sale_total`, `prix_engagement_ht`, `taxes_engagement`, `prix_free_sale_ht`, `taxes_free_sale`, `created_at`, `updated_at`. Contrainte unique sur `(vol_id, entreprise_id)`.

### `passagers`
`id`, `vol_id`, `entreprise_id`, `type_siege` (`Engagement` | `Free-sale`), `civilite` (`MR`|`MRS`|`MME`), `nom`, `prenom`, `date_naissance`, `genre` (`M`|`F`), `numero_reservation` (optionnel), `nationalite_code_pays` (FK → pays), `type_document` (`PP`|`CNI`, défaut `PP`), `numero_document` (**optionnel** depuis migration 0001), `document_pays_emission_code_pays` (FK → pays), `date_emission_document` (optionnel), `date_expiration_document` (**optionnel** depuis migration 0001), `seat_row` (optionnel), `excess_bag` (optionnel), `created_at`, `updated_at`.

Index unique `(vol_id, nom, prenom, date_naissance, numero_document)` — protection anti-doublon au niveau base, complétée par des vérifications applicatives (voir section 5) car `numero_document` étant désormais nullable, deux valeurs `NULL` ne sont pas considérées identiques par PostgreSQL.

### `parametres_financiers` (singleton, bilan financier)
`id` (toujours 1), `couts_asl`, `revision_carburant`, `apport_mauritanie`, `frais_administratifs`, `frais_aeroport_mauritanie` (5 montants en euros, saisis par l'administrateur), `saison_debut`, `saison_fin` (dates configurables déterminant les colonnes du bilan mensuel), `updated_at`.

### Migrations
- `0000_unusual_proemial_gods.sql` : création initiale des 6 tables
- `0001_nasty_alex_wilder.sql` : passage de `numero_document` et `date_expiration_document` en colonnes nullables
- `0002_easy_cargill.sql` : ajout de la table `parametres_financiers`
- `0003_brave_wrecking_crew.sql` : ajout de la colonne `code_3_lettres` sur `entreprises`

**Important** : les migrations Drizzle générées ne s'appliquent **pas automatiquement** au déploiement Clever Cloud. Voir section 7 (Procédures) pour la marche à suivre.

---

## 5. Fonctionnalités par écran et règles de gestion

### Connexion (`/login`)
Email + mot de passe. Session cookie signé (7 jours). Toutes les routes sont protégées par `proxy.ts` (middleware Next.js — nommé `proxy.ts` et non `middleware.ts` par convention Next 16) sauf `/login`, `/api/auth/*`, `/api/setup`, `/api/backup`.

### Comptes administrateurs (`/utilisateurs`)
CRUD complet accessible à tout administrateur connecté. Règles :
- Email unique par compte
- Impossible de supprimer son propre compte en session active
- Impossible de supprimer le dernier compte administrateur restant (évite un verrouillage total)

### Entreprises (`/entreprises`)
CRUD simple. Liste triée par ordre alphabétique. Suppression bloquée si des passagers y sont encore rattachés. Chaque entreprise a un **code sur 3 lettres** (obligatoire à la saisie, mis en majuscules automatiquement), utilisé pour abréger son nom dans les tableaux à forte densité (vues par entreprise de l'écran Statistiques). Colonne nullable en base pour compatibilité avec des entreprises créées avant l'ajout de ce champ ; dans ce cas, le code affiché retombe sur les 3 premières lettres du nom. La route `/api/setup` applique automatiquement un jeu de codes connus (par correspondance de nom) aux entreprises existantes qui n'en ont pas encore.

### Vols (`/vols`)
- **Création unitaire** (un sens à la fois : aller PAR→ATR ou retour ATR→PAR)
- **Création en série** : l'administrateur saisit la date du **premier vol** (pas de jour de semaine fixe imposé) et une date de fin ; un vol est créé chaque semaine à la même récurrence.
  - Vols **aller** : numéro de vol répliqué automatiquement sur toute la série (modifiable ensuite vol par vol)
  - Vols **retour** : numéro de vol **non répliqué** (il varie généralement d'une occurrence à l'autre), à saisir individuellement après création
- Liste triée par ordre chronologique **croissant**, dates affichées en `DD/MM/AAAA`
- Suppression bloquée si des passagers sont enregistrés sur le vol, avec message exact : *« Des passagers sont enregistrés sur ce vol, les supprimer avant de supprimer le vol. »* (affiché réellement à l'écran, pas seulement retourné par le serveur)

### Stocks / assignations (`/stocks`)
- Attribution de contingents (sièges engagement + free-sale, prix HT + taxes associés) à une entreprise sur un ou plusieurs vols sélectionnés (attribution en masse : même quantité appliquée à chaque vol coché)
- Une nouvelle assignation sur un couple (vol, entreprise) déjà existant **écrase** l'ancienne (ne s'additionne pas)
- **Anti-surbooking** : le total attribué (engagement + free-sale, toutes entreprises) ne peut jamais dépasser `nb_sieges` du vol — contrôle bloquant avec message d'erreur affiché
- **Anti-sous-attribution** : une modification d'assignation est refusée si l'entreprise a déjà plus de passagers enregistrés (par type de siège) que la nouvelle quantité proposée
- Tableau par vol, colonnes (dans cet ordre) : **Engagement**, **Reste Eng.** (= Engagement − passagers enregistrés en engagement), **Free sale**, **Reste F.S.** (idem), **Reste Total**
- Clic sur le nom d'une entreprise (souligné) → fenêtre modale permettant de modifier rapidement le nombre de sièges (engagement/free-sale) **et les prix HT/taxes associés** (4 champs : prix engagement HT, prix free-sale HT, taxes engagement, taxes free-sale), avec les mêmes contrôles anti-surbooking/anti-sous-attribution
- Liste des vols triée chronologiquement croissant, dates en `DD/MM/AAAA`
- **Affichage aller/retour côte à côte** : les vols sont appariés par date de départ (un aller et un retour à la même date apparaissent sur la même ligne, en deux colonnes) ; si un aller ou un retour manque à une date, la case correspondante reste vide plutôt que de désaligner le tableau

### Passagers (`/passagers`)
- Sélecteur de vol trié chronologiquement croissant, dates en `DD/MM/AAAA`
- **Saisie manuelle** : tous les champs sauf numéro de document et date d'expiration (rendus optionnels), civilité/genre/pays obligatoires. Anti-doublon sur `(vol, nom, prénom, naissance, numéro de document si renseigné)`.
- **Import Excel (.xlsx)**, remplace l'ancien import CSV. Colonnes du modèle (section 7 ci-dessous) conservées à l'identique, mais numéro de document et date d'expiration ne sont plus des champs obligatoires du fichier.
  - **Cinématique de remplacement** (évolution importante, à bien comprendre) : importer une liste pour une entreprise sur un vol **supprime d'abord tous les passagers existants de cette entreprise sur ce vol** (importés ET saisis manuellement), puis insère la nouvelle liste — opération tout-ou-rien dans une transaction. La saisie manuelle *après* un import reste additive ; c'est seulement un *nouvel import* qui réinitialise à nouveau.
  - Rejet total du fichier en cas d'erreur, avec message précisant ligne, champ et nature du problème
  - Contrôle de contingent basé sur le contenu du fichier seul (puisque les anciens passagers de l'entreprise sont remplacés, pas additionnés)
- **Suppression en masse** (zone de danger, double confirmation) : tous les passagers d'un vol, ou tous les passagers d'une entreprise sur un vol
- **Modification individuelle** : clic sur le nom d'entreprise (souligné) dans la liste des passagers du vol → fenêtre modale reprenant exactement les mêmes champs, le même ordre et la même présentation que le formulaire de création. Boutons Valider (enregistre, mêmes contrôles anti-surbooking/anti-doublon que la création, en excluant le passager lui-même des vérifications) / Annuler (ferme sans rien enregistrer). Le vol lui-même n'est jamais modifiable depuis cette fenêtre.

### Export listes ASL (`/export`)
Un fichier Excel (.xlsx, remplace l'ancien CSV) par vol, format de colonnes **imposé par ASL, à respecter à l'identique** (21 colonnes : Brand, FlightDate, FlightNumber, OriginCode, DestinationCode, CivilityCode, Surname, FirstName, BirthDate, BookingNumber, Gender, NationalityCountryCode, DocumentTypeCode, DocumentNumber, DocumentIssuingCountryCode, DocumentIssuanceDate, DocumentExpiryDate, PassengerEmail, PassengerPhone, SeatRow, ExcessBag). Dates en texte `DD/MM/AAAA` (jamais en type date Excel natif). `PassengerEmail`/`PassengerPhone` toujours vides (non collectés). Valeurs manquantes affichées en chaîne vide, jamais `null`/`None`.

### Statistiques (`/statistiques`)
Écran désormais organisé en **4 onglets** (client component `StatistiquesTabs.tsx`, contenu pré-rendu côté serveur puis affiché/masqué en CSS) :

**Onglet "Vue globale"** : vue consolidée par vol (une ligne par vol, tous les vols, aller et retour confondus). Colonnes en français : Date du vol, Origine, Destination, **Sièges engagés**, **Sièges occupés** (nouveau — décompte réel des passagers enregistrés, tous types confondus), Sièges libres, Sièges total, Taux de remplissage, Ventes HT. Triée chronologiquement croissant.

**Règle de calcul « Sièges engagés »** (inchangée) : un siège en **engagement** est considéré comme *consommé* dès qu'il est attribué à une entreprise (contingent payé), indépendamment du nombre de passagers réellement enregistrés dessus. Un siège **free-sale** ne compte comme engagé que s'il est effectivement utilisé par un passager enregistré.
→ `Sièges engagés (par vol) = somme des contingents engagement attribués sur ce vol (toutes entreprises) + nombre de passagers réellement enregistrés en free-sale sur ce vol`

**Règle de calcul « Sièges occupés »** (nouveau) : décompte physique réel, tous types de siège confondus (`COUNT(passagers)` groupé par vol).

**Règle de calcul « Ventes HT »** (révisée) : pour chaque entreprise ayant un contingent sur le vol, `(contingent engagement total × prix engagement HT) + (nombre de passagers réellement enregistrés en free-sale pour cette entreprise × prix free-sale HT)`. L'engagement est facturé en totalité, qu'il soit utilisé ou non ; le free-sale n'est facturé qu'à l'usage réel. Somme sur toutes les entreprises du vol.

**Onglets "Vue entreprise sièges engagés" / "Vue entreprise sièges réels"** : deux tableaux côte à côte (Aller / Retour), police normale (`text-base`, pas `text-xs`) et tableaux en pleine largeur du bloc (`w-full table-fixed`), lignes espacées (`py-3`) pour occuper tout l'espace disponible, sans contrainte de hauteur entre les deux blocs. Une ligne par date. **Les deux tableaux partagent un axe de dates commun** (union triée des dates aller et retour) : une case reste vide côté aller (ou retour) si aucun vol n'existe à cette date dans ce sens, pour que l'aller et le retour d'une même date restent alignés sur la même ligne. Une colonne par entreprise ayant un contingent dans ce sens, **identifiée par son code 3 lettres** (pas son nom complet, pour limiter la largeur), plus Total / Stock / Reste / %. Réutilisent la même fonction de calcul (`calculerVuesParEntreprise`), seule la métrique affichée diffère :
- *Sièges engagés* par entreprise = contingent engagement total de l'entreprise + ses passagers free-sale réellement enregistrés
- *Sièges réels* par entreprise = tous ses passagers réellement enregistrés (engagement + free-sale)

**Onglet "Bilan financier"** : voir section dédiée ci-dessous.

Export Excel disponible pour les 4 onglets (`/api/statistiques/export` pour la vue globale, `/api/statistiques/export-entreprise?mode=engages|reels` pour les deux vues par entreprise avec 2 feuilles Aller/Retour, `/api/statistiques/export-bilan[?date=YYYY-MM-DD]` pour le bilan — 2 feuilles : le tableau mensuel et le calcul à une date, celle du jour par défaut), mêmes colonnes et mêmes règles de calcul que l'écran.

### Bilan financier (onglet de `/statistiques`)
Composé de deux tableaux :

1. **Bilan mensuel** : une colonne par fin de mois entre les dates de saison configurées (lien "Configurer la saison", fenêtre modale, dates stockées dans `parametres_financiers.saison_debut`/`saison_fin`). Les colonnes sont générées dynamiquement (`genererFinsDeMois`), pas figées en dur. Chaque colonne reprend les 5 valeurs initiales (Coûts ASL, Révision carburant, Apport Mauritanie, Frais administratifs, Frais aéroport Mauritanie — saisies via la fenêtre modale "Valeurs initiales", stockées dans la même table singleton), puis calcule "Ventes réalisées" et "Résultat financier" **uniquement pour les mois déjà atteints** (date de fin de mois ≤ aujourd'hui) ; les mois futurs restent vides sur ces deux lignes. Sous-titre : « Calcul du bilan financier avec les ventes réalisées à la fin de chaque mois. » Toutes les cellules de montant sont alignées à droite.
2. **Calcul à une date donnée** : formulaire avec sélecteur de date + bouton "Calculer", réutilise les mêmes 5 valeurs initiales, calcule à la demande via une server action. **Pré-calculé systématiquement à l'ouverture de la page** avec la date du jour (calcul effectué côté serveur dans `BilanFinancier.tsx` avant même le premier rendu, transmis en état initial au composant client). Un bouton "Télécharger (Excel)" exporte ce calcul pour la date actuellement affichée (paramètre `?date=` de la route d'export, suit la date en cours dans le formulaire).

**Ventes réalisées à une date D** = somme, sur **toutes les assignations créées au plus tard le jour D** (`assignations.created_at <= D`), de `contingent engagement total × prix engagement HT`, PLUS somme, sur tous les passagers free-sale **enregistrés au plus tard le jour D** (`passagers.created_at <= D`), de leur prix free-sale HT.

**Approximation validée avec l'utilisateur** (point d'architecture important) : si un contingent est modifié après sa création initiale (ex. augmenté), on ne conserve pas d'historique des valeurs successives — le calcul rétroactif utilise la valeur **actuelle** du contingent, appliquée depuis sa date de création d'origine. C'est une simplification assumée (pas de table d'audit/versioning), à garder à l'esprit si les contingents sont fréquemment réajustés après coup : le bilan financier des mois passés peut alors légèrement dévier de la réalité historique exacte.

**Affichage monétaire** (`lib/montant.ts`) : tous les montants du bilan financier (tableau mensuel et calcul à une date) sont arrondis à l'euro (pas de décimales), affichés en **rouge si négatifs, vert si positifs** (neutre si nul), via les utilitaires partagés `formatEurArrondi` et `couleurMontant`.

Table `parametres_financiers` : singleton (id fixé à 1), une seule ligne pour toute l'exploitation (pas de déclinaison par vol ni par saison — une nouvelle saison écrase simplement les dates de la précédente).


### Sauvegarde quotidienne (`/api/backup`, hors navigation utilisateur)
Route `GET /api/backup?token=XXX`, protégée par la variable `BACKUP_TOKEN`, déclenchée par un service de cron externe (voir section 6 et 7). Envoie par email deux pièces jointes :
1. Un **dump SQL complet et autonome** (schéma de toutes les migrations + données de toutes les tables dans l'ordre des dépendances), rechargeable tel quel sur une base neuve via `psql -f`. Testé avec succès (rechargement complet vérifié sur base vierge).
2. Un **classeur Excel à 3 onglets** (Vols, Assignations, Passagers), lisible sans outil technique — pensé comme filet de sécurité opérationnel en cas de panne, pas comme mécanisme de reconstruction automatique.

But : protéger les données même en cas de perte d'accès à Clever Cloud lui-même (le dump est indépendant de la plateforme).

### Mise en place initiale (`/api/setup`, hors navigation utilisateur)
Route `GET /api/setup?token=XXX[&adminNom=...&adminEmail=...&adminMotDePasse=...]`, protégée par `SETUP_TOKEN`, pensée pour être exécutée **depuis un simple navigateur, sans aucun outil technique installé** (Git, Node, psql...). Applique **tous les fichiers de migration présents** dans `db/migrations/` (pas seulement le premier — important si de nouvelles migrations sont ajoutées), idempotente (peut être rappelée sans risque), charge le référentiel pays, et peut créer/mettre à jour un compte administrateur si les paramètres sont fournis.

**À activer (ajouter `SETUP_TOKEN`) uniquement lors d'une installation ou migration, puis à désactiver (retirer la variable) immédiatement après**, par sécurité.

---

## 6. Variables d'environnement

| Variable | Rôle | Obligatoire |
|---|---|---|
| `DATABASE_URL` | Connexion PostgreSQL (fournie par l'add-on Clever Cloud, `POSTGRESQL_ADDON_URI`) | Oui, toujours |
| `SESSION_SECRET` | Signature des cookies de session | Oui, toujours |
| `SETUP_TOKEN` | Protège `/api/setup` | Seulement pendant une install/migration, puis à retirer |
| `BACKUP_TOKEN` | Protège `/api/backup` | Oui, en permanence si la sauvegarde quotidienne est active |
| `GMAIL_USER` | Adresse expéditrice (`aslv2backup@gmail.com`) | Oui, si sauvegarde active |
| `GMAIL_APP_PASSWORD` | Mot de passe d'application Gmail (16 caractères, généré sur myaccount.google.com/apppasswords) | Oui, si sauvegarde active |
| `BACKUP_EMAIL_TO` | Destinataire de la sauvegarde (`ebalian@terdav.com`) | Oui, si sauvegarde active |

Voir `.env.example` à la racine du dépôt pour un gabarit local.

---

## 7. Procédures opérationnelles

### Développement local
```bash
npm install
cp .env.example .env   # renseigner DATABASE_URL (Postgres local) et SESSION_SECRET
npm run db:generate    # si le schéma a changé
psql "$DATABASE_URL" -f db/migrations/000X_xxx.sql   # appliquer chaque migration
npm run db:seed-pays
npm run create-admin "Nom Prénom" email@exemple.com motdepasse
npm run dev
```

### Test end-to-end de la logique métier
```bash
npx tsx scripts/test-e2e.ts
```
Attention : supprime toutes les données de la base ciblée avant de jouer ses scénarios (36 au dernier état) — jamais sur la base de production.

### Déploiement (Clever Cloud, connecté à GitHub)
Un `git push` sur `main` déclenche un déploiement automatique. **Après tout changement de schéma de base de données** (nouvelle migration générée par `drizzle-kit generate`), il faut l'appliquer manuellement en production :
1. Ajouter temporairement `SETUP_TOKEN` dans les variables d'environnement de l'application
2. Redéployer
3. Visiter `https://<url-app>/api/setup?token=<SETUP_TOKEN>` (pas besoin des paramètres admin si un compte existe déjà)
4. Vérifier le message de confirmation (doit lister les migrations appliquées)
5. Retirer `SETUP_TOKEN`, redéployer

### Sauvegarde manuelle ponctuelle
Visiter `https://<url-app>/api/backup?token=<BACKUP_TOKEN>` déclenche un envoi immédiat.

### Déclenchement automatique quotidien de la sauvegarde
Configuré via **cron-job.org** (gratuit), qui visite l'URL ci-dessus une fois par jour. Pas de solution native Clever Cloud utilisée (pour rester gratuit).

### Restauration en cas de sinistre
```bash
# Sur une base PostgreSQL neuve/vide :
psql "$DATABASE_URL_NOUVELLE" -f asl_dump_YYYY-MM-DD.sql
```
Le dump contient le schéma complet et toutes les données — aucune autre étape nécessaire.

---

## 8. Historique des évolutions notables (au-delà de la spec initiale)

Ces évolutions ont été demandées et livrées après les premiers tests utilisateur, et **prévalent** sur le document de spécifications initial en cas de contradiction :

1. Import passagers : CSV → **Excel (.xlsx)**
2. Export listes ASL : CSV → **Excel (.xlsx)**
3. Statistiques : calcul par entreprise → **calcul par vol**, avec règle « engagement = consommé » (section 5)
4. Cinématique d'import passagers : additif → **remplacement complet** des passagers de l'entreprise sur le vol concerné
5. Ajout du module de gestion des comptes administrateurs (`/utilisateurs`), absent de la spec initiale
6. Numéro de document et date d'expiration : obligatoires → **optionnels** (saisie manuelle et import)
7. Colonnes du tableau d'assignations stocks : itérées deux fois (Occupés/% abandonné au profit de Engagement/Free sale/Reste Engagement/Reste Free sale/Reste total)
8. Ajout de la sauvegarde quotidienne automatique par email (sections 5, 6, 7)
9. Hébergement : Railway (proposition initiale) → **Clever Cloud** (décision finale, société française)

---

## 9. Points de vigilance techniques (pièges déjà rencontrés)

- **Build de production : Turbopack désactivé, Webpack forcé** (`"build": "next build --webpack"` dans `package.json`). Turbopack (activé par défaut en Next.js 16) est documenté comme expérimental pour les builds de production et s'est bloqué silencieusement en déploiement (`Creating an optimized production build ...` qui ne se termine jamais, sans message d'erreur). Ne pas revenir à Turbopack pour le build sans revalider soigneusement.
- **Toutes les pages consultant la base de données doivent avoir `export const dynamic = "force-dynamic";`**. Sans cette directive, Next.js tente de pré-générer les pages au moment du build, ce qui peut se bloquer indéfiniment si la base n'est pas immédiatement joignable depuis la machine de build (observé et corrigé une première fois — c'est cette même classe de bug qui explique en partie pourquoi Turbopack posait aussi problème).
- **`revalidatePath` et `cookies()` (donc `getSession()`) échouent hors contexte de requête Next.js** (ex. dans un script comme `test-e2e.ts`). Utiliser le wrapper tolérant `lib/safe-revalidate.ts` (`safeRevalidatePath`) plutôt que l'import direct de `next/cache`, et encapsuler `getSession()` dans un `try/catch` quand un appel pourrait survenir hors requête (voir `app/utilisateurs/actions.ts::supprimerUtilisateur`).
- **Erreurs PostgreSQL via Drizzle** : le code d'erreur natif (`err.code`, ex. `42P07` = table existe déjà) peut être encapsulé dans `err.cause.code` selon le point d'appel (`db.execute` vs `db.insert`/`db.select`). Toujours vérifier les deux emplacements.
- **Server actions et remontée d'erreur à l'écran** : un formulaire utilisant une server action passée directement en `action={...}` sur un `<form>` **n'affiche pas** la valeur de retour de la fonction en cas d'erreur. Il faut passer par un composant client avec `useActionState` (ou `useTransition` + état local pour de simples boutons) pour que les messages d'erreur (anti-surbooking, etc.) soient réellement visibles par l'utilisateur. Ce piège a été rencontré trois fois (stocks, vols, comptes) avant d'être systématisé.
- **`numero_document` nullable** : l'index unique anti-doublon en base ne protège plus contre les doublons quand ce champ est vide (PostgreSQL traite deux `NULL` comme distincts). La protection repose désormais sur des vérifications applicatives explicites (voir `app/passagers/actions.ts`).

---

## 10. Points ouverts

- **Nom de domaine dédié** non configuré (l'application tourne sur le sous-domaine `.cleverapps.io` fourni par Clever Cloud)
- Aucune volumétrie réelle en production à ce jour (déploiement récent) — les hypothèses de dimensionnement (instance XS, base XXS Small Space) sont à revalider si l'usage croît significativement

---

## 11. Comment reprendre le travail avec Claude Code

1. Cloner le dépôt : `git clone https://github.com/EricB-TDV/asl-app.git`
2. Lire ce document en entier, puis le `README.md` du dépôt (procédures détaillées, section installation)
3. Pour toute nouvelle fonctionnalité touchant la base de données : modifier `db/schema.ts`, lancer `npm run db:generate`, tester localement, puis suivre la procédure de migration en production (section 7)
4. Avant de pousser en production, systématiquement : `npx tsc --noEmit`, `npm run lint`, `npm run build`, puis `npx tsx scripts/test-e2e.ts` contre une base de test
5. Pour toute action sur Clever Cloud (déploiement, variables d'environnement, add-ons), Claude Code peut utiliser directement `clever-tools` (CLI officielle) une fois authentifié — plus rapide que l'interface web utilisée jusqu'ici
6. Se référer à la section 9 avant de modifier la configuration de build ou d'ajouter une page qui interroge la base de données
