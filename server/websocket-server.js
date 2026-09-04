/**
 * FURY X ONE - WebSocket Notification Server
 * Real-time notification delivery system
 */

const WebSocket = require('ws');

class WebSocketNotificationServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server, path: '/ws/notifications' });
    this.clients = new Map();
    this.setupServer();
  }

  setupServer() {
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      const clientIp = req.socket.remoteAddress;
      
      console.log(`🔌 WebSocket client connected: ${clientId} from ${clientIp}`);
      
      this.clients.set(clientId, {
        ws,
        id: clientId,
        ip: clientIp,
        connectedAt: Date.now(),
        subscriptions: {
          matchUpdates: true,
          predictions: true,
          alerts: true,
          system: true
        }
      });

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'connected',
        clientId,
        timestamp: Date.now()
      });

      // Handle client messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleClientMessage(clientId, data);
        } catch (error) {
          console.error(`WebSocket message parse error for ${clientId}:`, error);
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        console.log(`🔌 WebSocket client disconnected: ${clientId}`);
        this.clients.delete(clientId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for ${clientId}:`, error);
        this.clients.delete(clientId);
      });

      // Send periodic heartbeat
      const heartbeatInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          this.sendToClient(clientId, { type: 'heartbeat', timestamp: Date.now() });
        } else {
          clearInterval(heartbeatInterval);
        }
      }, 30000);
    });

    console.log('🔔 WebSocket Notification Server initialized');
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  handleClientMessage(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (data.type) {
      case 'subscribe':
        this.handleSubscription(clientId, data);
        break;
      case 'unsubscribe':
        this.handleUnsubscription(clientId, data);
        break;
      case 'ping':
        this.sendToClient(clientId, { type: 'pong', timestamp: Date.now() });
        break;
      case 'mark_read':
        this.handleMarkRead(clientId, data);
        break;
      default:
        console.log(`Unknown message type from ${clientId}:`, data.type);
    }
  }

  handleSubscription(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (data.channels && Array.isArray(data.channels)) {
      data.channels.forEach(channel => {
        if (client.subscriptions.hasOwnProperty(channel)) {
          client.subscriptions[channel] = true;
        }
      });
    }

    this.sendToClient(clientId, {
      type: 'subscription_updated',
      subscriptions: client.subscriptions
    });
  }

  handleUnsubscription(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (data.channels && Array.isArray(data.channels)) {
      data.channels.forEach(channel => {
        if (client.subscriptions.hasOwnProperty(channel)) {
          client.subscriptions[channel] = false;
        }
      });
    }

    this.sendToClient(clientId, {
      type: 'subscription_updated',
      subscriptions: client.subscriptions
    });
  }

  handleMarkRead(clientId, data) {
    // Client-side read status is handled by the frontend service
    // This is just for server-side tracking if needed
    this.sendToClient(clientId, {
      type: 'read_acknowledged',
      notificationId: data.notificationId
    });
  }

  sendToClient(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      client.ws.send(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Error sending to client ${clientId}:`, error);
      this.clients.delete(clientId);
      return false;
    }
  }

  // Broadcast to all clients
  broadcast(data, filter = null) {
    let sentCount = 0;
    this.clients.forEach((client, clientId) => {
      if (filter && !this.shouldSendToClient(client, filter)) {
        return;
      }
      if (this.sendToClient(clientId, data)) {
        sentCount++;
      }
    });
    return sentCount;
  }

  shouldSendToClient(client, filter) {
    if (filter.channel && !client.subscriptions[filter.channel]) {
      return false;
    }
    if (filter.excludeIds && filter.excludeIds.includes(client.id)) {
      return false;
    }
    return true;
  }

  // Send notification to specific client
  sendNotification(clientId, notification) {
    return this.sendToClient(clientId, {
      type: 'notification',
      notification,
      timestamp: Date.now()
    });
  }

  // Broadcast notification to all clients
  broadcastNotification(notification, filter = null) {
    return this.broadcast({
      type: 'notification',
      notification,
      timestamp: Date.now()
    }, filter);
  }

  // Match update notification
  broadcastMatchUpdate(match, filter = null) {
    return this.broadcast({
      type: 'match_update',
      match,
      timestamp: Date.now()
    }, { channel: 'matchUpdates', ...filter });
  }

  // Prediction update notification
  broadcastPredictionUpdate(prediction, filter = null) {
    return this.broadcast({
      type: 'prediction_update',
      prediction,
      timestamp: Date.now()
    }, { channel: 'predictions', ...filter });
  }

  // System alert
  broadcastAlert(alert, filter = null) {
    return this.broadcast({
      type: 'alert',
      alert,
      timestamp: Date.now()
    }, { channel: 'alerts', ...filter });
  }

  // Get connected clients count
  getConnectedClientsCount() {
    return this.clients.size;
  }

  // Get client info
  getClientInfo(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return null;

    return {
      id: client.id,
      ip: client.ip,
      connectedAt: client.connectedAt,
      subscriptions: client.subscriptions
    };
  }

  // Get all clients info
  getAllClientsInfo() {
    const clients = [];
    this.clients.forEach((client) => {
      clients.push({
        id: client.id,
        ip: client.ip,
        connectedAt: client.connectedAt,
        subscriptions: client.subscriptions
      });
    });
    return clients;
  }

  // Disconnect specific client
  disconnectClient(clientId) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.close();
      return true;
    }
    return false;
  }

  // Shutdown
  shutdown() {
    console.log('🔌 Shutting down WebSocket server...');
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.close();
      }
    });
    this.wss.close();
  }
}

module.exports = WebSocketNotificationServer;
