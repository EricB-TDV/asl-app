# Ventes LVT Power BI

Rapport Power BI de suivi des ventes LVT, alimenté par 2 sources CSV/Excel.

## Structure

```
ventes-lvt-power-bi/
├── report/          Rapport Power BI au format .pbip (projet, versionnable)
├── data/
│   ├── source/      Fichiers CSV/Excel réels — NON versionnés (voir .gitignore)
│   └── sample/       Échantillon anonymisé pour tests / démonstration
└── docs/            Documentation du modèle de données, mesures DAX, etc.
```

## Format du rapport : .pbip

Le rapport est enregistré au format **Power BI Project (.pbip)** plutôt que `.pbix`,
pour permettre un suivi de version lisible (diffs Git) :

- `report/*.Report/` — définition du rapport (visuels, pages) en JSON
- `report/*.SemanticModel/` — modèle de données en TMDL + requêtes Power Query (M)

Pour générer/mettre à jour ces fichiers depuis Power BI Desktop :
`Fichier > Enregistrer sous > Power BI project (.pbip)`

## Sources de données

| Source | Description | Format |
|---|---|---|
| _(à compléter)_ | | |
| _(à compléter)_ | | |

## État

Structure initiale créée. En attente :
- [ ] Dépôt du rapport `.pbip` (ou export depuis le `.pbix` existant)
- [ ] Dépôt des 2 fichiers sources (ou d'un échantillon anonymisé dans `data/sample/`)
- [ ] Description des évolutions souhaitées
