/**
 * Toast Notification System
 * SOLITAIRE HACK
 */

class ToastManager {
  constructor() {
    this.container = null;
    this.toasts = [];
    this.init();
  }

  init() {
    // Create container if not exists
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 12px;
        pointer-events: none;
      `;
      document.body.appendChild(this.container);
    }
  }

  show(message, options = {}) {
    const {
      type = 'info', // success, error, warning, info
      duration = 4000,
      persistent = false,
      action = null,
      actionText = 'OK'
    } = options;

    const toast = this.createToast(message, type, action, actionText);
    this.container.appendChild(toast);
    this.toasts.push(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    });

    // Auto dismiss
    if (!persistent) {
      setTimeout(() => {
        this.dismiss(toast);
      }, duration);
    }

    return toast;
  }

  createToast(message, type, action, actionText) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    const colors = {
      success: 'rgba(66, 245, 108, 0.15)',
      error: 'rgba(255, 82, 82, 0.15)',
      warning: 'rgba(255, 184, 82, 0.15)',
      info: 'rgba(82, 184, 255, 0.15)'
    };

    const borderColors = {
      success: 'rgba(66, 245, 108, 0.5)',
      error: 'rgba(255, 82, 82, 0.5)',
      warning: 'rgba(255, 184, 82, 0.5)',
      info: 'rgba(82, 184, 255, 0.5)'
    };

    toast.style.cssText = `
      pointer-events: auto;
      min-width: 300px;
      max-width: 400px;
      padding: 16px 20px;
      border-radius: 16px;
      background: ${colors[type]};
      border: 1px solid ${borderColors[type]};
      backdrop-filter: blur(12px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      color: var(--text);
      font-size: 0.95rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 12px;
      opacity: 0;
      transform: translateX(100px);
      transition: all 0.4s var(--spring);
    `;

    const icon = document.createElement('span');
    icon.textContent = icons[type];
    icon.style.cssText = `
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: ${borderColors[type]};
      font-size: 0.9rem;
      flex-shrink: 0;
    `;

    const text = document.createElement('span');
    text.textContent = message;
    text.style.cssText = `
      flex: 1;
      line-height: 1.4;
    `;

    toast.appendChild(icon);
    toast.appendChild(text);

    if (action) {
      const actionBtn = document.createElement('button');
      actionBtn.textContent = actionText;
      actionBtn.style.cssText = `
        padding: 8px 16px;
        border-radius: 10px;
        border: none;
        background: ${borderColors[type]};
        color: var(--text);
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        flex-shrink: 0;
      `;
      actionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        action();
        this.dismiss(toast);
      });
      toast.appendChild(actionBtn);
    }

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      color: var(--muted);
      font-size: 1.2rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      transition: all 0.2s ease;
      flex-shrink: 0;
    `;
    closeBtn.addEventListener('click', () => this.dismiss(toast));
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'transparent';
    });
    toast.appendChild(closeBtn);

    return toast;
  }

  dismiss(toast) {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100px)';
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      this.toasts = this.toasts.filter(t => t !== toast);
    }, 400);
  }

  success(message, options) {
    return this.show(message, { ...options, type: 'success' });
  }

  error(message, options) {
    return this.show(message, { ...options, type: 'error', duration: 6000 });
  }

  warning(message, options) {
    return this.show(message, { ...options, type: 'warning' });
  }

  info(message, options) {
    return this.show(message, { ...options, type: 'info' });
  }

  clear() {
    this.toasts.forEach(toast => this.dismiss(toast));
  }
}

// Global instance
const toast = new ToastManager();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ToastManager;
}
