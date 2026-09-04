/**
 * Error Handler with Visual Feedback
 * SOLITAIRE HACK
 */

class ErrorHandler {
  constructor() {
    this.errorStates = new Map();
    this.init();
  }

  init() {
    // Global error listener
    window.addEventListener('error', (event) => {
      this.handleGlobalError(event.error, event.message, event.filename, event.lineno);
    });

    // Unhandled promise rejection
    window.addEventListener('unhandledrejection', (event) => {
      this.handlePromiseRejection(event.reason);
    });

    // Network error detection
    window.addEventListener('offline', () => {
      this.showNetworkError();
    });

    window.addEventListener('online', () => {
      this.hideNetworkError();
    });
  }

  handleGlobalError(error, message, filename, lineno) {
    console.error('Global error:', { error, message, filename, lineno });
    
    toast.error('Une erreur est survenue', {
      duration: 5000,
      action: () => console.error('Error details:', { error, message, filename, lineno }),
      actionText: 'Détails'
    });
  }

  handlePromiseRejection(reason) {
    console.error('Unhandled promise rejection:', reason);
    
    toast.error('Erreur de traitement', {
      duration: 5000,
      action: () => console.error('Rejection reason:', reason),
      actionText: 'Détails'
    });
  }

  showNetworkError() {
    const banner = this.createNetworkBanner();
    document.body.appendChild(banner);
    this.errorStates.set('network', banner);
  }

  hideNetworkError() {
    const banner = this.errorStates.get('network');
    if (banner) {
      banner.style.opacity = '0';
      banner.style.transform = 'translateY(-100%)';
      setTimeout(() => {
        if (banner.parentNode) {
          banner.parentNode.removeChild(banner);
        }
        this.errorStates.delete('network');
      }, 300);
      toast.success('Connexion rétablie');
    }
  }

  createNetworkBanner() {
    const banner = document.createElement('div');
    banner.className = 'network-error-banner';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 10001;
      padding: 12px 20px;
      background: linear-gradient(135deg, rgba(255, 82, 82, 0.95), rgba(255, 120, 82, 0.95));
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      opacity: 0;
      transform: translateY(-100%);
      transition: all 0.3s var(--spring);
      box-shadow: 0 4px 20px rgba(255, 82, 82, 0.3);
    `;

    banner.innerHTML = `
      <span style="font-size: 1.2rem;">📡</span>
      <span>Connexion perdue - Vérifiez votre internet</span>
    `;

    requestAnimationFrame(() => {
      banner.style.opacity = '1';
      banner.style.transform = 'translateY(0)';
    });

    return banner;
  }

  // API Error Handler
  handleApiError(error, context = '') {
    console.error('API Error:', error, context);

    let message = 'Erreur de communication avec le serveur';
    
    if (error.message) {
      if (error.message.includes('ECONNREFUSED')) {
        message = 'Serveur inaccessible';
      } else if (error.message.includes('ETIMEDOUT')) {
        message = 'Délai d\'attente dépassé';
      } else if (error.message.includes('ENOTFOUND')) {
        message = 'Serveur introuvable';
      }
    }

    toast.error(message, {
      duration: 6000,
      action: () => this.retryLastRequest(),
      actionText: 'Réessayer'
    });
  }

  // Form Error Handler
  handleFormError(form, errors) {
    // Clear previous errors
    this.clearFormErrors(form);

    Object.entries(errors).forEach(([field, message]) => {
      const input = form.querySelector(`[name="${field}"]`);
      if (input) {
        this.showFieldError(input, message);
      }
    });

    toast.error('Veuillez corriger les erreurs du formulaire', {
      duration: 4000
    });
  }

  showFieldError(input, message) {
    const wrapper = input.parentElement;
    
    // Add error class
    input.style.borderColor = 'rgba(255, 82, 82, 0.5)';
    input.style.boxShadow = '0 0 0 3px rgba(255, 82, 82, 0.1)';

    // Create error message
    const errorEl = document.createElement('div');
    errorEl.className = 'field-error';
    errorEl.textContent = message;
    errorEl.style.cssText = `
      margin-top: 6px;
      font-size: 0.85rem;
      color: rgba(255, 82, 82, 0.9);
      font-weight: 500;
      animation: slideDown 0.3s ease;
    `;

    wrapper.appendChild(errorEl);

    // Shake animation
    wrapper.style.animation = 'shake 0.5s ease';
    setTimeout(() => {
      wrapper.style.animation = '';
    }, 500);
  }

  clearFormErrors(form) {
    form.querySelectorAll('.field-error').forEach(el => el.remove());
    form.querySelectorAll('input, textarea, select').forEach(input => {
      input.style.borderColor = '';
      input.style.boxShadow = '';
    });
  }

  // Validation Error Handler
  handleValidationError(field, message) {
    const input = typeof field === 'string' 
      ? document.querySelector(`[name="${field}"]`) 
      : field;
    
    if (input) {
      this.showFieldError(input, message);
    }
  }

  // Retry mechanism
  retryLastRequest() {
    // Implement retry logic based on context
    console.log('Retrying last request...');
    toast.info('Nouvelle tentative...');
  }

  // Error Boundary for React-like components
  createErrorBoundary(componentName) {
    return {
      componentDidCatch(error, errorInfo) {
        console.error(`Error in ${componentName}:`, error, errorInfo);
        toast.error(`Erreur dans ${componentName}`, {
          duration: 5000
        });
      }
    };
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
  
  .field-error {
    animation: slideDown 0.3s ease;
  }
`;
document.head.appendChild(style);

// Global instance
const errorHandler = new ErrorHandler();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorHandler;
}
