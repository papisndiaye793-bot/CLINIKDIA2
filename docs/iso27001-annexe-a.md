# Registre ISO/IEC 27001:2022 — Annexe A (déclaration d'applicabilité)

> État des **93 mesures** de l'Annexe A regroupées en 4 thèmes. Statuts :
> ✅ En place · 🟡 Partiel · 🟠 Planifié (backend) · 🏢 Organisationnel (hors code).
> Mettre ce registre à jour à chaque évolution ; il alimente le module
> *QHSE → Certifications*.

Dernière revue : 2026-06-22

## A.5 — Mesures organisationnelles (37)

| Réf | Mesure | Statut | Note |
|---|---|---|---|
| 5.1 | Politiques de sécurité | 🟡 | `SECURITY.md` créé ; à faire approuver |
| 5.7 | Renseignement sur les menaces | 🏢 | — |
| 5.8 | Sécurité dans la gestion de projet | 🟡 | Présent doc |
| 5.10 | Usage acceptable des actifs | 🏢 | À rédiger |
| 5.12 | Classification de l'information | ✅ | Voir `SECURITY.md` §2 |
| 5.15 | Contrôle d'accès | 🟡 | RBAC UI ; à renforcer serveur |
| 5.16 | Gestion des identités | 🟡 | Comptes + rôles |
| 5.17 | Informations d'authentification | 🟡 | Politique MDP, reset vérifié ; hachage à venir |
| 5.18 | Droits d'accès | ✅ | Attribution/révocation par admin |
| 5.23 | Sécurité des services cloud | 🟡 | Netlify ; backend à choisir |
| 5.29 | Continuité (sécurité) | 🟠 | Sauvegardes backend |
| 5.30 | Continuité TIC | 🟠 | PRA à définir |
| 5.31 | Exigences légales (CDP, RGPD) | 🟡 | Déclaration CDP à faire |
| 5.34 | Protection des PII / vie privée | 🟠 | Chiffrement + rétention backend |
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
| 8.2 | Accès privilégiés | 🟡 | Rôle admin ; MFA à venir |
| 8.3 | Restriction d'accès à l'information | 🟡 | UI ; **RLS serveur à venir** |
| 8.5 | Authentification sécurisée | 🟡 | Anti-bruteforce + timeout ; **MFA à venir** |
| 8.8 | Gestion des vulnérabilités techniques | ✅ | `npm audit` (0 vuln) ; CI à ajouter |
| 8.9 | Gestion des configurations | 🟡 | `netlify.toml` durci |
| 8.12 | Prévention des fuites de données | 🟠 | Chiffrement + cloisonnement backend |
| 8.13 | Sauvegardes | 🟠 | À mettre en place (backend) |
| 8.15 | Journalisation | 🟡 | Audit UI ; **append-only serveur à venir** |
| 8.16 | Surveillance des activités | 🟠 | Supervision/alertes backend |
| 8.20 | Sécurité des réseaux | ✅ | HTTPS/CDN |
| 8.21 | Sécurité des services réseau | ✅ | TLS |
| 8.23 | Filtrage web / en-têtes | ✅ | CSP, etc. |
| 8.24 | Cryptographie | 🟡 | TLS en place ; **chiffrement au repos + Argon2id à venir** |
| 8.26 | Exigences de sécurité applicatives | 🟡 | En cours |
| 8.28 | Codage sécurisé | 🟡 | Validation à généraliser côté serveur |

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
