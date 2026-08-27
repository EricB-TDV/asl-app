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
