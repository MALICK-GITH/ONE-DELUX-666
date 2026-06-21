const https = require("https");
const http = require("http");

class AIModelClient {
  constructor(baseUrl, apiKey, model) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.model = model;
  }

  async listModels() {
    const response = await this.getJson("/models");
    const models = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
    return models.map(normalizeModelEntry).filter(Boolean);
  }

  async generateMatchInsight(payload) {
    const selectedModel = payload?.model || this.model;
    const response = await this.postJson("/chat/completions", {
      model: selectedModel,
      messages: buildMatchMessages(payload),
      temperature: 0.4
    });

    const content = response?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Réponse IA vide");
    }

    return {
      model: response.model || selectedModel,
      requestedModel: selectedModel,
      content
    };
  }

  async chatWithSiteAssistant(payload) {
    const selectedModel = payload?.model || this.model;
    const response = await this.postJson("/chat/completions", {
      model: selectedModel,
      messages: buildSiteAssistantMessages(payload),
      temperature: 0.5
    });

    const content = response?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Réponse IA vide");
    }

    return {
      model: response.model || selectedModel,
      requestedModel: selectedModel,
      content
    };
  }

  getJson(path) {
    this.assertConfigured();
    return this.requestJson("GET", path);
  }

  postJson(path, body) {
    this.assertConfigured();
    return this.requestJson("POST", path, body);
  }

  assertConfigured() {
    if (!this.apiKey) {
      throw new Error("Clé IA indisponible");
    }
  }

  requestJson(method, path, body) {
    return new Promise((resolve, reject) => {
      const base = new URL(this.baseUrl);
      const protocol = base.protocol === "https:" ? https : http;
      const payload = body ? JSON.stringify(body) : null;
      const options = {
        hostname: base.hostname,
        port: base.port || (base.protocol === "https:" ? 443 : 80),
        path: `${base.pathname.replace(/\/$/, "")}${path}`,
        method,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.apiKey}`
        }
      };

      if (payload) {
        options.headers["Content-Type"] = "application/json";
        options.headers["Content-Length"] = Buffer.byteLength(payload);
      }

      const req = protocol.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(json);
              return;
            }
            reject(new Error(json.error?.message || json.error || json.message || `HTTP ${res.statusCode}`));
          } catch (error) {
            reject(new Error(`Erreur de parsing JSON: ${error.message}`));
          }
        });
      });

      req.on("error", (error) => {
        reject(new Error(`Erreur de connexion IA: ${error.message}`));
      });

      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  }
}

function buildMatchMessages(payload) {
  const prediction = payload?.prediction || {};
  return [
    {
      role: "system",
      content: "Tu es un analyste football virtuel premium. Réponds en français clair, concis, orienté décision. Donne 4 blocs courts: Résumé, Pari principal, Risque, Pari alternatif."
    },
    {
      role: "user",
      content: [
        `Match: ${payload.teamHome} vs ${payload.teamAway}`,
        `Ligue: ${payload.league}`,
        `Statut: ${payload.status || "inconnu"}`,
        `Score: ${payload.score || "N/A"}`,
        `Prédiction JSON: ${JSON.stringify(prediction.predictions || prediction)}`
      ].join("\n")
    }
  ];
}

function buildSiteAssistantMessages(payload) {
  const creator = payload?.siteContext?.creator || {};
  const stats = payload?.siteContext?.stats || {};
  const matches = Array.isArray(payload?.siteContext?.matches) ? payload.siteContext.matches : [];
  const coupons = payload?.siteContext?.coupon || {};
  const compareMode = payload?.siteContext?.compareMode || null;
  const quickActions = Array.isArray(payload?.siteContext?.quickActions) ? payload.siteContext.quickActions : [];
  const history = Array.isArray(payload?.messages) ? payload.messages : [];

  const systemMessage = {
    role: "system",
    content: [
      "Tu es l'assistant officiel de FURY X ONE.",
      "Tu connais parfaitement le site, son créateur, ses numéros, ses pages, les matchs disponibles, les prédictions et les coupons.",
      "Tu réponds en français, de façon naturelle, directe, utile et concise.",
      "Tu peux recommander un pari, commenter une prédiction, suggérer un coupon, expliquer ton avis et proposer une suite logique.",
      "Tu peux filtrer les matchs par ligue, statut, confiance ou cotes selon la demande utilisateur.",
      "Quand un mode comparaison est fourni, compare clairement l'avis système et ton avis IA.",
      "Quand l'utilisateur demande des informations sur le créateur ou le site, réponds avec les données de contexte fournies.",
      "Quand l'utilisateur demande les matchs ou un coupon, base-toi sur les données de contexte les plus récentes."
    ].join(" ")
  };

  const contextMessage = {
    role: "system",
    content: JSON.stringify({
      app: "FURY X ONE",
      creator,
      stats,
      matches,
      coupon: coupons,
      compareMode,
      quickActions
    })
  };

  return [systemMessage, contextMessage, ...history];
}

function normalizeModelEntry(item) {
  if (!item) return null;
  if (typeof item === "string") {
    return { id: item, label: item, type: "text" };
  }

  const id = item.id || item.model || item.name;
  if (!id) return null;

  return {
    id,
    label: item.name || item.id || item.model,
    type: String(item.type || item.object || "text").toLowerCase(),
    description: item.description || item.notes || "",
    status: item.status || ""
  };
}

module.exports = AIModelClient;
