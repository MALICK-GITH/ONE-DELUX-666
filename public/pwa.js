let deferredInstallPrompt = null;

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      monitorServiceWorkerUpdates(registration);
    } catch (error) {
      console.log("Erreur lors de l'enregistrement du Service Worker:", error);
    }
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (window.__furyReloadingAfterUpdate) return;
    window.__furyReloadingAfterUpdate = true;
    window.location.reload();
  });
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  showInstallBanner();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  removeInstallBanner();
});

function monitorServiceWorkerUpdates(registration) {
  registration.addEventListener("updatefound", () => {
    const newWorker = registration.installing;
    if (!newWorker) return;

    newWorker.addEventListener("statechange", () => {
      if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
        showUpdateBanner(registration);
      }
    });
  });
}

function showInstallBanner() {
  if (document.getElementById("pwa-install-banner")) return;

  const banner = buildBanner({
    id: "pwa-install-banner",
    text: "Installe FURY X ONE pour un accès rapide et une meilleure expérience mobile.",
    primaryLabel: "Installer",
    secondaryLabel: "Plus tard",
    onPrimary: promptInstall,
    onSecondary: removeInstallBanner
  });

  document.body.appendChild(banner);
}

async function promptInstall() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  removeInstallBanner();
}

function showUpdateBanner(registration) {
  if (document.getElementById("pwa-update-banner")) return;

  const banner = buildBanner({
    id: "pwa-update-banner",
    text: "Une nouvelle version est disponible.",
    primaryLabel: "Mettre à jour",
    secondaryLabel: "Ignorer",
    onPrimary: () => {
      registration.waiting?.postMessage({ type: "SKIP_WAITING" });
      removeUpdateBanner();
    },
    onSecondary: removeUpdateBanner
  });

  document.body.appendChild(banner);
}

function buildBanner({ id, text, primaryLabel, secondaryLabel, onPrimary, onSecondary }) {
  const banner = document.createElement("aside");
  banner.id = id;
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-live", "polite");
  banner.style.cssText = [
    "position:fixed",
    "left:16px",
    "right:16px",
    "bottom:16px",
    "z-index:9999",
    "background:rgba(10,22,40,0.96)",
    "border:1px solid rgba(0,255,136,0.25)",
    "border-radius:18px",
    "padding:16px",
    "box-shadow:0 16px 40px rgba(0,0,0,0.35)",
    "display:flex",
    "gap:12px",
    "align-items:center",
    "justify-content:space-between",
    "flex-wrap:wrap"
  ].join(";");

  const textElement = document.createElement("p");
  textElement.textContent = text;
  textElement.style.cssText = "margin:0;color:#f5f7ff;font:500 14px/1.5 'Sora',sans-serif;flex:1 1 220px;";

  const actions = document.createElement("div");
  actions.style.cssText = "display:flex;gap:10px;flex-wrap:wrap;";

  const primaryButton = document.createElement("button");
  primaryButton.type = "button";
  primaryButton.textContent = primaryLabel;
  primaryButton.style.cssText = "border:none;border-radius:999px;padding:10px 16px;background:#00ff88;color:#04111f;font-weight:700;cursor:pointer;";
  primaryButton.addEventListener("click", onPrimary);

  const secondaryButton = document.createElement("button");
  secondaryButton.type = "button";
  secondaryButton.textContent = secondaryLabel;
  secondaryButton.style.cssText = "border:1px solid rgba(255,255,255,0.22);border-radius:999px;padding:10px 16px;background:transparent;color:#f5f7ff;font-weight:600;cursor:pointer;";
  secondaryButton.addEventListener("click", onSecondary);

  actions.append(primaryButton, secondaryButton);
  banner.append(textElement, actions);
  return banner;
}

function removeInstallBanner() {
  document.getElementById("pwa-install-banner")?.remove();
}

function removeUpdateBanner() {
  document.getElementById("pwa-update-banner")?.remove();
}
