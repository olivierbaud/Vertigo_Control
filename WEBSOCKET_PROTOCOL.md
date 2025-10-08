# WebSocket Protocol Documentation

Real-time communication protocol between cloud and NUC controllers.

---

## Connection

**URL:** `wss://backend-production-baec.up.railway.app`
**Query Parameter:** `?key=<connection_key>`

### Example Connection (JavaScript)
```javascript
const WebSocket = require('ws');
const connectionKey = 'ctrl-abc123def456...'; // From database

const ws = new WebSocket(
  `wss://backend-production-baec.up.railway.app?key=${connectionKey}`
);

ws.on('open', () => {
  console.log('Connected to cloud');
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  handleMessage(message);
});
```

---

## Message Format

All messages are JSON objects with this structure:
```json
{
  "type": "message_type",
  "timestamp": "2025-10-08T10:00:00Z",
  "data": {
    // Type-specific payload
  }
}
```

---

## Cloud → NUC Messages

### 1. Connected (Welcome)

Sent immediately after successful authentication.

```json
{
  "type": "connected",
  "timestamp": "2025-10-08T10:00:00Z",
  "data": {
    "controller_id": "uuid",
    "name": "Main Floor Controller"
  }
}
```

**NUC Action:**
- Log connection success
- Store controller_id
- Start heartbeat interval

---

### 2. Heartbeat Acknowledgment

Response to heartbeat ping.

```json
{
  "type": "heartbeat_ack",
  "timestamp": "2025-10-08T10:00:00Z"
}
```

**NUC Action:**
- Reset connection timeout
- Continue operation

---

### 3. Config Update

Sent when devices/controls/scenes are added/updated/deleted via API.

**Device Added:**
```json
{
  "type": "config_update",
  "timestamp": "2025-10-08T10:00:00Z",
  "data": {
    "config_type": "device_added",
    "device": {
      "id": "uuid",
      "device_id": "dsp_main",
      "name": "Harvey DSP - Main Room",
      "type": "harvey_dsp",
      "connection_config": {
        "host": "192.168.1.50",
        "port": 3004
      }
    }
  }
}
```

**NUC Action:**
1. Update local SQLite database
2. Initialize device driver
3. Attempt connection to device
4. Send status update back

**Device Updated:**
```json
{
  "type": "config_update",
  "timestamp": "2025-10-08T10:00:00Z",
  "data": {
    "config_type": "device_updated",
    "device": {
      "id": "uuid",
      "device_id": "dsp_main",
      "name": "Updated Name",
      // ... updated fields
    }
  }
}
```

**NUC Action:**
1. Update SQLite
2. Reconnect device if connection config changed

**Device Deleted:**
```json
{
  "type": "config_update",
  "timestamp": "2025-10-08T10:00:00Z",
  "data": {
    "config_type": "device_deleted",
    "device_id": "dsp_main"
  }
}
```

**NUC Action:**
1. Close device connection
2. Remove from SQLite
3. Clean up driver instance

**Control Added/Updated/Deleted:**
```json
{
  "type": "config_update",
  "timestamp": "2025-10-08T10:00:00Z",
  "data": {
    "config_type": "control_added",
    "device_id": "dsp_main",
    "control": {
      "id": "uuid",
      "control_id": "ctrl_master_volume",
      "logical_name": "Master Volume",
      "control_type": "gain",
      "block_id": "dsp.0.gain.0"
    }
  }
}
```

**NUC Action:**
1. Update SQLite
2. Update control mapping in device manager

**Scene Added/Updated/Deleted:**
```json
{
  "type": "config_update",
  "timestamp": "2025-10-08T10:00:00Z",
  "data": {
    "config_type": "scene_added",
    "scene": {
      "id": "uuid",
      "scene_id": "scene_presentation",
      "name": "Presentation Mode",
      "steps": [...]
    }
  }
}
```

**NUC Action:**
1. Update SQLite
2. Load scene into scene executor

---

### 4. Execute Scene

Trigger scene execution.

```json
{
  "type": "execute_scene",
  "timestamp": "2025-10-08T10:00:00Z",
  "data": {
    "scene_id": "scene_presentation"
  }
}
```

**NUC Action:**
1. Look up scene in SQLite
2. Execute steps sequentially
3. Send execution_result back

**Example Implementation:**
```javascript
async function handleExecuteScene(data) {
  const scene = await db.getScene(data.scene_id);

  try {
    for (const step of scene.steps) {
      await deviceManager.setControl(
        step.device,
        step.control,
        step.value
      );

      if (step.delay) {
        await sleep(step.delay);
      }
    }

    // Send success result
    ws.send(JSON.stringify({
      type: 'execution_result',
      data: {
        scene_id: data.scene_id,
        status: 'completed',
        steps_executed: scene.steps.length
      }
    }));

  } catch (error) {
    // Send error result
    ws.send(JSON.stringify({
      type: 'execution_result',
      data: {
        scene_id: data.scene_id,
        status: 'failed',
        error: error.message
      }
    }));
  }
}
```

---

### 5. GUI Sync

Sync GUI files from cloud to NUC.

```json
{
  "type": "gui_sync",
  "timestamp": "2025-10-08T10:00:00Z",
  "data": {
    "sync_id": "uuid",
    "version": 6,
    "files": {
      "gui/pages/main.json": {
        "name": "Main Page",
        "elements": [...]
      },
      "gui/components/volume-slider.json": {
        "type": "slider",
        "control": {
          "device": "dsp_main",
          "control_id": "ctrl_master_volume"
        }
      },
      "gui/config.json": {
        "defaultPage": "main",
        "version": 6
      }
    }
  }
}
```

**NUC Action:**
1. Create backup of current files
2. Write each file to disk
3. Send progress updates
4. Reload GUI server
5. Send completion message

**Example Implementation:**
```javascript
const fs = require('fs').promises;
const path = require('path');

async function handleGuiSync(data) {
  const { sync_id, version, files } = data;
  const GUI_DIR = '/opt/control-system/var/gui-files';

  try {
    // Send progress: started
    ws.send(JSON.stringify({
      type: 'sync_progress',
      data: {
        sync_id,
        status: 'in_progress',
        progress: 0,
        files_synced: 0,
        files_total: Object.keys(files).length
      }
    }));

    let filesSynced = 0;
    const startTime = Date.now();

    // Write each file
    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(GUI_DIR, filePath);
      const dir = path.dirname(fullPath);

      // Create directory if needed
      await fs.mkdir(dir, { recursive: true });

      // Write file
      await fs.writeFile(
        fullPath,
        JSON.stringify(content, null, 2),
        'utf8'
      );

      filesSynced++;

      // Send progress update
      ws.send(JSON.stringify({
        type: 'sync_progress',
        data: {
          sync_id,
          status: 'in_progress',
          progress: Math.round((filesSynced / Object.keys(files).length) * 100),
          files_synced: filesSynced,
          files_total: Object.keys(files).length
        }
      }));
    }

    // Reload GUI server
    await reloadGuiServer();

    // Send completion
    ws.send(JSON.stringify({
      type: 'sync_complete',
      data: {
        sync_id,
        version,
        status: 'completed',
        files_synced: filesSynced,
        duration_ms: Date.now() - startTime
      }
    }));

  } catch (error) {
    // Send error
    ws.send(JSON.stringify({
      type: 'sync_error',
      data: {
        sync_id,
        error_message: error.message
      }
    }));
  }
}
```

---

## NUC → Cloud Messages

### 1. Heartbeat

Sent every 30 seconds to keep connection alive.

```json
{
  "type": "heartbeat"
}
```

**Cloud Action:**
- Update `last_seen` timestamp
- Send heartbeat_ack

**Example Implementation:**
```javascript
// NUC side
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'heartbeat'
    }));
  }
}, 30000); // 30 seconds
```

---

### 2. Status Update

Report device status changes.

```json
{
  "type": "status_update",
  "data": {
    "device_id": "dsp_main",
    "status": "online",
    "timestamp": "2025-10-08T10:00:00Z"
  }
}
```

**Cloud Action:**
- Update device status in database
- (Future) Notify web dashboard

---

### 3. Execution Result

Report scene execution outcome.

**Success:**
```json
{
  "type": "execution_result",
  "data": {
    "scene_id": "scene_presentation",
    "status": "completed",
    "steps_executed": 3,
    "duration_ms": 1500,
    "timestamp": "2025-10-08T10:00:00Z"
  }
}
```

**Failure:**
```json
{
  "type": "execution_result",
  "data": {
    "scene_id": "scene_presentation",
    "status": "failed",
    "steps_executed": 1,
    "steps_failed": 1,
    "error": "Device dsp_main not responding",
    "timestamp": "2025-10-08T10:00:00Z"
  }
}
```

**Cloud Action:**
- Log execution result
- (Future) Store in execution history table
- (Future) Notify web dashboard

---

### 4. Sync Progress

Report GUI sync progress.

```json
{
  "type": "sync_progress",
  "data": {
    "sync_id": "uuid",
    "status": "in_progress",
    "progress": 50,
    "files_synced": 1,
    "files_total": 2
  }
}
```

**Cloud Action:**
- Update sync_history table status to 'in_progress'
- (Future) Send progress to web dashboard

---

### 5. Sync Complete

Report successful GUI sync completion.

```json
{
  "type": "sync_complete",
  "data": {
    "sync_id": "uuid",
    "version": 6,
    "status": "completed",
    "files_synced": 3,
    "duration_ms": 3500
  }
}
```

**Cloud Action:**
1. Update sync_history:
   - status = 'completed'
   - completed_at = NOW()
   - duration_ms = value
   - files_synced = value
2. Create 'live' version snapshot in gui_file_versions
3. (Future) Notify web dashboard

---

### 6. Sync Error

Report GUI sync failure.

```json
{
  "type": "sync_error",
  "data": {
    "sync_id": "uuid",
    "error_message": "Permission denied: /opt/control-system/var/gui-files/gui/pages/main.json"
  }
}
```

**Cloud Action:**
1. Update sync_history:
   - status = 'failed'
   - completed_at = NOW()
   - error_message = value
2. (Future) Alert admin

---

## Connection Lifecycle

### 1. Initial Connection

```
NUC                          Cloud
 |                             |
 |---(connect with key)------->|
 |                             | (validate key)
 |                             | (update status: online)
 |<------(connected)-----------|
 |                             |
 | (start heartbeat)           |
 |                             |
```

### 2. Normal Operation

```
NUC                          Cloud
 |                             |
 |------(heartbeat)----------->|
 |<-----(heartbeat_ack)--------|
 |                             |
 |          (30s later)        |
 |------(heartbeat)----------->|
 |<-----(heartbeat_ack)--------|
 |                             |
 |                             |<---(API: create device)
 |<----(config_update)---------|
 | (process update)            |
 |------(status_update)------->|
 |                             |
```

### 3. Scene Execution

```
NUC                          Cloud
 |                             |<---(API: execute scene)
 |<----(execute_scene)---------|
 | (execute steps)             |
 |------(execution_result)---->|
 |                             | (log result)
```

### 4. GUI Sync

```
NUC                          Cloud
 |                             |<---(API: sync GUI)
 |<----(gui_sync)--------------|
 | (write files)               |
 |------(sync_progress)------->|
 | (write more)                |
 |------(sync_progress)------->|
 | (reload GUI)                |
 |------(sync_complete)------->|
 |                             | (mark live)
```

### 5. Disconnection

```
NUC                          Cloud
 |                             |
 |  (connection lost)          |
 |                             | (detect timeout)
 |                             | (update status: offline)
 |                             |
 | (auto-reconnect)            |
 |---(connect with key)------->|
 |<------(connected)-----------|
 |                             | (update status: online)
```

---

## Error Handling

### Connection Rejected

**Invalid Key:**
```
WebSocket close code: 1008 (Policy Violation)
WebSocket close reason: "Invalid connection key"
```

**No Key Provided:**
```
WebSocket close code: 1008 (Policy Violation)
WebSocket close reason: "Connection key required"
```

### Heartbeat Timeout

If NUC doesn't respond to ping within 30 seconds:
- Cloud terminates connection
- Controller status set to 'offline'
- NUC should auto-reconnect

### Message Parse Errors

If message is not valid JSON:
- Error logged on cloud
- Connection remains open
- Invalid message ignored

---

## Security

### Authentication
- Connection key is cryptographically random (32 bytes)
- Key validated against database
- One-time use per controller
- Keys never expire (stored in database)

### Data Integrity
- All messages are JSON (easy to validate)
- Invalid messages are ignored
- No code execution from messages

### Transport Security
- WSS (WebSocket Secure) enforced in production
- TLS 1.2+ encryption
- Railway provides automatic SSL

---

## Testing

### Test Connection (Node.js)

```javascript
const WebSocket = require('ws');

const connectionKey = 'your-connection-key-here';
const url = `wss://backend-production-baec.up.railway.app?key=${connectionKey}`;

const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('✓ Connected to cloud');

  // Send heartbeat
  setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'heartbeat' }));
      console.log('→ Sent heartbeat');
    }
  }, 30000);
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('← Received:', message.type, message.data || '');

  if (message.type === 'execute_scene') {
    // Simulate scene execution
    setTimeout(() => {
      ws.send(JSON.stringify({
        type: 'execution_result',
        data: {
          scene_id: message.data.scene_id,
          status: 'completed',
          steps_executed: 3
        }
      }));
      console.log('→ Sent execution result');
    }, 1000);
  }
});

ws.on('close', (code, reason) => {
  console.log(`✗ Disconnected: ${code} - ${reason}`);
});

ws.on('error', (error) => {
  console.error('✗ WebSocket error:', error.message);
});
```

---

## Message Flow Diagrams

### Config Update Flow
```
Web Dashboard          Cloud API          WebSocket Server          NUC
     |                    |                       |                   |
     |--Create Device---->|                       |                   |
     |                    |---Insert DB---------->|                   |
     |<---201 Created-----|                       |                   |
     |                    |                       |                   |
     |                    |---Broadcast Update--->|                   |
     |                    |                       |---config_update-->|
     |                    |                       |                   | (process)
     |                    |                       |<--status_update---|
     |                    |<---Update DB----------|                   |
```

### Scene Execution Flow
```
Web Dashboard          Cloud API          WebSocket Server          NUC
     |                    |                       |                   |
     |--Execute Scene---->|                       |                   |
     |                    |---Check Online------->|                   |
     |                    |                       |--execute_scene--->|
     |<---Triggered-------|                       |                   | (execute)
     |                    |                       |<--exec_result-----|
     |                    |<---Log Result---------|                   |
```

---

## Future Enhancements

### Planned Features
- ✅ Compression for large GUI syncs
- ✅ Partial sync (only changed files)
- ✅ Bidirectional config sync (NUC → Cloud)
- ✅ Real-time control value feedback
- ✅ Remote diagnostics
- ✅ Firmware updates over WebSocket

---

**Protocol Version:** 1.0.0
**Last Updated:** October 8, 2025
