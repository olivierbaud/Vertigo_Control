const WebSocket = require('ws');
const pool = require('../db/connection');

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.controllers = new Map(); // controllerId -> ws connection
    
    this.setupServer();
  }
  
  setupServer() {
    this.wss.on('connection', (ws, req) => {
      console.log('New WebSocket connection attempt');
      this.handleConnection(ws, req);
    });
    
    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });
    
    console.log('✓ WebSocket server initialized');
  }
  
  async handleConnection(ws, req) {
    try {
      // Extract connection key from query string
      const url = new URL(req.url, 'http://localhost');
      const connectionKey = url.searchParams.get('key');
      
      if (!connectionKey) {
        console.log('Connection rejected: No key provided');
        ws.close(1008, 'Connection key required');
        return;
      }
      
      // Validate connection key
      const result = await pool.query(
        'SELECT id, name, project_id FROM controllers WHERE connection_key = $1',
        [connectionKey]
      );
      
      if (result.rows.length === 0) {
        console.log('Connection rejected: Invalid key');
        ws.close(1008, 'Invalid connection key');
        return;
      }
      
      const controller = result.rows[0];
      
      // Update controller status
      await pool.query(
        'UPDATE controllers SET status = $1, last_seen = NOW() WHERE id = $2',
        ['online', controller.id]
      );
      
      // Store connection
      this.controllers.set(controller.id, ws);
      ws.controllerId = controller.id;
      ws.controllerName = controller.name;
      ws.isAlive = true;
      
      console.log(`✓ Controller connected: ${controller.name} (${controller.id})`);
      
      // Send welcome message
      this.sendToController(controller.id, {
        type: 'connected',
        timestamp: new Date().toISOString(),
        data: {
          controller_id: controller.id,
          name: controller.name
        }
      });
      
      // Setup message handlers
      ws.on('message', (data) => {
        this.handleMessage(ws, data);
      });
      
      // Setup pong handler (for keepalive)
      ws.on('pong', () => {
        ws.isAlive = true;
      });
      
      // Handle disconnection
      ws.on('close', async () => {
        console.log(`Controller disconnected: ${controller.name} (${controller.id})`);
        
        // Update controller status
        await pool.query(
          'UPDATE controllers SET status = $1 WHERE id = $2',
          ['offline', controller.id]
        );
        
        this.controllers.delete(controller.id);
      });
      
      ws.on('error', (error) => {
        console.error(`WebSocket error for ${controller.name}:`, error);
      });
      
    } catch (error) {
      console.error('Connection handling error:', error);
      ws.close(1011, 'Internal server error');
    }
  }
  
  handleMessage(ws, data) {
    try {
      const message = JSON.parse(data.toString());
      console.log(`Message from ${ws.controllerName}:`, message.type);
      
      switch (message.type) {
        case 'heartbeat':
          this.handleHeartbeat(ws);
          break;

        case 'request_full_sync':
          this.handleRequestFullSync(ws);
          break;

        case 'status_update':
          this.handleStatusUpdate(ws, message.data);
          break;

        case 'execution_result':
          this.handleExecutionResult(ws, message.data);
          break;

        case 'sync_progress':
          this.handleSyncProgress(ws, message.data);
          break;

        case 'sync_complete':
          this.handleSyncComplete(ws, message.data);
          break;

        case 'sync_error':
          this.handleSyncError(ws, message.data);
          break;

        case 'driver_sync_complete':
          this.handleDriverSyncComplete(ws, message.data);
          break;

        case 'driver_sync_error':
          this.handleDriverSyncError(ws, message.data);
          break;

        default:
          console.log('Unknown message type:', message.type);
      }
      
    } catch (error) {
      console.error('Message handling error:', error);
    }
  }
  
  handleHeartbeat(ws) {
    // Update last_seen timestamp
    pool.query(
      'UPDATE controllers SET last_seen = NOW() WHERE id = $1',
      [ws.controllerId]
    ).catch(err => console.error('Heartbeat update error:', err));

    // Send acknowledgment
    this.sendToController(ws.controllerId, {
      type: 'heartbeat_ack',
      timestamp: new Date().toISOString()
    });
  }

  async handleRequestFullSync(ws) {
    console.log(`Full sync requested by controller ${ws.controllerName} (${ws.controllerId})`);

    try {
      // Query all devices for this controller
      const devicesResult = await pool.query(
        'SELECT device_id, name, type, connection_config, status FROM devices WHERE controller_id = $1',
        [ws.controllerId]
      );

      // Query all scenes for this controller
      const scenesResult = await pool.query(
        'SELECT scene_id, name, description, steps, continue_on_error FROM scenes WHERE controller_id = $1',
        [ws.controllerId]
      );

      // Transform devices to match NUC expected format
      const devices = devicesResult.rows.map(d => ({
        device_id: d.device_id,
        name: d.name,
        type: d.type,
        connection_config: d.connection_config,
        status: d.status || 'unknown'
      }));

      // Transform scenes to match NUC expected format
      const scenes = scenesResult.rows.map(s => ({
        scene_id: s.scene_id,
        name: s.name,
        description: s.description,
        steps: s.steps, // Should already be JSON
        continue_on_error: s.continue_on_error
      }));

      // Send full sync response
      this.sendToController(ws.controllerId, {
        type: 'full_sync',
        timestamp: new Date().toISOString(),
        data: {
          devices: devices,
          scenes: scenes
        }
      });

      console.log(`✓ Full sync sent to ${ws.controllerName}: ${devices.length} devices, ${scenes.length} scenes`);

    } catch (error) {
      console.error(`Full sync error for ${ws.controllerName}:`, error);
      // Don't crash - send error response
      this.sendToController(ws.controllerId, {
        type: 'error',
        timestamp: new Date().toISOString(),
        message: 'Full sync failed: ' + error.message
      });
    }
  }

  handleStatusUpdate(ws, data) {
    console.log(`Status update from ${ws.controllerName}:`, data);
    // Store status in database if needed
  }
  
  handleExecutionResult(ws, data) {
    console.log(`Execution result from ${ws.controllerName}:`, data);
    // Store execution logs if needed
  }

  handleSyncProgress(ws, data) {
    console.log(`Sync progress from ${ws.controllerName}:`, data);
    // Update sync_history table
    pool.query(
      `UPDATE sync_history
       SET status = 'in_progress'
       WHERE id = $1`,
      [data.sync_id]
    ).catch(err => console.error('Sync progress update error:', err));
  }

  handleSyncComplete(ws, data) {
    console.log(`Sync complete from ${ws.controllerName}:`, data);
    // Update sync_history and create live version snapshot
    pool.query(
      `UPDATE sync_history
       SET status = 'completed',
           completed_at = NOW(),
           duration_ms = $2,
           files_synced = $3
       WHERE id = $1`,
      [data.sync_id, data.duration_ms, data.files_synced]
    ).catch(err => console.error('Sync complete update error:', err));

    // Mark version as live
    if (data.version) {
      pool.query(
        `INSERT INTO gui_file_versions
         (controller_id, version_number, state, files, created_by)
         SELECT controller_id, version_number, 'live', files, created_by
         FROM gui_file_versions
         WHERE controller_id = $1 AND version_number = $2 AND state = 'deployed'
         ON CONFLICT (controller_id, version_number) DO NOTHING`,
        [ws.controllerId, data.version]
      ).catch(err => console.error('Live version update error:', err));
    }
  }

  handleSyncError(ws, data) {
    console.error(`Sync error from ${ws.controllerName}:`, data);
    // Update sync_history with error
    pool.query(
      `UPDATE sync_history
       SET status = 'failed',
           completed_at = NOW(),
           error_message = $2
       WHERE id = $1`,
      [data.sync_id, data.error_message]
    ).catch(err => console.error('Sync error update error:', err));
  }

  handleDriverSyncComplete(ws, data) {
    console.log(`Driver sync complete from ${ws.controllerName}:`, data);
    // Update driver deployment status to 'active'
    pool.query(
      `UPDATE driver_deployments
       SET deployment_status = 'active',
           activated_at = NOW(),
           last_synced_at = NOW()
       WHERE sync_id = $1 AND controller_id = $2`,
      [data.sync_id, ws.controllerId]
    ).catch(err => console.error('Driver sync complete update error:', err));
  }

   handleDriverSyncError(ws, data) {
    console.error(`Driver sync error from ${ws.controllerName}:`, data);
    // Update driver deployment status to 'failed'
    pool.query(
      `UPDATE driver_deployments
       SET deployment_status = 'failed',
           sync_error_message = $2,
           last_synced_at = NOW()
       WHERE sync_id = $1 AND controller_id = $3`,
      [data.sync_id, data.error_message, ws.controllerId]
    ).catch(err => console.error('Driver sync error update error:', err));
  }
  
  // Send message to specific controller
  sendToController(controllerId, message) {
    const ws = this.controllers.get(controllerId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }
  
  // Broadcast configuration updates
  broadcastConfigUpdate(controllerId, configType, data) {
    const message = {
      type: 'config_update',
      timestamp: new Date().toISOString(),
      data: {
        config_type: configType,
        ...data
      }
    };
    
    return this.sendToController(controllerId, message);
  }
  
  // Send scene execution command
  executeScene(controllerId, sceneId) {
    const message = {
      type: 'execute_scene',
      timestamp: new Date().toISOString(),
      data: {
        scene_id: sceneId
      }
    };

    return this.sendToController(controllerId, message);
  }

  // Send GUI sync command (deployed → NUC)
  async syncGUI(controllerId, syncId, version, files) {
    const message = {
      type: 'gui_sync',
      timestamp: new Date().toISOString(),
      data: {
        sync_id: syncId,
        version: version,
        files: files
      }
    };

    const sent = this.sendToController(controllerId, message);

    if (sent) {
      // Create sync history record
      await pool.query(
        `INSERT INTO sync_history (id, controller_id, version_number, status, triggered_by)
         VALUES ($1, $2, $3, 'pending', $4)`,
        [syncId, controllerId, version, 'api']
      ).catch(err => console.error('Sync history creation error:', err));
    }

    return sent;
  }
  
  // Get controller connection status
  isControllerOnline(controllerId) {
    const ws = this.controllers.get(controllerId);
    return ws && ws.readyState === WebSocket.OPEN;
  }
  
  // Get all connected controllers
  getConnectedControllers() {
    return Array.from(this.controllers.keys());
  }
  
  // Start heartbeat interval
  startHeartbeat() {
    setInterval(() => {
      this.controllers.forEach((ws, controllerId) => {
        if (!ws.isAlive) {
          console.log(`Controller ${controllerId} failed heartbeat, terminating`);
          ws.terminate();
          return;
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // Every 30 seconds
  }
}

module.exports = WebSocketServer;
