# NUC Driver Sync Implementation Guide

## Context

You are implementing the driver sync feature on the NUC (Node Under Control) side. The cloud backend sends device driver code via WebSocket, and the NUC needs to receive it, store it, and make it available for device management.

## WebSocket Message Format

The cloud sends a `driver_sync` message when a driver is deployed:

```json
{
  "type": "driver_sync",
  "timestamp": "2025-10-14T10:00:00Z",
  "data": {
    "sync_id": "uuid",
    "driver_id": "uuid",
    "driver_type": "binary_power_control",
    "version": "1.0.0",
    "driver_code": "const BaseDriver = require('./base-driver');\n...",
    "command_mappings": [],
    "protocol_type": "tcp",
    "connection_config": {
      "host": "192.168.1.100",
      "port": 23
    }
  }
}
```

## Implementation Requirements

### 1. Message Handler

Add a new message handler in your WebSocket client for the `driver_sync` message type.

**Location:** Your WebSocket message handler (similar to how you handle `gui_sync`, `execute_scene`, etc.)

**Example Pattern:**
```javascript
case 'driver_sync':
  handleDriverSync(message.data);
  break;
```

### 2. Driver Storage

Store drivers in your NUC's file system and database.

**File Storage:**
- Store driver files in: `/opt/control-system/var/drivers/`
- Filename format: `{driver_type}.js` (e.g., `binary_power_control.js`)
- Ensure directory exists with proper permissions

**Database Storage (SQLite):**
```sql
CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY,                  -- driver_id from cloud
  driver_type TEXT UNIQUE NOT NULL,     -- e.g., 'binary_power_control'
  version TEXT NOT NULL,                -- e.g., '1.0.0'
  protocol_type TEXT NOT NULL,          -- e.g., 'tcp', 'udp', 'serial'
  driver_code TEXT NOT NULL,            -- Full JavaScript code
  command_mappings TEXT,                -- JSON string of command mappings
  connection_config TEXT,               -- JSON string of default config
  sync_id TEXT,                         -- For tracking deployments
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active'          -- 'active', 'archived'
);
```

### 3. Sync Handler Implementation

```javascript
const fs = require('fs').promises;
const path = require('path');
const db = require('./database'); // Your SQLite wrapper

async function handleDriverSync(data) {
  const {
    sync_id,
    driver_id,
    driver_type,
    version,
    driver_code,
    command_mappings,
    protocol_type,
    connection_config
  } = data;

  const DRIVERS_DIR = '/opt/control-system/var/drivers';
  const driverPath = path.join(DRIVERS_DIR, `${driver_type}.js`);

  try {
    // Send progress: started
    ws.send(JSON.stringify({
      type: 'driver_sync_progress',
      data: {
        sync_id,
        status: 'in_progress',
        step: 'saving_file'
      }
    }));

    // 1. Ensure drivers directory exists
    await fs.mkdir(DRIVERS_DIR, { recursive: true });

    // 2. Write driver file to disk
    await fs.writeFile(driverPath, driver_code, 'utf8');
    console.log(`✓ Driver file saved: ${driverPath}`);

    // 3. Validate driver can be loaded (syntax check)
    try {
      // Test require without caching
      delete require.cache[require.resolve(driverPath)];
      const DriverClass = require(driverPath);

      // Basic validation
      if (typeof DriverClass !== 'function') {
        throw new Error('Driver must export a class');
      }

      console.log(`✓ Driver validation passed: ${driver_type}`);
    } catch (validateError) {
      throw new Error(`Driver validation failed: ${validateError.message}`);
    }

    // 4. Store in database
    await db.run(`
      INSERT OR REPLACE INTO drivers (
        id, driver_type, version, protocol_type,
        driver_code, command_mappings, connection_config,
        sync_id, synced_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'active')
    `, [
      driver_id,
      driver_type,
      version,
      protocol_type,
      driver_code,
      JSON.stringify(command_mappings),
      JSON.stringify(connection_config),
      sync_id
    ]);

    console.log(`✓ Driver stored in database: ${driver_type} v${version}`);

    // 5. Update device manager to use new driver
    // If any devices of this type exist, reload them
    await reloadDevicesUsingDriver(driver_type);

    // 6. Send success response
    ws.send(JSON.stringify({
      type: 'driver_sync_complete',
      data: {
        sync_id,
        driver_id,
        driver_type,
        version,
        status: 'completed',
        file_path: driverPath
      }
    }));

    console.log(`✓ Driver sync completed: ${driver_type}`);

  } catch (error) {
    console.error(`✗ Driver sync error for ${driver_type}:`, error);

    // Send error response
    ws.send(JSON.stringify({
      type: 'driver_sync_error',
      data: {
        sync_id,
        driver_id,
        driver_type,
        error_message: error.message,
        error_stack: error.stack
      }
    }));
  }
}
```

### 4. Device Manager Integration

Update your device manager to load drivers dynamically from the drivers directory.

**Example Driver Loader:**
```javascript
class DeviceManager {
  constructor() {
    this.devices = new Map();
    this.drivers = new Map();
    this.DRIVERS_DIR = '/opt/control-system/var/drivers';
  }

  async loadDriver(driverType) {
    if (this.drivers.has(driverType)) {
      return this.drivers.get(driverType);
    }

    const driverPath = path.join(this.DRIVERS_DIR, `${driverType}.js`);

    try {
      // Clear require cache to get fresh copy
      delete require.cache[require.resolve(driverPath)];

      const DriverClass = require(driverPath);

      // Store in cache
      this.drivers.set(driverType, DriverClass);

      console.log(`✓ Loaded driver: ${driverType}`);
      return DriverClass;

    } catch (error) {
      console.error(`✗ Failed to load driver ${driverType}:`, error);
      throw new Error(`Driver not found: ${driverType}`);
    }
  }

  async createDevice(deviceConfig) {
    const { device_id, name, type, connection_config } = deviceConfig;

    // Load driver for this device type
    const DriverClass = await this.loadDriver(type);

    // Create driver instance
    const driver = new DriverClass({
      ...connection_config,
      name,
      deviceId: device_id
    });

    // Store device instance
    this.devices.set(device_id, {
      id: device_id,
      name,
      type,
      driver,
      connection_config,
      status: 'disconnected'
    });

    // Connect to device
    try {
      await driver.connect();
      this.devices.get(device_id).status = 'connected';

      // Send status update to cloud
      this.sendStatusUpdate(device_id, 'connected');

    } catch (error) {
      console.error(`Failed to connect device ${name}:`, error);
      this.devices.get(device_id).status = 'error';
      this.sendStatusUpdate(device_id, 'error', error.message);
    }

    return driver;
  }

  async reloadDevicesUsingDriver(driverType) {
    console.log(`Reloading devices using driver: ${driverType}`);

    // Find all devices using this driver
    const devicesToReload = [];
    this.devices.forEach((device, deviceId) => {
      if (device.type === driverType) {
        devicesToReload.push(deviceId);
      }
    });

    if (devicesToReload.length === 0) {
      console.log(`No devices using driver ${driverType}`);
      return;
    }

    // Reload each device
    for (const deviceId of devicesToReload) {
      const device = this.devices.get(deviceId);

      try {
        // Disconnect old driver
        if (device.driver && typeof device.driver.disconnect === 'function') {
          await device.driver.disconnect();
        }

        // Load new driver
        const DriverClass = await this.loadDriver(driverType);

        // Create new instance
        const newDriver = new DriverClass({
          ...device.connection_config,
          name: device.name,
          deviceId: device.id
        });

        // Connect
        await newDriver.connect();

        // Update device
        device.driver = newDriver;
        device.status = 'connected';

        console.log(`✓ Reloaded device: ${device.name}`);
        this.sendStatusUpdate(deviceId, 'connected');

      } catch (error) {
        console.error(`✗ Failed to reload device ${device.name}:`, error);
        device.status = 'error';
        this.sendStatusUpdate(deviceId, 'error', error.message);
      }
    }
  }

  sendStatusUpdate(deviceId, status, message = null) {
    // Send to cloud via WebSocket
    ws.send(JSON.stringify({
      type: 'status_update',
      data: {
        device_id: deviceId,
        status,
        message,
        timestamp: new Date().toISOString()
      }
    }));
  }
}
```

### 5. Response Messages to Cloud

**Progress Message:**
```json
{
  "type": "driver_sync_progress",
  "data": {
    "sync_id": "uuid",
    "status": "in_progress",
    "step": "saving_file"
  }
}
```

**Success Message:**
```json
{
  "type": "driver_sync_complete",
  "data": {
    "sync_id": "uuid",
    "driver_id": "uuid",
    "driver_type": "binary_power_control",
    "version": "1.0.0",
    "status": "completed",
    "file_path": "/opt/control-system/var/drivers/binary_power_control.js"
  }
}
```

**Error Message:**
```json
{
  "type": "driver_sync_error",
  "data": {
    "sync_id": "uuid",
    "driver_id": "uuid",
    "driver_type": "binary_power_control",
    "error_message": "Driver validation failed: ...",
    "error_stack": "Error: ..."
  }
}
```

## Cloud Backend Updates Needed

The cloud currently doesn't have handlers for the NUC's response messages. Add these to `src/websocket/server.js`:

```javascript
case 'driver_sync_progress':
  this.handleDriverSyncProgress(ws, message.data);
  break;

case 'driver_sync_complete':
  this.handleDriverSyncComplete(ws, message.data);
  break;

case 'driver_sync_error':
  this.handleDriverSyncError(ws, message.data);
  break;
```

**Handler Implementations:**

```javascript
handleDriverSyncProgress(ws, data) {
  console.log(`Driver sync progress from ${ws.controllerName}:`, data);
  // Update driver_deployments table
  pool.query(
    `UPDATE driver_deployments
     SET deployment_status = 'in_progress'
     WHERE sync_id = $1`,
    [data.sync_id]
  ).catch(err => console.error('Driver sync progress update error:', err));
}

handleDriverSyncComplete(ws, data) {
  console.log(`Driver sync complete from ${ws.controllerName}:`, data);
  // Update driver_deployments table
  pool.query(
    `UPDATE driver_deployments
     SET deployment_status = 'active',
         deployed_at = NOW(),
         file_path = $2
     WHERE sync_id = $1`,
    [data.sync_id, data.file_path]
  ).catch(err => console.error('Driver sync complete update error:', err));
}

handleDriverSyncError(ws, data) {
  console.error(`Driver sync error from ${ws.controllerName}:`, data);
  // Update driver_deployments table
  pool.query(
    `UPDATE driver_deployments
     SET deployment_status = 'failed',
         error_message = $2
     WHERE sync_id = $1`,
    [data.sync_id, data.error_message]
  ).catch(err => console.error('Driver sync error update error:', err));
}
```

## Testing

### 1. Test Driver Sync

1. Deploy a driver from the cloud web interface
2. Check NUC logs for:
   - WebSocket message received
   - File written successfully
   - Database updated
   - Success message sent

### 2. Test Driver Loading

1. Create a device that uses the synced driver
2. Verify the device connects properly
3. Send control commands
4. Check device responds correctly

### 3. Test Driver Reload

1. Deploy an updated version of a driver
2. Verify existing devices using that driver are reloaded
3. Check they continue to work with the new code

## File Structure

```
/opt/control-system/
├── var/
│   ├── drivers/                    # Driver storage
│   │   ├── binary_power_control.js
│   │   ├── harvey_dsp.js
│   │   └── ...
│   ├── gui-files/                  # GUI files (existing)
│   └── database.sqlite             # Local database
├── src/
│   ├── websocket-client.js         # WebSocket connection
│   ├── device-manager.js           # Device management
│   ├── database.js                 # SQLite wrapper
│   └── ...
└── logs/
    └── driver-sync.log             # Sync logs
```

## Error Handling

### Common Errors and Solutions

**1. Permission Denied**
- Ensure `/opt/control-system/var/drivers/` has write permissions
- Run as proper user or use sudo

**2. Driver Won't Load**
- Check driver code syntax
- Verify BaseDriver is available
- Check require paths are correct

**3. Device Won't Connect**
- Verify connection_config is correct
- Check network connectivity
- Ensure driver implements connect() properly

**4. Driver Validation Fails**
- Check driver extends BaseDriver
- Verify all required methods exist
- Check for syntax errors

## Security Considerations

1. **Code Validation**: Always validate driver code before executing
2. **File Permissions**: Restrict driver directory to system user only
3. **Sandboxing**: Consider running drivers in a restricted context
4. **Version Control**: Keep backups of previous driver versions
5. **Audit Logging**: Log all driver deployments and changes

## Future Enhancements

- [ ] Driver versioning with rollback capability
- [ ] Hot-reload without disconnecting devices
- [ ] Driver dependency management
- [ ] Driver testing sandbox
- [ ] Automatic driver updates
- [ ] Driver performance monitoring

---

**Next Steps:**

1. Implement the `handleDriverSync` function in your NUC WebSocket client
2. Add the database schema for driver storage
3. Update your device manager to dynamically load drivers
4. Test with a simple driver deployment
5. Add the cloud-side response handlers
6. Test end-to-end driver deployment and device creation

Good luck! Let me know if you need clarification on any part of this implementation.
