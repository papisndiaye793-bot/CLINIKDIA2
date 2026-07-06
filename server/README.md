# ClinikDia — API sécurisée (squelette)

Backend **NestJS + Prisma + PostgreSQL**, conçu pour lever les non-conformités
critiques de la version 100 % navigateur (voir `../SECURITY.md` et
`../docs/iso27001-annexe-a.md`).

> ⚠️ **Squelette de démarrage (Phase 0/1).** Le code est écrit mais **n'a pas
> encore été exécuté** : il faut installer les dépendances et fournir une base
> PostgreSQL. Hébergement à décider ultérieurement.

## Ce que couvre déjà le squelette

| Fonction | Contrôle ISO 27002 |
|---|---|
| Mots de passe hachés **Argon2id** | 8.24 / 5.17 |
| Sessions par **cookie httpOnly/Secure/SameSite** (pas de token en localStorage) | 8.5 |
| **MFA TOTP** (setup + confirmation + exigé à la connexion) | 8.5 |
| **Autorisation vérifiée serveur** (`@RequirePerm` + RBAC guard) | 8.3 / 5.15 |
| **Anti-force brute** (throttler global + login 5/min) | 8.5 |
| **Réinitialisation par token** à usage unique expirant (anti-énumération) | 5.17 |
| **Journal d'audit append-only chaîné par hash** + vérification d'intégrité | 8.15 |
| **En-têtes de sécurité** (helmet) + validation stricte des entrées | 8.23 / 8.28 |
| **Traçabilité des accès en lecture** aux dossiers patients | ISO 27799 |

## Démarrage local

```bash
cd server
cp .env.example .env          # renseigner DATABASE_URL + JWT_SECRET fort
npm install
npm run prisma:generate
npm run prisma:migrate        # crée le schéma (PostgreSQL requis)
npm run seed                  # crée un admin (mot de passe à changer)
npm run start:dev             # http://localhost:3001
```

## Points d'entrée principaux

- `POST /auth/login` · `POST /auth/logout` · `GET /auth/me`
- `POST /auth/change-password` · `POST /auth/request-reset` · `POST /auth/reset-password`
- `POST /auth/mfa/setup` · `POST /auth/mfa/confirm`
- `GET/POST/PATCH/DELETE /patients` (chaque action exige le droit serveur correspondant)

## Reste à faire (avant production)

- Brancher le front React sur cette API (remplacer le store `localStorage`).
- Choisir l'hébergement (base managée chiffrée + sauvegardes testées — 8.13).
- Migrer module par module (séances, prescriptions, stock, finance, RH, QHSE…).
- Politiques RLS PostgreSQL, supervision/alertes (8.16), scan de dépendances en CI (8.8).
- Mesures organisationnelles du SMSI (politiques, analyse de risque, PCA/PRA) + déclaration CDP Sénégal.
