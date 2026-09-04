/**
 * FURY X ONE - Notification Panel UI
 * Modern notification panel with filters, actions, and animations
 */

class NotificationPanel {
  constructor() {
    this.panel = null;
    this.toggleButton = null;
    this.badge = null;
    this.isOpen = false;
    this.currentFilter = 'all';
    this.notifications = [];
  }

  init() {
    this.createPanel();
    this.createToggleButton();
    this.setupEventListeners();
    this.loadNotifications();
    this.startAutoRefresh();
  }

  createPanel() {
    // Create panel container
    this.panel = document.createElement('div');
    this.panel.className = 'notification-panel';
    this.panel.innerHTML = `
      <div class="notification-panel-header">
        <h2>🔔 Notifications</h2>
        <div class="notification-panel-actions">
          <button class="notification-action-btn" id="markAllReadBtn" title="Tout marquer comme lu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11l3 3L22 4"></path>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
          </button>
          <button class="notification-action-btn" id="clearOldBtn" title="Nettoyer anciennes notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
          <button class="notification-action-btn" id="settingsBtn" title="Paramètres">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
          <button class="notification-close-btn" id="closePanelBtn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      
      <div class="notification-filters">
        <button class="filter-btn active" data-filter="all">Toutes</button>
        <button class="filter-btn" data-filter="unread">Non lues</button>
        <button class="filter-btn" data-filter="match_update">Matchs</button>
        <button class="filter-btn" data-filter="prediction">Prédictions</button>
        <button class="filter-btn" data-filter="alert">Alertes</button>
      </div>
      
      <div class="notification-list" id="notificationList">
        <div class="notification-loading">Chargement...</div>
      </div>
      
      <div class="notification-panel-footer">
        <span class="notification-count" id="notificationCount">0 notifications</span>
        <button class="refresh-btn" id="refreshBtn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>
      </div>
    `;

    document.body.appendChild(this.panel);
  }

  createToggleButton() {
    // Create toggle button with badge
    this.toggleButton = document.createElement('button');
    this.toggleButton.className = 'notification-toggle-btn';
    this.toggleButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>
      <span class="notification-badge" id="notificationBadge"></span>
    `;

    this.badge = this.toggleButton.querySelector('.notification-badge');
    
    // Position button in navigation
    const nav = document.querySelector('nav') || document.body;
    nav.appendChild(this.toggleButton);
  }

  setupEventListeners() {
    // Toggle panel
    this.toggleButton.addEventListener('click', () => this.togglePanel());
    
    // Close panel
    document.getElementById('closePanelBtn').addEventListener('click', () => this.closePanel());
    
    // Mark all as read
    document.getElementById('markAllReadBtn').addEventListener('click', () => this.markAllAsRead());
    
    // Clear old notifications
    document.getElementById('clearOldBtn').addEventListener('click', () => this.clearOldNotifications());
    
    // Settings
    document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());
    
    // Refresh
    document.getElementById('refreshBtn').addEventListener('click', () => this.loadNotifications());
    
    // Filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setFilter(e.target.dataset.filter);
      });
    });
    
    // Close on outside click
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.panel.contains(e.target) && !this.toggleButton.contains(e.target)) {
        this.closePanel();
      }
    });
    
    // Listen to notification service
    if (window.NotificationService) {
      window.NotificationService.addListener((notification) => {
        this.addNotificationToUI(notification);
      });
    }
  }

  togglePanel() {
    if (this.isOpen) {
      this.closePanel();
    } else {
      this.openPanel();
    }
  }

  openPanel() {
    this.isOpen = true;
    this.panel.classList.add('open');
    this.toggleButton.classList.add('active');
    this.loadNotifications();
  }

  closePanel() {
    this.isOpen = false;
    this.panel.classList.remove('open');
    this.toggleButton.classList.remove('active');
  }

  setFilter(filter) {
    this.currentFilter = filter;
    
    // Update active state
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    this.renderNotifications();
  }

  async loadNotifications() {
    const list = document.getElementById('notificationList');
    list.innerHTML = '<div class="notification-loading">Chargement...</div>';
    
    try {
      if (window.NotificationService) {
        this.notifications = window.NotificationService.getNotifications();
      }
      this.renderNotifications();
    } catch (error) {
      console.error('Error loading notifications:', error);
      list.innerHTML = '<div class="notification-error">Erreur de chargement</div>';
    }
  }

  renderNotifications() {
    const list = document.getElementById('notificationList');
    const filtered = this.filterNotifications(this.notifications);
    
    if (filtered.length === 0) {
      list.innerHTML = '<div class="notification-empty">Aucune notification</div>';
      this.updateCount(0);
      return;
    }
    
    list.innerHTML = filtered.map(notification => this.createNotificationItem(notification)).join('');
    this.updateCount(filtered.length);
    
    // Add click handlers
    list.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        this.markAsRead(id);
      });
    });
    
    // Add delete handlers
    list.querySelectorAll('.notification-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        this.deleteNotification(id);
      });
    });
  }

  filterNotifications(notifications) {
    switch (this.currentFilter) {
      case 'unread':
        return notifications.filter(n => !n.read);
      case 'match_update':
        return notifications.filter(n => n.type === 'match_update');
      case 'prediction':
        return notifications.filter(n => n.type === 'prediction');
      case 'alert':
        return notifications.filter(n => n.type === 'alert');
      default:
        return notifications;
    }
  }

  createNotificationItem(notification) {
    const timeAgo = this.formatTimeAgo(notification.timestamp);
    const typeIcon = this.getTypeIcon(notification.type);
    const priorityClass = notification.priority === 'high' ? 'high-priority' : '';
    const readClass = notification.read ? 'read' : 'unread';
    
    return `
      <div class="notification-item ${readClass} ${priorityClass}" data-id="${notification.id}">
        <div class="notification-icon">${typeIcon}</div>
        <div class="notification-content">
          <div class="notification-title">${notification.title}</div>
          <div class="notification-message">${notification.message}</div>
          <div class="notification-meta">
            <span class="notification-time">${timeAgo}</span>
            ${notification.priority === 'high' ? '<span class="notification-priority">Urgent</span>' : ''}
          </div>
        </div>
        <button class="notification-delete-btn" data-id="${notification.id}" title="Supprimer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;
  }

  getTypeIcon(type) {
    switch (type) {
      case 'match_update':
        return '🏆';
      case 'prediction':
        return '🎯';
      case 'alert':
        return '⚠️';
      case 'system':
        return '⚙️';
      default:
        return '🔔';
    }
  }

  formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'À l\'instant';
    if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)} h`;
    if (seconds < 604800) return `Il y a ${Math.floor(seconds / 86400)} j`;
    
    return new Date(timestamp).toLocaleDateString('fr-FR');
  }

  addNotificationToUI(notification) {
    this.notifications.unshift(notification);
    if (this.isOpen) {
      this.renderNotifications();
    }
    this.updateBadge();
  }

  async markAsRead(id) {
    try {
      if (window.NotificationService) {
        await window.NotificationService.markAsRead(id);
      }
      this.notifications = this.notifications.map(n => 
        n.id === id ? { ...n, read: true, readAt: Date.now() } : n
      );
      this.renderNotifications();
      this.updateBadge();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }

  async markAllAsRead() {
    try {
      if (window.NotificationService) {
        await window.NotificationService.markAllAsRead();
      }
      this.notifications = this.notifications.map(n => ({ ...n, read: true, readAt: Date.now() }));
      this.renderNotifications();
      this.updateBadge();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }

  async deleteNotification(id) {
    try {
      if (window.NotificationService) {
        await window.NotificationService.deleteNotification(id);
      }
      this.notifications = this.notifications.filter(n => n.id !== id);
      this.renderNotifications();
      this.updateBadge();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }

  async clearOldNotifications() {
    try {
      if (window.NotificationService) {
        const deleted = await window.NotificationService.clearOldNotifications(7);
        await this.loadNotifications();
        alert(`${deleted} anciennes notifications supprimées`);
      }
    } catch (error) {
      console.error('Error clearing old notifications:', error);
    }
  }

  openSettings() {
    // Open settings modal or navigate to settings page
    alert('Paramètres de notification - À implémenter');
  }

  updateBadge() {
    const unreadCount = this.notifications.filter(n => !n.read).length;
    
    if (this.badge) {
      this.badge.textContent = unreadCount > 0 ? unreadCount : '';
      this.badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
    
    // Update document title
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) FURY X ONE 👿`;
    } else {
      document.title = 'FURY X ONE 👿';
    }
  }

  updateCount(count) {
    const countEl = document.getElementById('notificationCount');
    if (countEl) {
      countEl.textContent = `${count} notification${count !== 1 ? 's' : ''}`;
    }
  }

  startAutoRefresh() {
    // Refresh notifications every 30 seconds when panel is open
    setInterval(() => {
      if (this.isOpen) {
        this.loadNotifications();
      }
    }, 30000);
  }
}

// Initialize global instance
window.NotificationPanel = new NotificationPanel();

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.NotificationPanel.init());
} else {
  window.NotificationPanel.init();
}
