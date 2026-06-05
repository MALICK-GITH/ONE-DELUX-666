/**
 * RUST SIT XPR - Advanced Match Search
 * Adapted from ONE-DELUX and wired to the current API.
 */

(function (global) {
  "use strict";

  function normalizeText(value = "") {
    return String(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s_-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getStatusKey(match) {
    return String(match?.normalizedStatus || match?.statusNormalized || match?.status || "")
      .toLowerCase()
      .trim();
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  class MatchAdvancedSearch {
    constructor() {
      this.matches = [];
      this.filteredMatches = [];
      this.state = {
        query: "",
        status: "all",
        league: "all",
        sortField: "startTime",
        sortDirection: "asc",
      };
      this.elements = {};
      this.ready = false;
    }

    init() {
      const main = document.getElementById("main-content");
      if (!main || this.ready) return;

      const panel = document.createElement("section");
      panel.className = "advanced-search-shell";
      panel.innerHTML = `
        <div class="advanced-search-panel">
          <div class="advanced-search-header">
            <div>
              <p class="advanced-search-kicker">Recherche avancée</p>
              <h2>Statut, ligue et filtrage rapide</h2>
            </div>
            <button type="button" class="advanced-search-refresh" data-action="refresh">Actualiser</button>
          </div>

          <div class="advanced-search-toolbar">
            <label class="advanced-search-field">
              <span>Recherche</span>
              <input id="advancedSearchQuery" type="search" placeholder="Equipe, ligue, statut..." />
            </label>
            <label class="advanced-search-field">
              <span>Statut</span>
              <select id="advancedSearchStatus">
                <option value="all">Tous</option>
                <option value="upcoming">A venir</option>
                <option value="live">En cours</option>
                <option value="finished">Termines</option>
              </select>
            </label>
            <label class="advanced-search-field">
              <span>Ligue</span>
              <select id="advancedSearchLeague">
                <option value="all">Toutes les ligues</option>
              </select>
            </label>
            <label class="advanced-search-field">
              <span>Tri</span>
              <select id="advancedSearchSort">
                <option value="startTime">Heure</option>
                <option value="league">Ligue</option>
                <option value="status">Statut</option>
              </select>
            </label>
            <button type="button" class="advanced-search-clear" data-action="clear">Reinitialiser</button>
          </div>

          <div class="advanced-search-summary">
            <strong id="advancedSearchCount">0 matchs</strong>
            <span id="advancedSearchMeta">Chargement...</span>
          </div>

          <div id="advancedSearchResults" class="advanced-search-results"></div>
        </div>
      `;

      main.insertBefore(panel, main.firstChild);

      this.elements = {
        panel,
        query: panel.querySelector("#advancedSearchQuery"),
        status: panel.querySelector("#advancedSearchStatus"),
        league: panel.querySelector("#advancedSearchLeague"),
        sort: panel.querySelector("#advancedSearchSort"),
        count: panel.querySelector("#advancedSearchCount"),
        meta: panel.querySelector("#advancedSearchMeta"),
        results: panel.querySelector("#advancedSearchResults"),
        refreshBtn: panel.querySelector('[data-action="refresh"]'),
        clearBtn: panel.querySelector('[data-action="clear"]'),
      };

      this.bindEvents();
      this.ready = true;
      this.load();
    }

    bindEvents() {
      const { query, status, league, sort, refreshBtn, clearBtn } = this.elements;

      query?.addEventListener("input", () => {
        this.state.query = String(query.value || "");
        this.render();
      });

      status?.addEventListener("change", () => {
        this.state.status = status.value;
        this.render();
      });

      league?.addEventListener("change", () => {
        this.state.league = league.value;
        this.render();
      });

      sort?.addEventListener("change", () => {
        this.state.sortField = sort.value;
        this.render();
      });

      refreshBtn?.addEventListener("click", () => this.load());
      clearBtn?.addEventListener("click", () => this.reset());
    }

    reset() {
      this.state = {
        query: "",
        status: "all",
        league: "all",
        sortField: "startTime",
        sortDirection: "asc",
      };

      if (this.elements.query) this.elements.query.value = "";
      if (this.elements.status) this.elements.status.value = "all";
      if (this.elements.league) this.elements.league.value = "all";
      if (this.elements.sort) this.elements.sort.value = "startTime";

      this.render();
    }

    async load() {
      if (!this.elements.results) return;

      this.elements.meta.textContent = "Chargement des matchs...";
      this.elements.results.innerHTML = `<div class="advanced-search-loading">Chargement...</div>`;

      try {
        const data = global.SiteAPI ? await global.SiteAPI.matches() : await fetch("/api/matches").then((r) => r.json());
        this.matches = safeArray(data?.matches);
        this.populateLeagueOptions();
        this.render();

        const modeText = data?.count != null ? `${data.count} matchs charges` : `${this.matches.length} matchs charges`;
        this.elements.meta.textContent = `${modeText} | source: /api/matches`;
      } catch (error) {
        this.matches = [];
        this.filteredMatches = [];
        this.elements.results.innerHTML = `
          <div class="advanced-search-empty">
            Impossible de charger les matchs.
          </div>
        `;
        this.elements.meta.textContent = error.message || "Erreur de chargement";
      }
    }

    populateLeagueOptions() {
      if (!this.elements.league) return;

      const current = this.elements.league.value || "all";
      const leagues = Array.from(
        new Set(this.matches.map((match) => String(match?.league || "").trim()).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b));

      this.elements.league.innerHTML = `
        <option value="all">Toutes les ligues</option>
        ${leagues.map((league) => `<option value="${this.escapeHtml(league)}">${this.escapeHtml(league)}</option>`).join("")}
      `;

      this.elements.league.value = leagues.includes(current) ? current : "all";
    }

    applyFilters() {
      const query = normalizeText(this.state.query);
      const status = normalizeText(this.state.status);
      const league = normalizeText(this.state.league);

      const filtered = this.matches.filter((match) => {
        const haystack = normalizeText([
          match?.team1,
          match?.team2,
          match?.league,
          match?.status,
          match?.normalizedStatus,
          match?.statusText,
          match?.period,
        ].join(" "));

        const matchStatus = getStatusKey(match);
        const matchLeague = normalizeText(match?.league || "");
        const queryOk = !query || haystack.includes(query);
        const leagueOk = league === "all" || matchLeague === league;

        let statusOk = true;
        if (status !== "all") {
          if (status === "live") statusOk = matchStatus === "en_cours" || matchStatus === "live";
          else if (status === "finished") statusOk = matchStatus === "terminé" || matchStatus === "finished";
          else if (status === "upcoming") statusOk = matchStatus === "a_venir" || matchStatus === "upcoming";
        }

        return queryOk && leagueOk && statusOk;
      });

      filtered.sort((a, b) => this.compareMatches(a, b));
      return filtered;
    }

    compareMatches(a, b) {
      const field = this.state.sortField;
      const direction = this.state.sortDirection === "desc" ? -1 : 1;
      const valueA = this.getSortValue(a, field);
      const valueB = this.getSortValue(b, field);

      if (valueA < valueB) return -1 * direction;
      if (valueA > valueB) return 1 * direction;
      return 0;
    }

    getSortValue(match, field) {
      if (field === "league") return normalizeText(match?.league || "");
      if (field === "status") return getStatusKey(match);
      if (field === "startTime") return Number(new Date(match?.startTime || match?.S || 0));
      return Number(new Date(match?.startTime || match?.S || 0));
    }

    render() {
      if (!this.elements.results) return;

      this.filteredMatches = this.applyFilters();
      this.elements.count.textContent = `${this.filteredMatches.length} match${this.filteredMatches.length > 1 ? "s" : ""}`;

      if (!this.filteredMatches.length) {
        this.elements.results.innerHTML = `
          <div class="advanced-search-empty">
            Aucun match ne correspond a ces criteres.
          </div>
        `;
        return;
      }

      this.elements.results.innerHTML = this.filteredMatches
        .map((match) => this.renderMatchCard(match))
        .join("");
    }

    renderMatchCard(match) {
      const oddHome = this.formatOdd(match?.odds?.home);
      const oddDraw = this.formatOdd(match?.odds?.draw);
      const oddAway = this.formatOdd(match?.odds?.away);
      const status = match?.status || match?.statusText || "Disponible";
      const period = match?.period || match?.currentPeriodString || "";

      return `
        <article class="match-card advanced-search-card">
          <div class="match-header">
            <div class="match-info">
              <p class="match-league">${this.escapeHtml(match?.league || "Competition virtuelle")}</p>
              <h3 class="match-title">${this.escapeHtml(match?.team1 || "Equipe 1")} vs ${this.escapeHtml(match?.team2 || "Equipe 2")}</h3>
              <p class="match-meta">
                <span class="match-status">${this.escapeHtml(status)}</span>
                ${period ? `<span class="match-period">· ${this.escapeHtml(period)}</span>` : ""}
              </p>
            </div>
          </div>
          <div class="odds-section">
            <div class="odds-grid">
              <div class="odd-box"><span class="odd-label">1</span><strong class="odd-value">${oddHome}</strong></div>
              <div class="odd-box"><span class="odd-label">X</span><strong class="odd-value">${oddDraw}</strong></div>
              <div class="odd-box"><span class="odd-label">2</span><strong class="odd-value">${oddAway}</strong></div>
            </div>
          </div>
          <div class="prediction-section">
            <a class="detail-link" href="/match.html?id=${encodeURIComponent(match?.id || "")}">Voir les details →</a>
          </div>
        </article>
      `;
    }

    formatOdd(value) {
      const number = Number(value);
      return Number.isFinite(number) ? number.toFixed(2) : "-";
    }

    escapeHtml(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }
  }

  function boot() {
    global.matchAdvancedSearch = new MatchAdvancedSearch();
    global.matchAdvancedSearch.init();
  }

  if (typeof window !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot);
    } else {
      boot();
    }
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = MatchAdvancedSearch;
  }
})(window);
