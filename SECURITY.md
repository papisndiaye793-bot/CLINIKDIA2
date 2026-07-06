# Politique de sécurité — ClinikDia

> ERP d'un centre d'hémodialyse. Ce document décrit la posture de sécurité de
> l'information, alignée sur **ISO/IEC 27001:2022 / 27002:2022** et, pour les
> données de santé, **ISO 27799**. Il sert de référence pour le module
> *QHSE → Certifications* et pour une future démarche de certification.

Dernière mise à jour : 2026-06-22

---

## 1. Périmètre

- Application : SPA React (Vite) + (à venir) API et base de données.
- Données traitées : identité patients, données médicales (catégorie sensible),
  RH/paie, facturation, conformités QHSE.
- Hébergement front : Netlify (HTTPS/CDN). Backend : à déployer (voir §5).

## 2. Classification des données

| Niveau | Exemples | Exigence |
|---|---|---|
| Sensible (santé) | Dossiers patients, séances, prescriptions, sérologies | Chiffrement au repos + en transit, accès tracé |
| Confidentiel | RH/paie, facturation, comptes utilisateurs | Accès restreint par rôle |
| Interne | Stocks, maintenance, QHSE | Accès authentifié |

## 3. Contrôles déjà en place (code)

- **Transport chiffré** : HTTPS/TLS (Netlify) + HSTS — *8.21 / 8.24*.
- **En-têtes de sécurité** : CSP, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy (`netlify.toml`) — *8.23 / 8.26*.
- **Contrôle d'accès basé sur les rôles (RBAC)** granulaire (accès/écriture/
  suppression par module) — *8.3 / 5.15*.
- **Politique de mot de passe** : ≥ 8 caractères, lettre + chiffre, non-réutilisation — *5.17*.
- **Anti-force brute** : verrouillage après 5 échecs (login et réinitialisation) — *8.5*.
- **Réinitialisation vérifiée** : facteur de connaissance (téléphone enregistré) — *5.17 / 8.5*.
- **Sessions** : déconnexion auto après 30 min d'inactivité, logout complet — *8.5*.
- **Journal d'audit** des actions (connexion, CRUD, sécurité) — *8.15*.
- **Dépendances** : `npm audit` sans vulnérabilité connue — *8.8*.
- **Secrets** : aucun secret/clé en dur dans le dépôt — *8.24*.

## 4. Limites connues (à lever par le backend)

> Tant que les données et l'authentification restent **côté navigateur**
> (`localStorage`), les contrôles ci-dessus sont **partiels**. Risques résiduels :

- Mots de passe et données non chiffrés au repos dans le navigateur — *8.24*.
- Autorisation appliquée surtout en UI, contournable — *8.3*.
- Pas de sauvegarde/reprise centralisée — *8.13*.
- Journal d'audit modifiable côté client — *8.15*.

## 5. Cible (backend sécurisé)

Voir `docs/iso27001-annexe-a.md` et l'architecture :

1. API **NestJS + Prisma**, autorisation vérifiée serveur (+ RLS PostgreSQL).
2. **PostgreSQL** managé : chiffrement au repos, sauvegardes automatiques testées.
3. Mots de passe **Argon2id** ; sessions par **cookies httpOnly/Secure/SameSite**.
4. **MFA (TOTP)**, réinitialisation par **lien à usage unique** expirant.
5. **Journal d'audit append-only** (chaîné par hash) côté serveur.
6. **Stockage de documents** chiffré, à accès signé.
7. Supervision/alertes, scan de dépendances en CI, tests de restauration.

## 6. Conformité légale

- Données de santé : déclaration auprès de la **CDP Sénégal** (loi 2008-12),
  registre des traitements, durées de conservation, droits des personnes.

## 7. Gouvernance (SMSI — requis pour la certification)

Au-delà du code, la certification ISO 27001 exige : analyse de risque,
déclaration d'applicabilité (SoA), politiques, gestion des accès (arrivées/
départs), plan de continuité (PCA/PRA), gestion des incidents, sensibilisation
du personnel et audits internes.

## 8. Signalement d'une vulnérabilité

Contact sécurité : à définir (ex. `securite@clinikdia.sn`). Décrire le problème
sans le divulguer publiquement ; réponse sous 72 h.
