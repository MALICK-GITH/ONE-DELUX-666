# 🚀 DEPLOYMENT ENDPOINTS - SOLITAIRE HACK

**Configuration de production pour Cron Learning Service**
**URL Base:** https://one-delux-fast.onrender.com
**Clé secrète:** one-delux-cron-2026-secure

---

## 📋 LIENS ET EMPLACEMENTS DANS LES SYSTÈMES D'ARRIÈRE-PLAN

### 🔵 RENDER - CRON JOB (RECOMMANDÉ)

**Emplacement dans Render Dashboard:**
1. Allez dans votre dashboard Render
2. Sélectionnez votre service "one-delux-fast"
3. Cliquez sur "Cron Jobs" dans le menu gauche
4. Cliquez sur "+ New Cron Job"
5. Collez ce lien dans "Command to run"

**Lien à placer:**
```
curl -X GET "https://one-delux-fast.onrender.com/cron/learn?key=one-delux-cron-2026-secure&dryRun=0&debug=0"
```

**Configuration du Cron Job:**
- **Schedule:** `*/5 * * * *` (toutes les 5 minutes) OU `0 * * * *` (toutes les heures)
- **Command:** Le lien ci-dessus
- **Region:** Same as your web service

**Alternative - Méthode POST pour Cron Job:**
```
curl -X POST "https://one-delux-fast.onrender.com/api/cron/learning/collect?key=one-delux-cron-2026-secure"
```

---

### 🟢 RENDER - BACKGROUND WORKER

**Emplacement dans Render Dashboard:**
1. Créez un nouveau "Background Worker" dans Render
2. Dans "Start Command", placez:

**Option 1 - Worker qui fait des appels périodiques:**
```bash
node -e "setInterval(() => { require('https').get('https://one-delux-fast.onrender.com/cron/learn?key=one-delux-cron-2026-secure&dryRun=0&debug=0'); }, 300000);"
```

**Option 2 - Worker avec script dédié:**
Créez un fichier `worker.js` avec:
```javascript
const https = require('https');
const CRON_URL = 'https://one-delux-fast.onrender.com/cron/learn?key=one-delux-cron-2026-secure&dryRun=0&debug=0';

setInterval(() => {
  https.get(CRON_URL, (res) => {
    console.log(`[${new Date().toISOString()}] Cron job executed: ${res.statusCode}`);
  });
}, 300000); // 5 minutes
```

**Commande de démarrage:** `node worker.js`

---

### 🟡 LINUX CRON (serveur VPS/dédié)

**Emplacement:** Crontab de l'utilisateur
```bash
crontab -e
```

**Lien à placer dans crontab:**
```bash
*/5 * * * * curl -X GET "https://one-delux-fast.onrender.com/cron/learn?key=one-delux-cron-2026-secure&dryRun=0&debug=0"
```

**Alternative avec logging:**
```bash
*/5 * * * * curl -X GET "https://one-delux-fast.onrender.com/cron/learn?key=one-delux-cron-2026-secure&dryRun=0&debug=0" >> /var/log/cron-learning.log 2>&1
```

---

### 🟠 GITHUB ACTIONS

**Emplacement:** `.github/workflows/cron-learning.yml`

```yaml
name: Cron Learning Service
on:
  schedule:
    - cron: '*/5 * * * *'  # Toutes les 5 minutes
  workflow_dispatch:       # Déclenchement manuel

jobs:
  cron-job:
    runs-on: ubuntu-latest
    steps:
      - name: Execute Cron Learning
        run: |
          curl -X GET "https://one-delux-fast.onrender.com/cron/learn?key=one-delux-cron-2026-secure&dryRun=0&debug=0"
```

**Emplacement dans GitHub:**
- Repository → Settings → Secrets (ajouter CRON_SECRET si besoin)
- Repository → Actions → créer le fichier workflow

---

### 🟣 UPTIME ROBOT / PINGDOM (Monitoring)

**Lien à placer comme "Monitor URL":**
```
https://one-delux-fast.onrender.com/cron/learn?key=one-delux-cron-2026-secure&dryRun=0&debug=0
```

**Configuration:**
- **Check Type:** HTTPS
- **URL:** Le lien ci-dessus
- **Check Interval:** 5 minutes
- **Alert:** Si échec 3 fois consécutives

---

### 🔴 AWS CLOUDWATCH EVENTS

**Emplacement:** AWS Console → CloudWatch → Events → Rules

**Target à configurer:**
```json
{
  "httpRequest": {
    "url": "https://one-delux-fast.onrender.com/cron/learn?key=one-delux-cron-2026-secure&dryRun=0&debug=0",
    "method": "GET"
  }
}
```

**Schedule Expression:** `rate(5 minutes)`

---

## 📱 LIENS DE CONTRÔLE MANUEL (pour monitoring/debug)

### Endpoint de STATUT
**Lien:** `https://one-delux-fast.onrender.com/api/cron/learning/status?key=one-delux-cron-2026-secure`
**Utilisation:** Vérifier si le cron est actif et combien de matchs ont été collectés
**Emplacement:** Bookmark dans votre navigateur pour monitoring rapide

### Endpoint de DÉMARRAGE
**Lien:** `https://one-delux-fast.onrender.com/api/cron/learning/start?key=one-delux-cron-2026-secure`
**Utilisation:** Démarrer manuellement le service cron si arrêté
**Emplacement:** Script d'urgence ou dashboard de monitoring

### Endpoint d'ARRÊT
**Lien:** `https://one-delux-fast.onrender.com/api/cron/learning/stop?key=one-delux-cron-2026-secure`
**Utilisation:** Arrêter manuellement le service cron pour maintenance
**Emplacement:** Script de maintenance

---

## 🔐 VARIABLES D'ENVIRONNEMENT À CONFIGURER

**Sur Render Dashboard:**
1. Service → Settings → Environment Variables
2. Ajouter:
   - `CRON_SECRET` = `one-delux-cron-2026-secure`
   - `SUPABASE_DB_URL` = votre URL de connexion Supabase (format: postgresql://postgres:[password]@[host]:5432/[database])
   - `SUPABASE_SERVICE_KEY` = votre clé service Supabase (optionnel pour authentification)
   - `CRON_LEARNING_INTERVAL_MS` = `300000` (5 minutes)

**Variables alternatives supportées:**
- `DATABASE_URL` = URL de base de données (fallback)
- `SUPABASE_ANON_KEY` = Clé anonyme Supabase (alternative)

---

## 🧪 TESTS DE VALIDATION

**Test local avant déploiement:**
```bash
# Test status
curl "http://localhost:3029/api/cron/learning/status?key=one-delux-cron-2026-secure"

# Test collecte
curl -X POST "http://localhost:3029/api/cron/learning/collect?key=one-delux-cron-2026-secure"

# Test après déploiement
curl "https://one-delux-fast.onrender.com/api/cron/learning/status?key=one-delux-cron-2026-secure"
```

---

## 📊 RECOMMANDATION FINALE - SOLITAIRE HACK

**Option RECOMMANDÉE:** Render Cron Job
- Plus simple à configurer
- Monitoring intégré
- Automatic retries
- Logging natif
- Coûts prévisibles

**Configuration finale:**
- **URL:** `https://one-delux-fast.onrender.com/cron/learn?key=one-delux-cron-2026-secure&dryRun=0&debug=0`
- **Méthode:** GET
- **Fréquence:** Toutes les 5 minutes
- **Secret:** Configuré dans variables d'environnement Render

---

**SIGNÉ:** SOLITAIRE HACK
**Date:** 2026-06-05
**Version:** 1.0 - Production Ready
