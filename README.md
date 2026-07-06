# ClinikDia — ERP SaaS pour clinique d'hémodialyse

Application de gestion complète d'une clinique d'hémodialyse, autonome (aucun backend à configurer).
Les données sont persistées dans le navigateur (localStorage) et initialisées avec un jeu de
démonstration réaliste (contexte Dakar / Sénégal).

## Stack technique

- **React 18 + TypeScript + Vite**
- **Tailwind CSS** (design system maison)
- **Zustand** (état global + persistance localStorage)
- **React Router** (navigation)
- **Recharts** (graphiques & indicateurs)
- **lucide-react** (icônes)

## Démarrage

```bash
npm install
npm run dev      # serveur de dev (http://localhost:5180)
npm run build    # build de production
npm run preview  # prévisualisation du build
```

## Modules

| Module | Description |
| --- | --- |
| **Tableau de bord** | KPIs, activité de dialyse, alertes, état du parc, séances du jour |
| **Patients** | File active, dossier médical complet, sérologies, abord vasculaire, suivi Kt/V |
| **Planning séances** | Grille postes × créneaux (matin/après-midi/soir), programmation, feuille de séance (poids, TA, UF, Kt/V) |
| **Générateurs & maintenance** | Parc de générateurs, statuts, désinfection, maintenance préventive/corrective |
| **Prescriptions** | Prescriptions de dialyse, schéma, dialyseur, débits, traitement médicamenteux, historique |
| **Personnel** | Néphrologues, infirmiers, techniciens, aides-soignants, administration |
| **Stock & consommables** | Dialyseurs, lignes, aiguilles, concentrés, médicaments — seuils d'alerte & mouvements |
| **Facturation & assurance** | Factures, prise en charge (IPRES, mutuelle, CMU, assurance, payant), encaissements |
| **Reporting** | Pyramide des âges, abords vasculaires, néphropathies, volumes, indicateurs qualité (Kt/V) |
| **Paramètres** | Coordonnées clinique, tarifs, réinitialisation des données |

## Architecture

```
src/
  components/   ui.tsx (design system) · Layout.tsx (sidebar + topbar)
  data/         seed.ts (jeu de données de démonstration)
  lib/          utils.ts (formatage) · labels.ts (libellés & couleurs des statuts)
  pages/        une page par module
  store/        useStore.ts (Zustand + persistance)
  types.ts      modèle de domaine
```

## Notes

- Réinitialisation des données : **Paramètres → Réinitialiser les données**.
- Pour repartir d'une base vierge, vider le `localStorage` (clé `clinikdia-store`).
