/**
 * FURY X ONE - Advanced Notification Service
 * High-performance notification system with IndexedDB storage, WebSocket support, and mobile enhancements
 */

class NotificationService {
  constructor() {
    this.dbName = 'OneDeluxNotificationsDB';
    this.dbVersion = 1;
    this.db = null;
    this.notifications = [];
    this.unreadCount = 0;
    this.preferences = {
      matchUpdates: true,
      predictions: true,
      alerts: true,
      system: true,
      sound: true,
      vibration: true,
      desktop: true
    };
    this.listeners = [];
    this.ws = null;
    this.wsUrl = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  async init() {
    try {
      await this.initDB();
      await this.loadPreferences();
      await this.loadNotifications();
      this.connectWebSocket();
      this.setupVisibilityHandler();
      await this.setupWebPush();
      console.log('🔔 Notification Service initialized');
    } catch (error) {
      console.error('❌ Notification Service init error:', error);
    }
  }

  // IndexedDB Setup
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('notifications')) {
          const store = db.createObjectStore('notifications', { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('read', 'read', { unique: false });
        }

        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'key' });
        }
      };
    });
  }

  async loadNotifications() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['notifications'], 'readonly');
      const store = transaction.objectStore('notifications');
      const request = store.getAll();

      request.onsuccess = () => {
        this.notifications = request.result.sort((a, b) => b.timestamp - a.timestamp);
        this.unreadCount = this.notifications.filter(n => !n.read).length;
        this.updateBadge();
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  async saveNotification(notification) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['notifications'], 'readwrite');
      const store = transaction.objectStore('notifications');
      const request = store.add(notification);

      request.onsuccess = () => {
        this.notifications.unshift(notification);
        this.notifications.sort((a, b) => b.timestamp - a.timestamp);
        if (!notification.read) {
          this.unreadCount++;
          this.updateBadge();
        }
        this.notifyListeners(notification);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  async markAsRead(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['notifications'], 'readwrite');
      const store = transaction.objectStore('notifications');
      const request = store.get(id);

      request.onsuccess = () => {
        const notification = request.result;
        if (notification && !notification.read) {
          notification.read = true;
          notification.readAt = Date.now();
          const updateRequest = store.put(notification);
          
          updateRequest.onsuccess = () => {
            this.unreadCount = Math.max(0, this.unreadCount - 1);
            this.updateBadge();
            resolve();
          };
          
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async markAllAsRead() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['notifications'], 'readwrite');
      const store = transaction.objectStore('notifications');
      const request = store.getAll();

      request.onsuccess = () => {
        const notifications = request.result;
        const updatePromises = notifications
          .filter(n => !n.read)
          .map(n => {
            n.read = true;
            n.readAt = Date.now();
            return new Promise((res, rej) => {
              const updateReq = store.put(n);
              updateReq.onsuccess = res;
              updateReq.onerror = () => rej(updateReq.error);
            });
          });

        Promise.all(updatePromises)
          .then(() => {
            this.unreadCount = 0;
            this.updateBadge();
            resolve();
          })
          .catch(reject);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async deleteNotification(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['notifications'], 'readwrite');
      const store = transaction.objectStore('notifications');
      const request = store.delete(id);

      request.onsuccess = () => {
        this.notifications = this.notifications.filter(n => n.id !== id);
        const notification = this.notifications.find(n => n.id === id);
        if (notification && !notification.read) {
          this.unreadCount = Math.max(0, this.unreadCount - 1);
          this.updateBadge();
        }
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  async clearOldNotifications(daysToKeep = 7) {
    const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['notifications'], 'readwrite');
      const store = transaction.objectStore('notifications');
      const request = store.getAll();

      request.onsuccess = () => {
        const notifications = request.result;
        const toDelete = notifications.filter(n => n.timestamp < cutoff);
        
        const deletePromises = toDelete.map(n => {
          return new Promise((res, rej) => {
            const deleteReq = store.delete(n.id);
            deleteReq.onsuccess = res;
            deleteReq.onerror = () => rej(deleteReq.error);
          });
        });

        Promise.all(deletePromises)
          .then(() => {
            this.notifications = this.notifications.filter(n => n.timestamp >= cutoff);
            resolve(toDelete.length);
          })
          .catch(reject);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Preferences Management
  async loadPreferences() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['preferences'], 'readonly');
      const store = transaction.objectStore('preferences');
      const request = store.get('userPreferences');

      request.onsuccess = () => {
        if (request.result) {
          this.preferences = { ...this.preferences, ...request.result.value };
        }
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  async savePreferences() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['preferences'], 'readwrite');
      const store = transaction.objectStore('preferences');
      const request = store.put({ key: 'userPreferences', value: this.preferences });

      request.onsuccess = resolve;
      request.onerror = () => reject(request.error);
    });
  }

  updatePreference(key, value) {
    this.preferences[key] = value;
    this.savePreferences();
  }

  // WebSocket Connection
  connectWebSocket() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      this.wsUrl = `${protocol}//${host}/ws/notifications`;
      
      this.ws = new WebSocket(this.wsUrl);
      
      this.ws.onopen = () => {
        console.log('🔌 WebSocket connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connectWebSocket(), delay);
    }
  }

  handleWebSocketMessage(data) {
    if (data.type === 'notification') {
      this.addNotification(data.notification);
    } else if (data.type === 'match_update') {
      this.handleMatchUpdate(data.match);
    } else if (data.type === 'prediction_update') {
      this.handlePredictionUpdate(data.prediction);
    }
  }

  // Notification Creation
  addNotification(notification) {
    const fullNotification = {
      id: notification.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: notification.type || 'info',
      title: notification.title || 'Notification',
      message: notification.message || '',
      data: notification.data || {},
      timestamp: notification.timestamp || Date.now(),
      read: false,
      readAt: null,
      priority: notification.priority || 'normal',
      actions: notification.actions || []
    };

    this.saveNotification(fullNotification);
    this.triggerNotification(fullNotification);
  }

  triggerNotification(notification) {
    if (!this.shouldShowNotification(notification)) {
      return;
    }

    // Browser Notification
    if (this.preferences.desktop && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.priority === 'high',
        data: notification
      });
    }

    // Sound
    if (this.preferences.sound) {
      this.playNotificationSound();
    }

    // Vibration (mobile)
    if (this.preferences.vibration && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  }

  shouldShowNotification(notification) {
    switch (notification.type) {
      case 'match_update':
        return this.preferences.matchUpdates;
      case 'prediction':
        return this.preferences.predictions;
      case 'alert':
        return this.preferences.alerts;
      case 'system':
        return this.preferences.system;
      default:
        return true;
    }
  }

  playNotificationSound() {
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Audio play failed (browser policy)
      });
    } catch (error) {
      // Audio not available
    }
  }

  // Match Updates
  handleMatchUpdate(match) {
    if (this.preferences.matchUpdates) {
      this.addNotification({
        type: 'match_update',
        title: `🏆 ${match.team1} vs ${match.team2}`,
        message: `Score: ${match.score?.home || 0} - ${match.score?.away || 0} (${match.statusText || ''})`,
        data: { matchId: match.id, match },
        priority: match.isLive ? 'high' : 'normal'
      });
    }
  }

  // Prediction Updates
  handlePredictionUpdate(prediction) {
    if (this.preferences.predictions) {
      this.addNotification({
        type: 'prediction',
        title: `🎯 Prédiction: ${prediction.match}`,
        message: `Confiance: ${prediction.confidence}% | ${prediction.prediction}`,
        data: { predictionId: prediction.id, prediction },
        priority: prediction.confidence > 80 ? 'high' : 'normal'
      });
    }
  }

  // Badge Management
  updateBadge() {
    const badge = document.querySelector('.notification-badge');
    if (badge) {
      badge.textContent = this.unreadCount > 0 ? this.unreadCount : '';
      badge.style.display = this.unreadCount > 0 ? 'flex' : 'none';
    }

    // Update document title
    if (this.unreadCount > 0) {
      document.title = `(${this.unreadCount}) FURY X ONE 👿`;
    } else {
      document.title = 'FURY X ONE 👿';
    }
  }

  // Event Listeners
  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(cb => cb !== callback);
  }

  notifyListeners(notification) {
    this.listeners.forEach(callback => callback(notification));
  }

  // Visibility Handler
  setupVisibilityHandler() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.connectWebSocket();
      }
    });
  }

  // Web Push Setup
  async setupWebPush() {
    try {
      // Check if Service Worker is supported
      if (!('serviceWorker' in navigator)) {
        console.log('ℹ️  Service Worker not supported, Web Push unavailable');
        return;
      }

      // Register Service Worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker registered');

      // Get VAPID public key from server
      const vapidResponse = await fetch('/api/push/vapid-key');
      const vapidData = await vapidResponse.json();

      if (!vapidData.success || !vapidData.vapidKey) {
        console.log('ℹ️  Web Push not configured on server');
        return;
      }

      // Check existing subscription
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        console.log('✅ Web Push already subscribed');
        return;
      }

      // Request permission and subscribe
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        console.log('ℹ️  Notification permission denied');
        return;
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidData.vapidKey)
      });

      // Send subscription to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });

      console.log('✅ Web Push subscribed successfully');

    } catch (error) {
      console.error('❌ Web Push setup error:', error);
    }
  }

  // Convert base64 to Uint8Array for VAPID key
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }

  // Unsubscribe from Web Push
  async unsubscribeWebPush() {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;

      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return;

      await subscription.unsubscribe();
      
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });

      console.log('✅ Web Push unsubscribed');
    } catch (error) {
      console.error('❌ Web Push unsubscribe error:', error);
    }
  }

  // Getters
  getNotifications(filter = null) {
    if (!filter) {
      return this.notifications;
    }

    return this.notifications.filter(n => {
      if (filter.type && n.type !== filter.type) return false;
      if (filter.read !== undefined && n.read !== filter.read) return false;
      if (filter.priority && n.priority !== filter.priority) return false;
      return true;
    });
  }

  getUnreadCount() {
    return this.unreadCount;
  }

  getPreferences() {
    return { ...this.preferences };
  }

  // Cleanup
  destroy() {
    if (this.ws) {
      this.ws.close();
    }
    this.listeners = [];
  }
}

// Initialize global instance
window.NotificationService = new NotificationService();

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.NotificationService.init());
} else {
  window.NotificationService.init();
}

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}
