#!/usr/bin/env node
"use strict";

/**
 * Script de test pour examiner l'API 888starz
 * Signé: SOLITAIRE HACK
 */

const https = require("https");

const API_URL = "https://888starz.bet/service-api/LiveFeed/Get1x2_VZip?sports=85&count=5&lng=fr&gr=789&mode=4&country=96&partner=233&getEmpty=true&virtualSports=true&noFilterBlockEvent=true";

https.get(API_URL, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    try {
      const json = JSON.parse(data);
      
      if (json.Value && Array.isArray(json.Value)) {
        console.log("=== STRUCTURE DE L'API ===");
        console.log(`Nombre de matchs: ${json.Value.length}`);
        
        json.Value.slice(0, 3).forEach((event, index) => {
          console.log(`\n--- Match ${index + 1} ---`);
          console.log(`ID: ${event.I}`);
          console.log(`Équipe 1: ${event.O1}`);
          console.log(`Équipe 2: ${event.O2}`);
          console.log(`Ligue: ${event.L || event.LE}`);
          console.log(`Sport: ${event.SN}`);
          console.log(`Pays: ${event.CN || event.CE}`);
          console.log(`Début: ${event.S}`);
          console.log(`\n--- Statut (SC) ---`);
          console.log(`SC complet:`, JSON.stringify(event.SC, null, 2));
          console.log(`SC.SLS: ${event.SC?.SLS}`);
          console.log(`SC.I: ${event.SC?.I}`);
          console.log(`\n--- Période ---`);
          console.log(`TN: ${event.TN}`);
          console.log(`TNS: ${event.TNS}`);
        });
        
        // Extraire tous les statuts uniques
        const allStatuses = new Set();
        json.Value.forEach(event => {
          if (event.SC?.SLS) allStatuses.add(event.SC.SLS);
          if (event.SC?.I) allStatuses.add(String(event.SC.I));
        });
        
        console.log(`\n=== TOUS LES STATUTS UNIQUES ===`);
        console.log(Array.from(allStatuses));
        
        // Extraire toutes les périodes uniques
        const allPeriods = new Set();
        json.Value.forEach(event => {
          if (event.TN) allPeriods.add(event.TN);
          if (event.TNS) allPeriods.add(event.TNS);
        });
        
        console.log(`\n=== TOUTES LES PÉRIODES UNIQUES ===`);
        console.log(Array.from(allPeriods));
      } else {
        console.log("Structure inattendue de l'API");
        console.log(JSON.stringify(json, null, 2));
      }
    } catch (error) {
      console.error("Erreur de parsing JSON:", error);
    }
  });
}).on("error", (error) => {
  console.error("Erreur de requête:", error);
});
