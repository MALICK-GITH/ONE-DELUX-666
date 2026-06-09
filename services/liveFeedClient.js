"use strict";

/**
 * Live Feed Client - 888starz.bet API
 * Fetch live match data from 888starz LiveFeed API
 * Signed: SOLITAIRE HACK
 */

const https = require("https");
const http = require("http");

class LiveFeedClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || "https://888starz.bet/service-api/LiveFeed/Get1x2_VZip";
    this.defaultParams = {
      sports: "85",
      count: options.count || "40",
      lng: "fr",
      gr: "789",
      mode: "4",
      country: "96",
      partner: "233",
      getEmpty: "true",
      virtualSports: "true",
      noFilterBlockEvent: "true",
      ...options.params
    };
    this.timeout = options.timeout || 10000;
    this.userAgent = options.userAgent || "RUST SIT XPR/1.0";
    this.cache = new Map();
    this.cacheTTL = options.cacheTTL || 30000; // 30 secondes
  }

  buildUrl(params = {}) {
    const mergedParams = { ...this.defaultParams, ...params };
    const queryString = Object.entries(mergedParams)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&");
    return `${this.baseUrl}?${queryString}`;
  }

  getCacheKey(params = {}) {
    return this.buildUrl(params);
  }

  getCachedResponse(params = {}) {
    const key = this.getCacheKey(params);
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCachedResponse(params = {}, data) {
    const key = this.getCacheKey(params);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  async fetchLiveFeedEvents(params = {}, useCache = true) {
    // Check cache first
    if (useCache) {
      const cached = this.getCachedResponse(params);
      if (cached) {
        return cached;
      }
    }

    const url = this.buildUrl(params);
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === "https:";
    const client = isHttps ? https : http;

    return new Promise((resolve, reject) => {
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: "GET",
        headers: {
          "authority": urlObj.hostname,
          "accept": "application/json, text/plain, */*",
          "accept-language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
          "cache-control": "max-age=0",
          "sec-ch-ua": '"Chromium";v="139", "Not;A=Brand";v="99"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Linux"',
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "cross-site",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
          "user-agent": this.userAgent
        },
        timeout: this.timeout
      };

      const req = client.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            this.setCachedResponse(params, parsed);
            resolve(parsed);
          } catch (error) {
            reject(new Error(`Failed to parse JSON response: ${error.message}`));
          }
        });
      });

      req.on("error", (error) => {
        reject(new Error(`HTTP request failed: ${error.message}`));
      });

      req.on("timeout", () => {
        req.destroy();
        reject(new Error(`Request timeout after ${this.timeout}ms`));
      });

      req.end();
    });
  }

  async fetchLiveFeedEventsWithRetry(params = {}, maxRetries = 3) {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.fetchLiveFeedEvents(params);
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`[LiveFeed] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }

  clearCache() {
    this.cache.clear();
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Default instance with standard configuration
const defaultLiveFeedClient = new LiveFeedClient({
  timeout: 15000,
  cacheTTL: 60000 // 1 minute cache for default instance
});

/**
 * Fetch live feed events using default client
 */
async function fetchLiveFeedEvents(params = {}, useCache = true) {
  try {
    return await defaultLiveFeedClient.fetchLiveFeedEvents(params, useCache);
  } catch (error) {
    console.error(`[LiveFeed] Error fetching events: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch live feed events with retry logic
 */
async function fetchLiveFeedEventsWithRetry(params = {}, maxRetries = 3) {
  try {
    return await defaultLiveFeedClient.fetchLiveFeedEventsWithRetry(params, maxRetries);
  } catch (error) {
    console.error(`[LiveFeed] Error fetching events with retry: ${error.message}`);
    throw error;
  }
}

module.exports = {
  LiveFeedClient,
  fetchLiveFeedEvents,
  fetchLiveFeedEventsWithRetry,
  defaultLiveFeedClient
};