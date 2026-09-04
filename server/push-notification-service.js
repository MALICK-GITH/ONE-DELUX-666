/**
 * FURY X ONE - Web Push Notification Service
 * Handles push subscriptions and sends notifications via Web Push API
 */

const webpush = require('web-push');
const config = require('./config');

// Configure VAPID keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@furyxone.com';

if (!vapidPublicKey || !vapidPrivateKey) {
  console.warn('⚠️  VAPID keys not configured. Web Push notifications will not work.');
  console.warn('   Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in your .env file');
} else {
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );
  console.log('✅ Web Push VAPID configured');
}

// In-memory storage for subscriptions (in production, use database)
const subscriptions = new Map();

class PushNotificationService {
  constructor() {
    this.isConfigured = !!(vapidPublicKey && vapidPrivateKey);
  }

  /**
   * Get VAPID public key for frontend subscription
   */
  getVapidPublicKey() {
    return vapidPublicKey;
  }

  /**
   * Check if Web Push is configured
   */
  isReady() {
    return this.isConfigured;
  }

  /**
   * Subscribe a client to push notifications
   */
  subscribe(subscription) {
    try {
      const subscriptionKey = this.getSubscriptionKey(subscription);
      subscriptions.set(subscriptionKey, subscription);
      console.log(`✅ Push subscription added: ${subscriptionKey}`);
      return { success: true, message: 'Subscription saved' };
    } catch (error) {
      console.error('❌ Error subscribing to push:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Unsubscribe a client from push notifications
   */
  unsubscribe(subscription) {
    try {
      const subscriptionKey = this.getSubscriptionKey(subscription);
      subscriptions.delete(subscriptionKey);
      console.log(`✅ Push subscription removed: ${subscriptionKey}`);
      return { success: true, message: 'Subscription removed' };
    } catch (error) {
      console.error('❌ Error unsubscribing from push:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all subscriptions
   */
  getAllSubscriptions() {
    return Array.from(subscriptions.values());
  }

  /**
   * Get subscription count
   */
  getSubscriptionCount() {
    return subscriptions.size;
  }

  /**
   * Send notification to a specific subscription
   */
  async sendToSubscription(subscription, notification) {
    if (!this.isConfigured) {
      console.warn('⚠️  Web Push not configured, skipping notification');
      return { success: false, error: 'Web Push not configured' };
    }

    try {
      const payload = JSON.stringify({
        title: notification.title || 'FURY X ONE',
        message: notification.message || 'Nouvelle notification',
        data: notification.data || {},
        priority: notification.priority || 'normal'
      });

      await webpush.sendNotification(subscription, payload);
      console.log(`✅ Push notification sent to ${this.getSubscriptionKey(subscription)}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Error sending push notification:`, error.message);
      
      // Remove invalid subscription
      if (error.statusCode === 410 || error.statusCode === 404) {
        const subscriptionKey = this.getSubscriptionKey(subscription);
        subscriptions.delete(subscriptionKey);
        console.log(`🗑️  Removed invalid subscription: ${subscriptionKey}`);
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Broadcast notification to all subscriptions
   */
  async broadcast(notification) {
    if (!this.isConfigured) {
      console.warn('⚠️  Web Push not configured, skipping broadcast');
      return { success: false, error: 'Web Push not configured', sent: 0, failed: 0 };
    }

    const allSubscriptions = this.getAllSubscriptions();
    if (allSubscriptions.length === 0) {
      console.log('ℹ️  No push subscriptions to send to');
      return { success: true, sent: 0, failed: 0 };
    }

    console.log(`📡 Broadcasting push notification to ${allSubscriptions.length} subscriptions`);

    const results = await Promise.allSettled(
      allSubscriptions.map(sub => this.sendToSubscription(sub, notification))
    );

    const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;

    console.log(`📊 Push broadcast results: ${sent} sent, ${failed} failed`);
    return { success: true, sent, failed };
  }

  /**
   * Generate unique key for subscription
   */
  getSubscriptionKey(subscription) {
    return `${subscription.endpoint}-${subscription.keys.auth}`;
  }

  /**
   * Validate subscription object
   */
  isValidSubscription(subscription) {
    return (
      subscription &&
      subscription.endpoint &&
      subscription.keys &&
      subscription.keys.p256dh &&
      subscription.keys.auth
    );
  }
}

module.exports = new PushNotificationService();
