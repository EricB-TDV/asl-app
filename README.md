# Application Gestion des vols ASL — Terres d'Aventure

Application de gestion du remplissage des vols affrétés Paris (CDG) – Atar (ATR),
en remplacement de l'ancienne application Bubble.

Voir le document de spécifications (`Specification_ASL_v2.docx`) pour le détail
fonctionnel complet.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript, Tailwind CSS)
- [Drizzle ORM](https://orm.drizzle.team) + PostgreSQL
- Authentification maison (email / mot de passe, session par cookie signé)
- Hébergement cible : [Clever Cloud](https://www.clever-cloud.com) (France)

## Démarrage local

### 1. Prérequis

- Node.js 20+
- Une base PostgreSQL accessible (locale ou distante)

### 2. Installation

```bash
npm install
cp .env.example .env
# Renseignez DATABASE_URL et SESSION_SECRET dans .env
```

### 3. Base de données

```bash
# Génère les migrations à partir du schéma (db/schema.ts)
npm run db:generate

# Applique la dernière migration générée (adapter le nom de fichier)
psql "$DATABASE_URL" -f db/migrations/0000_xxx.sql

# Pré-remplit le référentiel des pays (ISO 3166-1 alpha-2, en français)
npm run db:seed-pays

# Crée le premier compte administrateur
npm run create-admin "Nom Prénom" email@exemple.com motdepasse
```

### 4. Lancer l'application

```bash
npm run dev
```

Puis ouvrir http://localhost:3000.

## Tests

Un script de test de bout en bout de la logique métier (anti-surbooking,
anti-doublon passager, contrôle de suppression de vol, import Excel /
export CSV) est
disponible :

```bash
npx tsx scripts/test-e2e.ts
```

Ce script supprime toutes les données de la base ciblée avant de jouer ses
scénarios : à n'utiliser que sur une base de développement/test, jamais sur la
base de production.

## Déploiement (Clever Cloud)

À documenter lors du premier déploiement.

## Sauvegarde quotidienne (dump SQL + Excel par email)

L'application expose une route `GET /api/backup?token=XXX` qui génère et
envoie par email :
- un **dump SQL complet** de la base (schéma + données), rechargeable tel
  quel sur une base neuve avec `psql "$DATABASE_URL" -f dump.sql`,
- un **classeur Excel** à trois onglets (Vols, Assignations, Passagers),
  lisible directement sans outil technique.

### Configuration requise (variables d'environnement)

- `BACKUP_TOKEN` : jeton secret protégeant la route
- `GMAIL_USER` : adresse Gmail expéditrice
- `GMAIL_APP_PASSWORD` : mot de passe d'application Gmail (16 caractères,
  généré sur [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords),
  nécessite la validation en deux étapes activée sur le compte)
- `BACKUP_EMAIL_TO` : adresse email destinataire

### Déclenchement automatique quotidien

La route ne se déclenche pas toute seule : il faut un service externe qui
l'appelle une fois par jour, par exemple [cron-job.org](https://cron-job.org)
(gratuit) configuré pour visiter :

```
https://votre-app.exemple.com/api/backup?token=VOTRE_BACKUP_TOKEN
```
