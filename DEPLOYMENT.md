# 🚀 Déploiement ClinikDia

## Frontend (React + Vite) → Netlify

### Étapes:

1. Allez sur https://app.netlify.com
2. "Add new site" → "Import an existing project"
3. Autorisez Netlify à accéder à votre GitHub
4. Sélectionnez `papisndiaye793-bot/CLINIKDIA2`
5. **Build settings** (Netlify remplit automatiquement):
   - Build command: `npm run build`
   - Publish directory: `dist`
6. **Environment variables** (ajouter dans Netlify UI):
   ```
   VITE_API_BASE = https://clinikdia-api.onrender.com
   ```
   (À remplacer par l'URL réelle de votre backend une fois déployé)
7. Cliquez "Deploy site"

**Résultat:** Un lien `https://xxx.netlify.app` 🎉

---

## Backend (NestJS + Prisma) → Render.com

### Étape 1: Créer la base de données PostgreSQL

1. Allez sur https://dashboard.render.com
2. "Create" → "PostgreSQL"
3. Configurez:
   - **Name:** `clinikdia-db`
   - **Database:** `clinikdia`
   - **User:** `clinikdia`
   - **Region:** Frankfurt ou votre région
   - **Plan:** Free (gratuit)
4. Cliquez "Create Database"
5. **Copiez la `Internal Connection String`** (format: `postgresql://...`)

### Étape 2: Créer le Web Service (Backend)

1. "Create" → "Web Service"
2. **Repository:** Sélectionnez `papisndiaye793-bot/CLINIKDIA2`
3. **Settings:**
   - **Name:** `clinikdia-api`
   - **Branch:** `main`
   - **Runtime:** Node
   - **Build command:** `npm --prefix server install && npm --prefix server run build`
   - **Start command:** `npm --prefix server run start:prod`
   - **Plan:** Free
4. **Environment Variables** (ajouter dans Render UI):
   ```
   DATABASE_URL = [coller la connection string PostgreSQL d'étape 1]
   JWT_SECRET = [générer: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"]
   NODE_ENV = production
   ```
5. Cliquez "Create Web Service"

**Résultat:** Une URL comme `https://clinikdia-api.onrender.com` ✅

### Étape 3: Configurer le Frontend pour utiliser l'API

Une fois l'URL du backend connue:

1. Retour à Netlify
2. Site settings → Build & deploy → Environment
3. Ajouter/modifier: `VITE_API_BASE = https://clinikdia-api.onrender.com`
4. Redéployer (Trigger deploy)

---

## Notes Importantes

⚠️ **Plan Free sur Render = démarrage lent** (~30s) et arrêt après inactivité 15 min.

Pour production:
- Upgrader à plan payant Render
- Utiliser une base PostgreSQL managée (AWS RDS, DigitalOcean, etc.)
- Configurer les secrets correctement (ne pas les commiter)

✅ **Générer JWT_SECRET fort:**
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## Dépannage

**Erreur 403 authentification:** Vérifier les credentials GitHub sur Netlify/Render

**API pas accessible du frontend:** Vérifier VITE_API_BASE et CORS backend

**Base de données non trouvée:** Copier l'Internal Connection String correctement depuis Render

