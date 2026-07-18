# 🚀 ClinikDia - GUIDE DE DÉPLOIEMENT RAPIDE (5-10 min)

## ✅ Fait: Frontend sur Netlify
- **URL:** https://legendary-gecko-65ebab.netlify.app
- Status: ✅ LIVE


## ⏳ À Faire: Backend sur Render (5-10 min)

### COPIER/COLLER - C'est tout ce que vous avez besoin:

---

## STEP 1: Créer Database PostgreSQL

**URL:** https://dashboard.render.com/new/postgres

Remplissez avec ces valeurs exactes:
```
Name: clinikdia-db
Database: clinikdia  
User: clinikdia
Password: [Render génère automatiquement]
Region: Frankfurt (Select Closest)
Plan: Free
```

✅ Créer

**IMPORTANT:** Une fois créée, 📋 COPIER la "Internal Connection String"
```
Format: postgresql://clinikdia:PASSWORD@dpg-xxxxx.render.com/clinikdia
```
→ Vous en aurez besoin plus tard!

---

## STEP 2: Créer Web Service (Backend API)

**URL:** https://dashboard.render.com/new/webservice

**SOURCE:** Sélectionner GitHub repo
- URL: https://github.com/papisndiaye793-bot/CLINIKDIA2
- Branch: main

**CONFIGURATION:**

```
Name: clinikdia-api
Environment: Node
Region: Frankfurt
Plan: Free

Build Command:
npm --prefix server install && npm --prefix server run build

Start Command:
npm --prefix server run start:prod
```

**ENVIRONMENT VARIABLES** (Ajouter 3 variables):

| Key | Value |
|-----|-------|
| `DATABASE_URL` | [COLLER la connection string de STEP 1] |
| `JWT_SECRET` | `d5c15007d6bcbb990341ebc08cc3cac2923293002df9f4b85f561693981d9f75d576d4b04b1ca57b2cbc4378626e6830` |
| `NODE_ENV` | `production` |

✅ "Create Web Service"

**⏳ Attendre 2-3 minutes le déploiement...**

Une fois prêt → 📋 COPIER l'URL: `https://clinikdia-api.onrender.com`

---

## STEP 3: Mettre à jour Frontend

**URL:** https://app.netlify.com/projects/legendary-gecko-65ebab/settings/builds

1. Cliquer "Environment"
2. Ajouter/Mettre à jour variable:
   ```
   VITE_API_BASE = https://clinikdia-api.onrender.com
   ```
   (Remplacer par l'URL obtenue en STEP 2)

3. Cliquer "Deploy" → "Trigger deploy" (ou "Deploys" → "Trigger deploy")

✅ Attendre 1-2 min

---

## 🎉 RÉSULTAT FINAL

```
Frontend:  https://legendary-gecko-65ebab.netlify.app
Backend:   https://clinikdia-api.onrender.com
```

**Login:**
- Email: `b.camara@clinikdia.sn`
- Password: `Admin1234`

---

## 🆘 PROBLÈMES?

### Backend n'apparaît pas après 3 min?
- Vérifier: Render Dashboard → Services → clinikdia-api → Logs
- Chercher les erreurs DATABASE_URL ou JWT_SECRET

### Frontend affiche "Cannot connect to API"
- Vérifier: Netlify → Environment variables → VITE_API_BASE est correct
- Relancer le deploy

### Base de données n'est pas accessible
- Vérifier: DATABASE_URL complète (format postgresql://...)
- S'assurer que Frankfurt region est sélectionné


---

## 📋 Checklist Finale

- [ ] Frontend déployé sur Netlify
- [ ] Database PostgreSQL créée sur Render
- [ ] Web Service Backend créé sur Render
- [ ] Variables d'env configurées (DATABASE_URL, JWT_SECRET, NODE_ENV)
- [ ] VITE_API_BASE mis à jour dans Netlify
- [ ] Frontend redéployé
- [ ] Test login: b.camara@clinikdia.sn / Admin1234

---

## 💡 Notes Importantes

**Render Free Plan:**
- ⏰ Spin down après 15 min d'inactivité (redémarrage ~30s)
- ⏳ 90 jours gratuit pour la DB
- 📈 Upgrader vers "Standard" pour production

**Netlify Free:**
- ✅ Gratuit pour sites statiques
- ⚡ Déploiement instantané

**Pour PRODUCTION:**
- 🔐 Upgrader les plans
- 🗄️ Utiliser managed DB externe (AWS RDS, DigitalOcean)
- 🔑 Changer JWT_SECRET
- 🌍 Domaine personnalisé

---

**Besoin d'aide?**
- Render Support: https://render.com/docs
- Netlify Support: https://docs.netlify.com/
- GitHub Repo: https://github.com/papisndiaye793-bot/CLINIKDIA2
