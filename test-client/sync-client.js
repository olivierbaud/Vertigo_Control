const WebSocket = require('ws');

class TestSyncClient {
  constructor(url, connectionKey) {
    this.url = url;
    this.connectionKey = connectionKey;
    this.ws = null;
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 60000;
  }
  
  connect() {
    console.log('Connecting to cloud server...');
    console.log(`URL: ${this.url}`);
    
    const wsUrl = `${this.url}?key=${this.connectionKey}`;
    this.ws = new WebSocket(wsUrl);
    
    this.ws.on('open', () => {
      console.log('✓ Connected to cloud server');
      this.reconnectDelay = 1000; // Reset delay on successful connection
      this.startHeartbeat();
    });
    
    this.ws.on('message', (data) => {
      this.handleMessage(data);
    });
    
    this.ws.on('close', (code, reason) => {
      console.log(`Connection closed: ${code} - ${reason}`);
      this.reconnect();
    });
    
    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error.message);
    });
    
    this.ws.on('ping', () => {
      console.log('← Received ping from server');
    });
  }
  
  handleMessage(data) {
    try {
      const message = JSON.parse(data.toString());
      console.log(`\n← Received message: ${message.type}`);
      console.log('   Data:', JSON.stringify(message.data || {}, null, 2));
      
      switch (message.type) {
        case 'connected':
          console.log('✓ Controller authenticated successfully');
          break;
          
        case 'config_update':
          console.log('✓ Configuration update received');
          break;
          
        case 'execute_scene':
          console.log('✓ Scene execution command received');
          this.sendExecutionResult(message.data.scene_id, true);
          break;
          
        case 'heartbeat_ack':
          console.log('✓ Heartbeat acknowledged');
          break;
          
        default:
          console.log('Unknown message type');
      }
      
    } catch (error) {
      console.error('Message parsing error:', error);
    }
  }
  
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      console.log(`\n→ Sent message: ${message.type}`);
      return true;
    } else {
      console.log('Cannot send - not connected');
      return false;
    }
  }
  
  sendHeartbeat() {
    this.send({
      type: 'heartbeat',
      timestamp: new Date().toISOString()
    });
  }
  
  sendStatusUpdate(status) {
    this.send({
      type: 'status_update',
      timestamp: new Date().toISOString(),
      data: status
    });
  }
  
  sendExecutionResult(sceneId, success) {
    this.send({
      type: 'execution_result',
      timestamp: new Date().toISOString(),
      data: {
        scene_id: sceneId,
        success: success,
        duration_ms: 1500
      }
    });
  }
  
  startHeartbeat() {
    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000);
  }
  
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  reconnect() {
    this.stopHeartbeat();
    
    console.log(`Reconnecting in ${this.reconnectDelay / 1000} seconds...`);
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
    
    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
  }
  
  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node sync-client.js <WEBSOCKET_URL> <CONNECTION_KEY>');
    console.log('Example: node sync-client.js wss://backend-production-baec.up.railway.app 1421f413e4bb6acd...');
    process.exit(1);
  }
  
  const [url, key] = args;
  
  const client = new TestSyncClient(url, key);
  client.connect();
  
  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('\nDisconnecting...');
    client.disconnect();
    process.exit(0);
  });
}

module.exports = TestSyncClient;