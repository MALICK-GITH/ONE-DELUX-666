(function (global) {
  "use strict";

  const STORAGE_KEY = "fury_x_one_assistant_history_v1";

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function buildWidget() {
    if (document.getElementById("aiAssistantFab")) return;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <button id="aiAssistantFab" type="button" aria-label="Ouvrir l'assistant IA" class="ai-assistant-fab">
        <span class="ai-fab-icon">🧠</span>
        <span class="ai-fab-pulse"></span>
      </button>
      <aside id="aiAssistantPanel" class="ai-assistant-panel hidden" aria-live="polite">
        <div class="ai-assistant-grabber"></div>
        <div class="ai-assistant-header">
          <div class="ai-assistant-brand">
            <div class="ai-assistant-avatar">🧠</div>
            <div>
              <strong>Assistant FURY X ONE</strong>
              <p>Site, créateur, matchs, coupons, prédictions.</p>
            </div>
          </div>
          <button id="aiAssistantClose" type="button" class="ai-assistant-close" aria-label="Fermer">✕</button>
        </div>
        <div class="ai-assistant-toolbar">
          <label for="aiAssistantModelSelect">Modèle</label>
          <select id="aiAssistantModelSelect">
            <option value="grok-4">grok-4</option>
          </select>
        </div>
        <div class="ai-assistant-actions" id="aiAssistantActions">
          <button type="button" class="ai-chip" data-quick-action="Analyser les matchs live">Analyser les matchs live</button>
          <button type="button" class="ai-chip" data-quick-action="Créer un coupon 3 matchs">Créer un coupon 3 matchs</button>
          <button type="button" class="ai-chip" data-quick-action="Me parler du créateur">Me parler du créateur</button>
          <button type="button" class="ai-chip" data-quick-action="Comparer deux matchs">Comparer deux matchs</button>
        </div>
        <div id="aiAssistantMessages" class="ai-assistant-messages">
          <div class="ai-message ai-message-bot">Salut, je suis l’assistant FURY X ONE. Demande un match, un coupon, une vérification ou des infos sur SOLITAIRE HACK.</div>
        </div>
        <form id="aiAssistantForm" class="ai-assistant-form">
          <div class="ai-input-shell">
            <textarea id="aiAssistantInput" rows="2" placeholder="Écris ton message…"></textarea>
            <button id="aiAssistantSend" type="submit">➤</button>
          </div>
        </form>
      </aside>
    `;
    document.body.appendChild(wrapper);
  }

  function initAssistantWidget() {
    buildWidget();

    const fab = document.getElementById("aiAssistantFab");
    const panel = document.getElementById("aiAssistantPanel");
    const close = document.getElementById("aiAssistantClose");
    const form = document.getElementById("aiAssistantForm");
    const input = document.getElementById("aiAssistantInput");
    const messages = document.getElementById("aiAssistantMessages");
    const send = document.getElementById("aiAssistantSend");
    const modelSelect = document.getElementById("aiAssistantModelSelect");
    const actions = document.getElementById("aiAssistantActions");

    if (!fab || !panel || !form || !messages || !modelSelect) return;

    let models = [];
    let history = restoreHistory(messages);

    fab.addEventListener("click", () => {
      panel.classList.toggle("hidden");
      input?.focus();
    });

    close?.addEventListener("click", () => {
      panel.classList.add("hidden");
    });

    actions?.querySelectorAll("[data-quick-action]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!input) return;
        input.value = button.dataset.quickAction || "";
        form.requestSubmit();
      });
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = String(input?.value || "").trim();
      if (!message) return;

      appendMessage(messages, "user", message);
      history.push({ role: "user", content: message });
      input.value = "";
      if (send) send.disabled = true;
      appendMessage(messages, "bot", "Analyse en cours...", true);

      try {
        const response = await global.SiteAPI.assistantChat({
          model: modelSelect.value || "grok-4",
          messages: history,
          userTime: {
            iso: new Date().toISOString(),
            locale: navigator.language || "",
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || ""
          }
        });

        removeLoading(messages);
        if (!response.success || !response.answer?.content) {
          throw new Error(response.error || "Assistant indisponible");
        }

        history.push({ role: "assistant", content: response.answer.content });
        appendMessage(messages, "bot", response.answer.content);
        persistHistory(history);
      } catch (error) {
        removeLoading(messages);
        appendMessage(messages, "bot", `Impossible de répondre: ${error.message}`);
      } finally {
        if (send) send.disabled = false;
      }
    });

    global.SiteAPI.predictionModels()
      .then((response) => {
        if (!response?.success || !Array.isArray(response.models)) return;
        models = response.models.slice();
        modelSelect.innerHTML = models
          .map((model) => `<option value="${escapeHtml(model.id)}">${escapeHtml(model.label || model.id)}</option>`)
          .join("");
      })
      .catch(() => {});
  }

  function appendMessage(container, role, content, loading = false) {
    const item = document.createElement("div");
    item.className = `ai-message ${role === "user" ? "ai-message-user" : "ai-message-bot"}`;
    if (loading) item.dataset.loading = "true";
    item.textContent = content;
    container.appendChild(item);
    container.scrollTop = container.scrollHeight;
  }

  function removeLoading(container) {
    container.querySelector('[data-loading="true"]')?.remove();
  }

  function persistHistory(history) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-12)));
    } catch {}
  }

  function restoreHistory(container) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      container.innerHTML = "";
      parsed.slice(-12).forEach((item) => {
        appendMessage(container, item.role === "assistant" ? "bot" : "user", item.content);
      });
      return parsed.slice(-12);
    } catch {
      return [];
    }
  }

  global.initAssistantWidget = initAssistantWidget;
})(window);
