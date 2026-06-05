# DEPLOYMENT ENDPOINTS - SOLITAIRE HACK

**Configuration de production pour Cron Learning Service**  
**URL Base:** `https://one-delux-fast.onrender.com`  
**Cle secrete:** definie via la variable d'environnement `CRON_SECRET`

---

## Liens et emplacements dans les systemes d'arriere-plan

### Render - Cron Job

**Emplacement dans Render Dashboard:**
1. Ouvrez votre dashboard Render
2. Selectionnez votre service `one-delux-fast`
3. Cliquez sur `Cron Jobs`
4. Cliquez sur `+ New Cron Job`
5. Collez cette commande dans `Command to run`

**Lien a placer:**
```bash
curl -X GET "https://one-delux-fast.onrender.com/cron/learn?key=<VOTRE_CRON_SECRET>&dryRun=0&debug=0"
```

**Configuration du Cron Job:**
- **Schedule:** `*/5 * * * *` ou `0 * * * *`
- **Command:** la commande ci-dessus
- **Region:** meme region que le web service

**Alternative - methode POST:**
```bash
curl -X POST "https://one-delux-fast.onrender.com/api/cron/learning/collect?key=<VOTRE_CRON_SECRET>"
```

---

### Render - Background Worker

**Emplacement dans Render Dashboard:**
1. Creez un nouveau `Background Worker`
2. Dans `Start Command`, utilisez une des options ci-dessous

**Option 1 - Appels periodiques:**
```bash
node -e "setInterval(() => { require('https').get('https://one-delux-fast.onrender.com/cron/learn?key=<VOTRE_CRON_SECRET>&dryRun=0&debug=0'); }, 300000);"
```

**Option 2 - Script dedie:**
```javascript
const https = require('https');
const CRON_URL = 'https://one-delux-fast.onrender.com/cron/learn?key=<VOTRE_CRON_SECRET>&dryRun=0&debug=0';

setInterval(() => {
  https.get(CRON_URL, (res) => {
    console.log(`[${new Date().toISOString()}] Cron job executed: ${res.statusCode}`);
  });
}, 300000); // 5 minutes
```

**Commande de demarrage:** `node worker.js`

---

### Linux Cron

**Emplacement:** crontab de l'utilisateur
```bash
crontab -e
```

**Lien a placer dans crontab:**
```bash
*/5 * * * * curl -X GET "https://one-delux-fast.onrender.com/cron/learn?key=<VOTRE_CRON_SECRET>&dryRun=0&debug=0"
```

**Alternative avec logging:**
```bash
*/5 * * * * curl -X GET "https://one-delux-fast.onrender.com/cron/learn?key=<VOTRE_CRON_SECRET>&dryRun=0&debug=0" >> /var/log/cron-learning.log 2>&1
```

---

### GitHub Actions

**Emplacement:** `.github/workflows/cron-learning.yml`

```yaml
name: Cron Learning Service
on:
  schedule:
    - cron: '*/5 * * * *'
  workflow_dispatch:

jobs:
  cron-job:
    runs-on: ubuntu-latest
    steps:
      - name: Execute Cron Learning
        run: |
          curl -X GET "https://one-delux-fast.onrender.com/cron/learn?key=<VOTRE_CRON_SECRET>&dryRun=0&debug=0"
```

**Emplacement dans GitHub:**
- Repository -> Settings -> Secrets -> ajouter `CRON_SECRET`
- Repository -> Actions -> creer le fichier workflow

---

### Uptime Robot / Pingdom

**Lien a placer comme Monitor URL:**
```text
https://one-delux-fast.onrender.com/cron/learn?key=<VOTRE_CRON_SECRET>&dryRun=0&debug=0
```

**Configuration:**
- **Check Type:** HTTPS
- **URL:** le lien ci-dessus
- **Check Interval:** 5 minutes
- **Alert:** si echec 3 fois consecutives

---

### AWS CloudWatch Events

**Emplacement:** AWS Console -> CloudWatch -> Events -> Rules

**Target a configurer:**
```json
{
  "httpRequest": {
    "url": "https://one-delux-fast.onrender.com/cron/learn?key=<VOTRE_CRON_SECRET>&dryRun=0&debug=0",
    "method": "GET"
  }
}
```

**Schedule Expression:** `rate(5 minutes)`

---

## Liens de controle manuel

### Endpoint de statut
**Lien:** `https://one-delux-fast.onrender.com/api/cron/learning/status?key=<VOTRE_CRON_SECRET>`
**Utilisation:** verifier si le cron est actif et combien de matchs ont ete collectes

### Endpoint de demarrage
**Lien:** `https://one-delux-fast.onrender.com/api/cron/learning/start?key=<VOTRE_CRON_SECRET>`
**Utilisation:** demarrer manuellement le service cron si arrete

### Endpoint d'arret
**Lien:** `https://one-delux-fast.onrender.com/api/cron/learning/stop?key=<VOTRE_CRON_SECRET>`
**Utilisation:** arreter manuellement le service cron pour maintenance

---

## Variables d'environnement a configurer

**Sur Render Dashboard:**
1. Service -> Settings -> Environment Variables
2. Ajouter:
   - `CRON_SECRET` = votre valeur secrete, stockee uniquement cote serveur
   - `SUPABASE_DATABASE_URL` = URL de connexion Supabase
   - `DATABASE_URL` = URL de base de donnees PostgreSQL alternative
   - `CRON_LEARNING_INTERVAL_MS` = `10000`

**Variables alternatives supportees:**
- `SUPABASE_DB_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`

**Note:** le code priorise `SUPABASE_DATABASE_URL`, puis `DATABASE_URL`.

---

## Tests de validation

**Test local avant deploiement:**
```bash
# Test status
curl "http://localhost:3029/api/cron/learning/status?key=<VOTRE_CRON_SECRET>"

# Test collecte
curl -X POST "http://localhost:3029/api/cron/learning/collect?key=<VOTRE_CRON_SECRET>"

# Test apres deploiement
curl "https://one-delux-fast.onrender.com/api/cron/learning/status?key=<VOTRE_CRON_SECRET>"
```

---

## Recommandation finale - SOLITAIRE HACK

**Option recommandee:** Render Cron Job
- Plus simple a configurer
- Monitoring integre
- Retries automatiques
- Logging natif
- Couts previsibles

**Configuration finale:**
- **URL:** `https://one-delux-fast.onrender.com/cron/learn?key=<VOTRE_CRON_SECRET>&dryRun=0&debug=0`
- **Methode:** GET
- **Frequence:** toutes les 5 minutes
- **Secret:** configure dans les variables d'environnement Render

---

**SIGNE:** SOLITAIRE HACK
**Date:** 2026-06-05
**Version:** 1.0 - Production Ready
