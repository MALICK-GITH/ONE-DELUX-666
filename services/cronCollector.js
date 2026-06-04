const fs = require("fs");
const path = require("path");

class CronCollector {
  constructor(options = {}) {
    this.interval = options.interval || 5 * 60 * 1000;
    this.outputPath = options.outputPath || path.join(process.cwd(), "data", "finished-matches.csv");
    this.isRunning = false;
    this.timer = null;
    this.collectedMatchIds = new Set();
    this.loadExistingMatchIds();
  }

  loadExistingMatchIds() {
    try {
      if (fs.existsSync(this.outputPath)) {
        const content = fs.readFileSync(this.outputPath, "utf8");
        const lines = content.split("\n").filter((line) => line.trim());
        if (lines.length > 1) {
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(",");
            if (cols.length > 0) {
              this.collectedMatchIds.add(cols[0].replace(/"/g, ""));
            }
          }
        }
        console.log(`[CRON Collector] ${this.collectedMatchIds.size} matchs déjà collectés chargés en mémoire`);
      }
    } catch (error) {
      console.error(`[CRON Collector] Erreur de chargement des matchs existants: ${error.message}`);
    }
  }

  generateSimulatedMatches() {
    const leagues = ["FC 26. Superligue", "FC 25. Champions League", "FC 24. Bundesliga"];
    const teams = ["Bayern Munich", "PSV Eindhoven", "Chelsea", "Juventus", "Real Madrid", "Liverpool"];
    const matches = [];
    const matchCount = 2 + Math.floor(Math.random() * 3);

    for (let i = 0; i < matchCount; i++) {
      const homeTeam = teams[Math.floor(Math.random() * teams.length)];
      let awayTeam = teams[Math.floor(Math.random() * teams.length)];
      while (awayTeam === homeTeam) {
        awayTeam = teams[Math.floor(Math.random() * teams.length)];
      }

      const match = {
        match_id: "match-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9),
        team_home: homeTeam,
        team_away: awayTeam,
        league: leagues[Math.floor(Math.random() * leagues.length)],
        score_home: Math.floor(Math.random() * 6),
        score_away: Math.floor(Math.random() * 6),
        finished_at: new Date().toISOString()
      };

      matches.push(match);
    }

    return matches;
  }

  escapeCsv(value) {
    const str = String(value || "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  saveMatches(matches) {
    if (matches.length === 0) {
      console.log(`[CRON Collector] Aucun nouveau match à sauvegarder`);
      return 0;
    }

    const dir = path.dirname(this.outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const header = "match_id,team_home,team_away,league,score_home,score_away,finished_at";
    const rows = matches.map((m) => [
      this.escapeCsv(m.match_id),
      this.escapeCsv(m.team_home),
      this.escapeCsv(m.team_away),
      this.escapeCsv(m.league),
      this.escapeCsv(m.score_home),
      this.escapeCsv(m.score_away),
      this.escapeCsv(m.finished_at),
    ].join(","));

    let content;
    if (fs.existsSync(this.outputPath)) {
      const existing = fs.readFileSync(this.outputPath, "utf8");
      const existingLines = existing.split("\n").filter((line) => line.trim());
      if (existingLines.length > 0) {
        content = [header, ...existingLines.slice(1), ...rows].join("\n");
      } else {
        content = [header, ...rows].join("\n");
      }
    } else {
      content = [header, ...rows].join("\n");
    }

    fs.writeFileSync(this.outputPath, content, "utf8");

    matches.forEach((m) => this.collectedMatchIds.add(m.match_id));

    console.log(`[CRON Collector] ${matches.length} matchs sauvegardés dans ${this.outputPath}`);
    return matches.length;
  }

  collect() {
    const newMatches = this.generateSimulatedMatches().filter((m) => !this.collectedMatchIds.has(m.match_id));
    this.saveMatches(newMatches);
  }

  start() {
    if (this.isRunning) {
      console.log(`[CRON Collector] Déjà en cours d'exécution`);
      return;
    }

    console.log(`[CRON Collector] Démarrage du collecteur CRON (intervalle: ${this.interval / 1000}s)`);
    this.isRunning = true;

    this.collect();

    this.timer = setInterval(() => {
      this.collect();
    }, this.interval);
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log(`[CRON Collector] Arrêt du collecteur CRON`);
    this.isRunning = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      interval: this.interval,
      outputPath: this.outputPath,
      collectedCount: this.collectedMatchIds.size,
      lastCheck: new Date().toISOString(),
    };
  }
}

module.exports = CronCollector;