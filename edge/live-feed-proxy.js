const https = require("https");

const DEFAULT_SOURCE_URL =
  "https://888starz.bet/service-api/LiveFeed/Get1x2_VZip?sports=85&count=40&lng=fr&gr=789&mode=4&country=96&partner=233&getEmpty=true&virtualSports=true&noFilterBlockEvent=true";

function buildHeaders(hostname) {
  return {
    authority: hostname,
    accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "accept-language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
    "cache-control": "max-age=0",
    "sec-ch-ua": "\"Chromium\";v=\"139\", \"Not;A=Brand\";v=\"99\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Linux\"",
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "cross-site",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1",
    "user-agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
  };
}

function fetchSource(sourceUrl, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const requestUrl = new URL(sourceUrl);
    const request = https.get(
      {
        hostname: requestUrl.hostname,
        port: requestUrl.port || 443,
        path: `${requestUrl.pathname}${requestUrl.search}`,
        method: "GET",
        headers: buildHeaders(requestUrl.hostname),
      },
      (response) => {
        let data = "";
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${error.message}`));
          }
        });
      }
    );

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`Timeout after ${timeoutMs}ms`));
    });

    request.on("error", (error) => {
      reject(error);
    });
  });
}

module.exports = async (req, res) => {
  const sourceUrl = process.env.SOURCE_LIVE_FEED_URL || DEFAULT_SOURCE_URL;

  try {
    const json = await fetchSource(sourceUrl, 15000);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=30");
    res.statusCode = 200;
    res.end(JSON.stringify(json));
  } catch (error) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.statusCode = 502;
    res.end(
      JSON.stringify({
        Success: false,
        Error: error.message,
        Value: [],
      })
    );
  }
};
