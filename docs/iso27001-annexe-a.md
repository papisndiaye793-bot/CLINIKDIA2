# Registre ISO/IEC 27001:2022 — Annexe A (déclaration d'applicabilité)

> État des **93 mesures** de l'Annexe A regroupées en 4 thèmes. Statuts :
> ✅ En place · 🟡 Partiel · 🟠 Planifié (backend) · 🏢 Organisationnel (hors code).
> Mettre ce registre à jour à chaque évolution ; il alimente le module
> *QHSE → Certifications*.

Dernière revue : 2026-07-11 (audit technique du code + corrections)

> **Corrections apportées le 2026-07-11** (mesures techniques Annexe A) :
> 1. **8.5 — Anti-force brute** : le rate-limiting `@nestjs/throttler` utilisait
>    `ttl: 60` interprété en **millisecondes** (60 ms au lieu de 60 s) — fenêtres
>    corrigées à `60_000` ms (global, login, reset). La protection est désormais
>    effective (login : 5 tentatives/minute/IP).
> 2. **8.24 — Cryptographie** : le serveur **refuse de démarrer** sans un
>    `JWT_SECRET` fort (≥ 32 caractères, non trivial) — plus de signature possible
>    avec un secret « undefined » ou par défaut.
> 3. **8.20/8.5 — CORS fail-closed** : sans `CORS_ORIGIN` défini, aucune origine
>    tierce n'est autorisée en production (auparavant : toutes autorisées).
> 4. **8.23 — En-têtes** : `Permissions-Policy` ajustée (`camera=(self)`) pour la
>    borne de pointage tout en gardant micro/géoloc/paiement désactivés.

## A.5 — Mesures organisationnelles (37)

| Réf | Mesure | Statut | Note |
|---|---|---|---|
| 5.1 | Politiques de sécurité | 🟡 | `SECURITY.md` créé ; à faire approuver |
| 5.7 | Renseignement sur les menaces | 🏢 | — |
| 5.8 | Sécurité dans la gestion de projet | 🟡 | Présent doc |
| 5.10 | Usage acceptable des actifs | 🏢 | À rédiger |
| 5.12 | Classification de l'information | ✅ | Voir `SECURITY.md` §2 |
| 5.15 | Contrôle d'accès | ✅ | RBAC UI **et serveur** (`JwtAuthGuard` + `rbac.ts`) |
| 5.16 | Gestion des identités | ✅ | Comptes + rôles + MFA (TOTP) |
| 5.17 | Informations d'authentification | ✅ | Hachage **Argon2id**, politique MDP, reset à jeton haché/expirant |
| 5.18 | Droits d'accès | ✅ | Attribution/révocation par admin |
| 5.23 | Sécurité des services cloud | 🟡 | Netlify (en-têtes durcis) ; hébergement backend à figer |
| 5.29 | Continuité (sécurité) | 🟠 | Sauvegardes backend |
| 5.30 | Continuité TIC | 🟠 | PRA à définir |
| 5.31 | Exigences légales (CDP, RGPD) | 🟡 | Déclaration CDP à faire |
| 5.34 | Protection des PII / vie privée | 🟡 | ⚠️ Données patients en cache `localStorage` côté client (voir *Risques résiduels*) ; chiffrement au repos côté hébergeur DB |
| 5.36 | Conformité aux politiques | 🟡 | Module Certifications |

## A.6 — Mesures liées aux personnes (8)

| Réf | Mesure | Statut | Note |
|---|---|---|---|
| 6.1 | Sélection (vérifications) | 🏢 | RH |
| 6.3 | Sensibilisation & formation | 🏢 | À planifier |
| 6.5 | Responsabilités après départ | 🏢 | Désactivation de compte en place (technique) |
| 6.7 | Travail à distance | 🏢 | — |
| 6.8 | Signalement d'événements | 🟡 | Procédure dans `SECURITY.md` §8 |

## A.7 — Mesures physiques (14)

| Réf | Mesure | Statut | Note |
|---|---|---|---|
| 7.x | Sécurité des locaux/équipements | 🏢 | Du ressort de la clinique (couvert partiellement par QHSE) |

## A.8 — Mesures technologiques (34)

| Réf | Mesure | Statut | Note |
|---|---|---|---|
| 8.2 | Accès privilégiés | ✅ | Rôle admin + **MFA (TOTP)** disponible |
| 8.3 | Restriction d'accès à l'information | ✅ | `JwtAuthGuard` + RBAC serveur (`rbac.ts`) — aucune confiance au client |
| 8.5 | Authentification sécurisée | ✅ | Anti-force-brute (corrigé), timeout 30 min, MFA, messages génériques anti-énumération |
| 8.8 | Gestion des vulnérabilités techniques | 🟡 | `npm audit` : 2 vuln **dev-only** (esbuild/vite ≤6) — sans impact prod ; correctif = Vite 8 (majeur) |
| 8.9 | Gestion des configurations | ✅ | `netlify.toml` durci ; secrets via `.env` (non versionné) + `.env.example` |
| 8.12 | Prévention des fuites de données | 🟡 | Cookies httpOnly/Secure/SameSite ; ⚠️ cache client `localStorage` (voir *Risques résiduels*) |
| 8.13 | Sauvegardes | 🟠 | À mettre en place (hébergeur DB) |
| 8.15 | Journalisation | ✅ | `AuditService` serveur (connexions, modifications, MFA…) ; conservation append-only à durcir |
| 8.16 | Surveillance des activités | 🟠 | Supervision/alertes backend |
| 8.20 | Sécurité des réseaux | ✅ | HTTPS/CDN + CORS fail-closed (corrigé) |
| 8.21 | Sécurité des services réseau | ✅ | TLS + HSTS (preload) |
| 8.23 | Filtrage web / en-têtes | ✅ | CSP strict, X-Frame-Options DENY, nosniff, Referrer/Permissions-Policy |
| 8.24 | Cryptographie | ✅ | **Argon2id** (MDP), TLS/HSTS, `JWT_SECRET` fort validé au démarrage ; chiffrement au repos = hébergeur DB |
| 8.26 | Exigences de sécurité applicatives | ✅ | ValidationPipe strict, RBAC, en-têtes, sessions |
| 8.28 | Codage sécurisé | ✅ | `ValidationPipe` (whitelist + forbidNonWhitelisted) serveur ; aucun `dangerouslySetInnerHTML`/`eval` côté front |

## Risques résiduels (à traiter)

| Risque | Réf | Recommandation |
|---|---|---|
| Cache client des données patients en `localStorage` (borne de pointage / poste partagé) | 8.12 / 5.34 | Ne pas persister les collections sensibles, ou chiffrer le store, ou purger à la déconnexion / après inactivité |
| Vulnérabilités `npm audit` dev-only (esbuild/vite) | 8.8 | Planifier la montée Vite 8 ; sans impact sur le build de production |
| Sauvegardes & supervision backend | 8.13 / 8.16 | À mettre en place chez l'hébergeur (PostgreSQL managé) |

---

## Synthèse

| Statut | Nombre (indicatif) |
|---|---|
| ✅ En place | mesures techniques de transport/accès de base |
| 🟡 Partiel | RBAC, authentification, journalisation |
| 🟠 Planifié (backend) | chiffrement repos, sauvegardes, audit inviolable, supervision |
| 🏢 Organisationnel | politiques, RH, physique, continuité |

**Prochaine étape déterminante** : déployer le backend sécurisé (§5 de `SECURITY.md`)
pour faire passer les lignes 🟠 en 🟡/✅, puis traiter les mesures 🏢 (SMSI).
