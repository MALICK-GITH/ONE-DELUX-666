/**
 * Loading Indicator System
 * SOLITAIRE HACK
 */

class LoadingManager {
  constructor() {
    this.container = null;
    this.activeLoaders = new Map();
    this.init();
  }

  init() {
    // Create container if not exists
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'loading-overlay-container';
      this.container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
        pointer-events: none;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      document.body.appendChild(this.container);
    }
  }

  show(options = {}) {
    const {
      id = Date.now().toString(),
      message = 'Chargement...',
      type = 'spinner', // spinner, dots, bar, pulse
      overlay = false,
      size = 'medium' // small, medium, large
    } = options;

    if (this.activeLoaders.has(id)) {
      return this.activeLoaders.get(id);
    }

    const loader = this.createLoader(message, type, size, overlay);
    this.container.appendChild(loader);
    this.activeLoaders.set(id, loader);

    if (overlay) {
      this.container.style.pointerEvents = 'auto';
      this.container.style.background = 'rgba(0, 0, 0, 0.5)';
      this.container.style.backdropFilter = 'blur(4px)';
    }

    return loader;
  }

  createLoader(message, type, size, overlay) {
    const wrapper = document.createElement('div');
    wrapper.className = 'loading-wrapper';
    
    const sizes = {
      small: { width: '24px', height: '24px', fontSize: '0.85rem' },
      medium: { width: '48px', height: '48px', fontSize: '0.95rem' },
      large: { width: '64px', height: '64px', fontSize: '1.1rem' }
    };

    const sizeConfig = sizes[size] || sizes.medium;

    wrapper.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 24px 32px;
      border-radius: 20px;
      background: rgba(16, 25, 43, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(16px);
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
      opacity: 0;
      transform: scale(0.9);
      transition: all 0.3s var(--spring);
    `;

    requestAnimationFrame(() => {
      wrapper.style.opacity = '1';
      wrapper.style.transform = 'scale(1)';
    });

    // Create spinner based on type
    const spinner = this.createSpinner(type, sizeConfig);
    wrapper.appendChild(spinner);

    if (message) {
      const text = document.createElement('div');
      text.textContent = message;
      text.style.cssText = `
        font-size: ${sizeConfig.fontSize};
        font-weight: 500;
        color: var(--text);
        text-align: center;
      `;
      wrapper.appendChild(text);
    }

    return wrapper;
  }

  createSpinner(type, sizeConfig) {
    const spinner = document.createElement('div');
    spinner.className = `spinner spinner-${type}`;

    switch (type) {
      case 'spinner':
        spinner.innerHTML = `
          <svg viewBox="0 0 50 50" style="width: ${sizeConfig.width}; height: ${sizeConfig.height}; animation: rotate 2s linear infinite;">
            <circle cx="25" cy="25" r="20" fill="none" stroke="var(--brand)" stroke-width="4" stroke-linecap="round" stroke-dasharray="80" stroke-dashoffset="20">
              <animate attributeName="stroke-dashoffset" from="80" to="0" dur="1.5s" repeatCount="indefinite" />
            </circle>
          </svg>
        `;
        break;

      case 'dots':
        spinner.innerHTML = `
          <div style="display: flex; gap: 8px; align-items: center;">
            ${[0, 1, 2].map(i => `
              <div style="
                width: ${parseInt(sizeConfig.width) / 3}px;
                height: ${parseInt(sizeConfig.height) / 3}px;
                border-radius: 50%;
                background: var(--brand);
                animation: bounce 0.6s ease-in-out ${i * 0.1}s infinite;
              "></div>
            `).join('')}
          </div>
        `;
        break;

      case 'bar':
        spinner.innerHTML = `
          <div style="
            width: ${parseInt(sizeConfig.width) * 2}px;
            height: 4px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 2px;
            overflow: hidden;
          ">
            <div style="
              height: 100%;
              background: linear-gradient(90deg, var(--brand), var(--brand-2));
              border-radius: 2px;
              animation: progress 1.5s ease-in-out infinite;
            "></div>
          </div>
        `;
        break;

      case 'pulse':
        spinner.innerHTML = `
          <div style="
            width: ${sizeConfig.width};
            height: ${sizeConfig.height};
            border-radius: 50%;
            background: var(--brand);
            animation: pulse 1.5s ease-in-out infinite;
          "></div>
        `;
        break;
    }

    return spinner;
  }

  hide(id) {
    const loader = this.activeLoaders.get(id);
    if (loader) {
      loader.style.opacity = '0';
      loader.style.transform = 'scale(0.9)';
      
      setTimeout(() => {
        if (loader.parentNode) {
          loader.parentNode.removeChild(loader);
        }
        this.activeLoaders.delete(id);
        
        if (this.activeLoaders.size === 0) {
          this.container.style.pointerEvents = 'none';
          this.container.style.background = 'transparent';
          this.container.style.backdropFilter = 'none';
        }
      }, 300);
    }
  }

  hideAll() {
    this.activeLoaders.forEach((loader, id) => {
      this.hide(id);
    });
  }

  // Button loading state
  setButtonLoading(button, loading = true, originalText = '') {
    if (loading) {
      button.dataset.originalText = button.textContent;
      button.disabled = true;
      button.style.cssText = `
        ${button.style.cssText}
        opacity: 0.7;
        cursor: not-allowed;
        pointer-events: none;
      `;
      
      const spinner = document.createElement('span');
      spinner.className = 'btn-spinner';
      spinner.innerHTML = `
        <svg viewBox="0 0 20 20" style="width: 16px; height: 16px; animation: rotate 1s linear infinite; display: inline-block; vertical-align: middle; margin-right: 8px;">
          <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="32" stroke-dashoffset="8">
            <animate attributeName="stroke-dashoffset" from="32" to="0" dur="1s" repeatCount="indefinite" />
          </circle>
        </svg>
      `;
      button.prepend(spinner);
    } else {
      button.disabled = false;
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
      button.style.pointerEvents = 'auto';
      
      const spinner = button.querySelector('.btn-spinner');
      if (spinner) {
        spinner.remove();
      }
      
      if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
      }
    }
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }
  
  @keyframes progress {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  
  @keyframes pulse {
    0%, 100% { transform: scale(0.8); opacity: 0.5; }
    50% { transform: scale(1); opacity: 1; }
  }
`;
document.head.appendChild(style);

// Global instance
const loading = new LoadingManager();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LoadingManager;
}
