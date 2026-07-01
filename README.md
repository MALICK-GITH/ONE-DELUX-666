# READY TO INSTALL

Suivre exactement ces étapes.

## 1. Copier le projet

Copier tout le dossier du projet sur la machine.

## 2. Créer le fichier `.env`

Mettre ceci dedans :

```env
PORT=3000
LIVE_FEED_URL=https://888starz.bet/service-api/LiveFeed/Get1x2_VZip
PENALTY_API_URL=https://888starz.bet/service-api/LiveFeed/Get1x2_VZip
PREDICTION_API_URL=https://top-modele-train-api-vmp.onrender.com
LIVE_FEED_TIMEOUT_MS=45000
NODE_ENV=production
```

## 3. Installer les dépendances

Dans le dossier du projet :

```bash
npm install
```

## 4. Lancer le serveur

```bash
node server.js
```

## 5. Ouvrir le site

```txt
http://127.0.0.1:3000
```

## 6. Utiliser l’API matchs

### Tous les matchs

```txt
GET /api/matches
```

### Un match précis

```txt
GET /api/matches/:id
```

## 7. Statuts déjà corrigés

Le système retourne déjà les bons statuts :

- `a_venir`
- `en_cours`
- `termine`

## 8. Ce qui est déjà prêt

Pas besoin de chercher :

- la bonne URL API
- les bons paramètres
- les bons headers
- la correction du `406`
- la correction des faux matchs live
- la correction des statuts
- la correction de `1 / X / 2`

## 9. Si tout est bien lancé

Tu dois avoir :

- page d’accueil fonctionnelle
- page coupon fonctionnelle
- `/api/matches` fonctionnel

## 10. Fichiers utiles à lire si besoin

- `MATCH_SAVE_GUIDE.md`
- `DEPLOYMENT_ENDPOINTS.md`
- `.env.example`

Le projet est déjà préparé pour éviter les recherches inutiles.
