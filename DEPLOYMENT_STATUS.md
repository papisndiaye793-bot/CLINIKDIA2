# 🚀 ClinikDia - Déploiement Production (2026-07-18)

## ✅ Status Déploiement

### Frontend (Netlify)
- **Status:** ✅ **DÉPLOYÉ** 
- **URL:** https://legendary-gecko-65ebab.netlify.app
- **Build:** Production (Vite build: 17.42s)
- **Branch:** main
- **Last Deploy:** 2026-07-18 17:56 PM

### Backend (Render) - À FAIRE
- **Status:** ⏳ **EN ATTENTE**
- **URL:** https://clinikdia-api.onrender.com (à obtenir)
- **Database:** PostgreSQL (à créer)
- **JWT_SECRET:** `d5c15007d6bcbb990341ebc08cc3cac2923293002df9f4b85f561693981d9f75d576d4b04b1ca57b2cbc4378626e6830`

---

## 📋 Déploiement Netlify (Frontend) ✅ DONE

**Site:** legendary-gecko-65ebab.netlify.app

Prochaines étapes:
1. ✅ Code poussé sur GitHub
2. ✅ Build settings configurés (npm run build)
3. ⏳ Configurer variables d'env pour l'API backend
4. ⏳ Redéployer avec VITE_API_BASE

---

## 🔧 Déploiement Render (Backend) - À FAIRE

### Étape 1: Créer PostgreSQL Database

1. Allez sur https://dashboard.render.com
2. **New** → **PostgreSQL**
3. Configuration:
   - **Name:** `clinikdia-db`
   - **Database:** `clinikdia`
   - **User:** `clinikdia`
   - **Region:** Frankfurt ou France
   - **Plan:** Free (gratuit, 90 jours)
4. Créer → Copier **Internal Connection String**
   ```
   postgresql://clinikdia:PASSWORD@dpg-xxxxx.render.com/clinikdia
   ```

### Étape 2: Créer Web Service (Backend API)

1. **New** → **Web Service**
2. **Repository:** `papisndiaye793-bot/CLINIKDIA2`
3. **Settings:**
   ```
   Name: clinikdia-api
   Environment: Node
   Region: Frankfurt
   Branch: main
   Build Command: npm --prefix server install && npm --prefix server run build
   Start Command: npm --prefix server run start:prod
   Plan: Free
   ```
4. **Environment Variables:**
   ```
   DATABASE_URL = postgresql://clinikdia:PASSWORD@dpg-xxxxx/clinikdia
   JWT_SECRET = d5c15007d6bcbb990341ebc08cc3cac2923293002df9f4b85f561693981d9f75d576d4b04b1ca57b2cbc4378626e6830
   NODE_ENV = production
   ```
5. Create → Attendre le deploy (2-3 min)

### Étape 3: Récupérer URL et mettre à jour Netlify

Une fois Render terminé:
- Copier l'URL: `https://clinikdia-api.onrender.com`
- Allez sur Netlify: https://app.netlify.com/projects/legendary-gecko-65ebab/settings/deploys
- **Environment variables:**
  - `VITE_API_BASE = https://clinikdia-api.onrender.com`
- **Trigger deploy** (ou manuellement dans Deploys)

---

## 🌐 URLs Finales

```
Frontend:  https://legendary-gecko-65ebab.netlify.app
Backend:   https://clinikdia-api.onrender.com
Database:  PostgreSQL (Render managed)
```

---

## 🔐 Secrets

**JWT_SECRET (production):**
```
d5c15007d6bcbb990341ebc08cc3cac2923293002df9f4b85f561693981d9f75d576d4b04b1ca57b2cbc4378626e6830
```

---

## ⚡ Notes Importantes

- **Render Free Plan:** Arrêt après 15 min d'inactivité (cold start ~30s)
- **Netlify Free:** Gratuit pour sites statiques
- **Database:** Gratuit pour 90 jours sur Render
- **Pour production:** Upgrader les plans et ajouter un certificat SSL

---

## 🧪 Test Local

```bash
# Terminal 1 - Backend
cd server
npm run start:dev

# Terminal 2 - Frontend
npm run dev

# Browser
http://localhost:5181
Credentials: b.camara@clinikdia.sn / Admin1234
```

---

## 📞 Support

- **Netlify Docs:** https://docs.netlify.com/
- **Render Docs:** https://render.com/docs
- **GitHub Repo:** https://github.com/papisndiaye793-bot/CLINIKDIA2
