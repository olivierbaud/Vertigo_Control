# AI-Assisted Device Driver Management

## Overview

This feature allows integrators to create custom device drivers with AI assistance. Instead of manually coding drivers, integrators can describe the protocol in natural language or upload documentation, and the AI will generate a complete, production-ready driver.

---

## What's Been Implemented

### ✅ Backend Complete

#### 1. **Database Schema** ([db/migrations/004_driver_management.sql](db/migrations/004_driver_management.sql))
- `device_drivers` - Stores AI-generated driver code
- `driver_commands` - Individual commands with protocol templates
- `driver_deployments` - Tracks which drivers are on which controllers
- `driver_test_results` - Validation and testing results
- `driver_versions` - Version history for rollback
- `driver_templates` - Pre-built templates for common devices

#### 2. **AI Driver Generator** ([src/ai/driver-generator.js](src/ai/driver-generator.js))
- Natural language to code generation
- Protocol documentation parsing
- Syntax validation and security checks
- Command mapping extraction
- Support for TCP, UDP, Serial, HTTP, WebSocket, MQTT

#### 3. **API Routes** ([src/routes/drivers.js](src/routes/drivers.js))
- `POST /api/drivers/generate` - Generate driver from description
- `GET /api/drivers` - List all drivers
- `GET /api/drivers/:id` - Get driver details
- `PUT /api/drivers/:id` - Update driver
- `DELETE /api/drivers/:id` - Delete driver
- `POST /api/drivers/:id/validate` - Validate driver code
- `POST /api/drivers/:id/test` - Test driver
- `POST /api/drivers/:id/deploy` - Deploy to controller
- `POST /api/drivers/:id/refine` - Refine with AI
- `GET /api/drivers/:id/deployments` - Deployment history
- `GET /api/drivers/templates/list` - Available templates

---

## How to Use

### 1. Run the Migration

First, apply the new database schema:

```bash
# Add the migration to your migrate.js runner
npm run migrate
```

Or manually execute:
```sql
-- Run db/migrations/004_driver_management.sql
psql $DATABASE_URL -f db/migrations/004_driver_management.sql
```

### 2. Generate a Driver with AI

#### Example 1: Simple Description

```bash
curl -X POST https://your-app.railway.app/api/drivers/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Biamp Audia DSP",
    "deviceType": "biamp_audia",
    "manufacturer": "Biamp",
    "model": "Audia Flex",
    "protocolType": "tcp",
    "connectionConfig": {
      "host": "192.168.1.100",
      "port": 23
    },
    "description": "TCP device on port 23. Commands are text-based with \\r\\n line endings. Format: SET <attribute_code> <channel> <value>. Response: +OK or -ERR. Example: SET 1 1 -20 sets channel 1 gain to -20dB",
    "provider": "claude"
  }'
```

**Response:**
```json
{
  "success": true,
  "driverId": "uuid-here",
  "driverCode": "// Complete driver code...",
  "className": "BiampAudiaDriver",
  "commands": [
    {
      "name": "set_gain",
      "type": "set",
      "control_type": "gain",
      "protocol_template": "SET 1 {channel} {value}\\r\\n",
      "parameters": {
        "channel": {"type": "number", "min": 1, "max": 8},
        "value": {"type": "number", "min": -80, "max": 12}
      }
    }
  ],
  "explanation": "Generated a TCP driver for Biamp Audia...",
  "usage": {
    "totalTokens": 3521,
    "cost": {"total": 0.15}
  }
}
```

#### Example 2: UDP Matrix Switcher

```javascript
const response = await fetch('/api/drivers/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: "Generic 8x8 Matrix",
    deviceType: "matrix_8x8_udp",
    protocolType: "udp",
    connectionConfig: {
      host: "192.168.1.50",
      port: 44444
    },
    description: `
      UDP matrix switcher on port 44444
      Commands:
      - Route input to output: "ROUTE {input} {output}" where input/output are 1-8
      - Get status: "STATUS"
      Responses:
      - Success: "OK\\r\\n"
      - Error: "ERROR: message\\r\\n"
    `,
    examples: `
      ROUTE 1 3    # Routes input 1 to output 3
      ROUTE 5 2    # Routes input 5 to output 2
      STATUS       # Gets current routing status
    `,
    provider: "gemini"  // Use free Gemini for testing
  })
});
```

#### Example 3: Upload Protocol Documentation

```javascript
// User uploads a PDF/text file with protocol specs
const protocolDocs = await readFile('biamp_protocol.pdf');

const response = await fetch('/api/drivers/generate', {
  method: 'POST',
  body: JSON.stringify({
    name: "Biamp Tesira DSP",
    deviceType: "biamp_tesira",
    manufacturer: "Biamp",
    protocolType: "tcp",
    documentation: protocolDocs, // Full protocol documentation
    provider: "claude"  // Claude is best for complex docs
  })
});
```

### 3. Validate the Driver

Before deploying, validate the generated code:

```bash
curl -X POST https://your-app.railway.app/api/drivers/{driverId}/validate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": [
    "Consider adding try-catch blocks for error handling"
  ]
}
```

### 4. Test the Driver (Optional)

```bash
curl -X POST https://your-app.railway.app/api/drivers/{driverId}/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "syntax"
  }'
```

For live device testing (when implemented):
```json
{
  "testType": "live_device",
  "deviceHost": "192.168.1.100",
  "devicePort": 23,
  "testCommands": [
    {"command": "set_volume", "params": {"channel": 1, "value": -24}}
  ]
}
```

### 5. Deploy to Controller

Once validated, deploy to a controller:

```bash
curl -X POST https://your-app.railway.app/api/drivers/{driverId}/deploy \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "controllerId": "controller-uuid-here"
  }'
```

The driver will be synced to the NUC via WebSocket and loaded dynamically.

### 6. Refine with AI

If you need to modify the driver:

```bash
curl -X POST https://your-app.railway.app/api/drivers/{driverId}/refine \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "refinementPrompt": "Add checksum validation to all commands using MD5",
    "provider": "claude"
  }'
```

---

## Frontend UI (Next Steps)

### Driver Creation Wizard

Create a multi-step wizard in the frontend:

**Step 1: Protocol Information**
```jsx
<ProtocolForm>
  <input name="name" placeholder="Driver Name" />
  <select name="protocolType">
    <option>TCP</option>
    <option>UDP</option>
    <option>Serial</option>
    <option>HTTP</option>
    <option>WebSocket</option>
  </select>
  <textarea name="description"
    placeholder="Describe the protocol in plain English..." />
  <FileUpload label="Upload Protocol Documentation (optional)" />
</ProtocolForm>
```

**Step 2: AI Generation**
```jsx
<AiGenerationView>
  <ChatInterface messages={messages} />
  <ProgressIndicator status="Generating..." />
  <CodePreview code={generatedCode} language="javascript" />
</AiGenerationView>
```

**Step 3: Code Editor**
```jsx
<DriverEditor>
  <MonacoEditor
    value={driverCode}
    language="javascript"
    onChange={setDriverCode}
  />
  <ValidationPanel errors={errors} warnings={warnings} />
</DriverEditor>
```

**Step 4: Testing**
```jsx
<DriverTester>
  <TestConfiguration />
  <TestResults results={testResults} />
  <DeployButton onClick={deployDriver} />
</DriverTester>
```

**Step 5: Deployment**
```jsx
<DeploymentView>
  <ControllerSelector controllers={controllers} />
  <DeployButton />
  <DeploymentStatus status={deployStatus} />
</DeploymentView>
```

---

## WebSocket Protocol Extension

### Cloud → NUC: Driver Sync

```javascript
{
  type: 'driver_sync',
  timestamp: '2025-10-13T12:00:00Z',
  data: {
    sync_id: 'uuid',
    driver_id: 'uuid',
    driver_type: 'biamp_audia',
    version: '1.0.0',
    driver_code: '...complete JavaScript code...',
    command_mappings: [
      {
        name: 'set_gain',
        control_type: 'gain',
        protocol_template: 'SET 1 {channel} {value}\\r\\n',
        parameters: {...}
      }
    ],
    protocol_type: 'tcp',
    connection_config: {
      host: '192.168.1.100',
      port: 23
    }
  }
}
```

### NUC → Cloud: Sync Result

```javascript
{
  type: 'driver_sync_complete',
  timestamp: '2025-10-13T12:00:05Z',
  data: {
    sync_id: 'uuid',
    status: 'success',
    driver_id: 'uuid',
    loaded: true,
    error: null,
    nuc_driver_path: '/opt/control-system/var/drivers/uuid.js'
  }
}
```

**Error Response:**
```javascript
{
  type: 'driver_sync_error',
  data: {
    sync_id: 'uuid',
    error: 'Failed to load driver: SyntaxError at line 42'
  }
}
```

---

## NUC Side Implementation

### Dynamic Driver Loader

Create this file on the NUC:

```javascript
// control-system/src/drivers/dynamic-loader.js

const fs = require('fs');
const path = require('path');
const BaseDriver = require('./base-driver');

class DynamicDriverLoader {
  constructor(deviceManager) {
    this.deviceManager = deviceManager;
    this.loadedDrivers = new Map();
    this.driverDir = '/opt/control-system/var/drivers';

    // Create driver directory if it doesn't exist
    if (!fs.existsSync(this.driverDir)) {
      fs.mkdirSync(this.driverDir, { recursive: true });
    }
  }

  /**
   * Load driver from WebSocket message
   */
  async loadDriver(driverData) {
    const { sync_id, driver_id, driver_code, command_mappings } = driverData;

    try {
      // Validate code (security check)
      this.validateCode(driver_code);

      // Write to file
      const driverPath = path.join(this.driverDir, `${driver_id}.js`);
      fs.writeFileSync(driverPath, driver_code, 'utf8');

      // Clear require cache if reloading
      delete require.cache[require.resolve(driverPath)];

      // Require the module
      const DriverClass = require(driverPath);

      // Verify it extends BaseDriver
      if (!(DriverClass.prototype instanceof BaseDriver)) {
        throw new Error('Driver must extend BaseDriver');
      }

      // Register with device manager
      this.deviceManager.registerDriver(driver_id, DriverClass);

      this.loadedDrivers.set(driver_id, {
        class: DriverClass,
        commands: command_mappings,
        loadedAt: new Date(),
        path: driverPath
      });

      console.log(`✓ Driver ${driver_id} loaded successfully`);

      return {
        success: true,
        sync_id,
        driver_id,
        loaded: true,
        nuc_driver_path: driverPath
      };

    } catch (error) {
      console.error(`✗ Failed to load driver ${driver_id}:`, error);
      return {
        success: false,
        sync_id,
        driver_id,
        loaded: false,
        error: error.message
      };
    }
  }

  /**
   * Security validation
   */
  validateCode(code) {
    const forbidden = [
      'eval(',
      'Function(',
      'require("child_process")',
      'require("fs")',
      'process.exit',
      '__dirname',
      '__filename',
      'require("os")',
      'require("cluster")'
    ];

    for (const pattern of forbidden) {
      if (code.includes(pattern)) {
        throw new Error(`Security violation: ${pattern} not allowed`);
      }
    }

    // Additional checks
    if (code.includes('rm -rf')) {
      throw new Error('Potentially dangerous command detected');
    }

    return true;
  }

  /**
   * Unload driver
   */
  unloadDriver(driverId) {
    const driver = this.loadedDrivers.get(driverId);
    if (driver) {
      this.deviceManager.unregisterDriver(driverId);
      this.loadedDrivers.delete(driverId);

      // Optionally delete file
      if (fs.existsSync(driver.path)) {
        fs.unlinkSync(driver.path);
      }

      console.log(`✓ Driver ${driverId} unloaded`);
    }
  }

  /**
   * Get loaded drivers
   */
  getLoadedDrivers() {
    return Array.from(this.loadedDrivers.entries()).map(([id, info]) => ({
      driver_id: id,
      loaded_at: info.loadedAt,
      path: info.path
    }));
  }
}

module.exports = DynamicDriverLoader;
```

### Integration with WebSocket Client

```javascript
// control-system/src/sync/client.js

const DynamicDriverLoader = require('../drivers/dynamic-loader');

class SyncClient {
  constructor() {
    this.driverLoader = new DynamicDriverLoader(deviceManager);
    // ...
  }

  handleMessage(message) {
    const { type, data } = JSON.parse(message);

    switch (type) {
      case 'driver_sync':
        this.handleDriverSync(data);
        break;
      // ... other cases
    }
  }

  async handleDriverSync(data) {
    console.log(`Syncing driver: ${data.driver_id}`);

    const result = await this.driverLoader.loadDriver(data);

    // Send result back to cloud
    this.ws.send(JSON.stringify({
      type: result.success ? 'driver_sync_complete' : 'driver_sync_error',
      timestamp: new Date().toISOString(),
      data: result
    }));
  }
}
```

---

## Example Generated Drivers

### TCP Device (Biamp Audia)

```javascript
const BaseDriver = require('./base-driver');
const net = require('net');

/**
 * Biamp Audia DSP Driver
 * Protocol: TCP, Port 23
 * Auto-generated by AI
 */
class BiampAudiaDriver extends BaseDriver {
  constructor(config) {
    super(config);
    this.host = config.host;
    this.port = config.port || 23;
    this.socket = null;
    this.responseHandlers = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = net.connect(this.port, this.host);

      this.socket.on('connect', () => {
        this.connected = true;
        this.emit('connected');
        console.log(`Biamp Audia ${this.deviceId} connected`);
        resolve();
      });

      this.socket.on('data', (data) => {
        this.handleResponse(data.toString());
      });

      this.socket.on('close', () => {
        this.connected = false;
        this.emit('disconnected');
        setTimeout(() => this.connect(), 5000);
      });

      this.socket.on('error', (err) => {
        this.emit('error', err);
        reject(err);
      });
    });
  }

  async disconnect() {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
      this.connected = false;
    }
  }

  async setControl(control, value) {
    const { control_type, block_id, parameters } = control;

    switch(control_type) {
      case 'gain':
        return this.sendCommand(`SET 1 ${block_id} ${value}`);
      case 'mute':
        return this.sendCommand(`SET 2 ${block_id} ${value ? 1 : 0}`);
      default:
        throw new Error(`Unsupported control type: ${control_type}`);
    }
  }

  async sendCommand(command) {
    if (!this.connected) throw new Error('Not connected');

    return new Promise((resolve, reject) => {
      const requestId = `req_${Date.now()}`;
      const timeout = setTimeout(() => {
        this.responseHandlers.delete(requestId);
        reject(new Error('Command timeout'));
      }, 3000);

      this.responseHandlers.set(requestId, (response) => {
        clearTimeout(timeout);
        response.startsWith('+OK') ? resolve(response) : reject(new Error(response));
      });

      this.socket.write(command + '\r\n');
      console.log(`Biamp Audia ${this.deviceId}: ${command}`);
    });
  }

  handleResponse(data) {
    this.emit('response', data);
    const [requestId, handler] = this.responseHandlers.entries().next().value || [];
    if (handler) {
      this.responseHandlers.delete(requestId);
      handler(data.trim());
    }
  }
}

module.exports = BiampAudiaDriver;
```

### UDP Matrix Switcher

```javascript
const BaseDriver = require('./base-driver');
const dgram = require('dgram');

/**
 * Generic 8x8 Matrix Switcher (UDP)
 * Auto-generated by AI
 */
class Matrix8x8Driver extends BaseDriver {
  constructor(config) {
    super(config);
    this.host = config.host;
    this.port = config.port || 44444;
    this.socket = null;
  }

  async connect() {
    return new Promise((resolve) => {
      this.socket = dgram.createSocket('udp4');

      this.socket.on('message', (msg) => {
        this.emit('response', msg.toString());
      });

      this.socket.on('error', (err) => {
        this.emit('error', err);
      });

      this.connected = true;
      this.emit('connected');
      resolve();
    });
  }

  async disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.connected = false;
    }
  }

  async setControl(control, value) {
    const { control_type } = control;

    if (control_type === 'matrix_route') {
      const { input, output } = value;
      return this.routeInput(input, output);
    }

    throw new Error(`Unsupported control type: ${control_type}`);
  }

  async routeInput(input, output) {
    if (input < 1 || input > 8 || output < 1 || output > 8) {
      throw new Error('Input/output must be between 1-8');
    }

    const command = `ROUTE ${input} ${output}`;
    return this.sendCommand(command);
  }

  async sendCommand(command) {
    if (!this.connected) throw new Error('Not connected');

    return new Promise((resolve, reject) => {
      const message = Buffer.from(command);
      this.socket.send(message, this.port, this.host, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = Matrix8x8Driver;
```

---

## Security Considerations

### Code Validation

The system validates generated drivers for:
- ✅ Must extend BaseDriver
- ✅ Must implement required methods
- ✅ No dangerous patterns (`eval`, `Function()`, `child_process`)
- ✅ No file system access
- ✅ No process manipulation
- ✅ Syntax validation

### Sandboxing (Future Enhancement)

For production, consider:
- VM2 or isolated-vm for code execution
- Resource limits (CPU, memory, network)
- Timeout enforcement
- Audit logging of all driver operations

---

## Cost Management

### Token Usage

Driver generation typically uses:
- **Simple protocols**: 2,000-4,000 tokens (~$0.05-$0.15 with Claude)
- **Complex protocols**: 4,000-8,000 tokens (~$0.15-$0.30 with Claude)
- **With documentation**: 8,000-15,000 tokens (~$0.30-$0.60 with Claude)

**Recommendation**: Use Gemini (free) for testing, Claude for production.

### Tracking

All driver generation is tracked in `ai_usage` table:
```sql
SELECT
  COUNT(*) as drivers_generated,
  SUM(tokens_used) as total_tokens,
  SUM(cost_usd) as total_cost
FROM ai_usage
WHERE request_type = 'driver_generation'
  AND created_at >= NOW() - INTERVAL '30 days';
```

---

## Roadmap

### Phase 1: Core Functionality ✅
- [x] Database schema
- [x] AI driver generator
- [x] API routes
- [x] Validation and security

### Phase 2: Frontend & Testing (Next)
- [ ] Driver creation wizard UI
- [ ] Code editor with syntax highlighting
- [ ] Live device testing
- [ ] Deployment UI

### Phase 3: NUC Integration
- [ ] Dynamic driver loader on NUC
- [ ] WebSocket sync implementation
- [ ] Driver lifecycle management
- [ ] Performance monitoring

### Phase 4: Advanced Features
- [ ] Driver marketplace (share drivers)
- [ ] Version management UI
- [ ] Automated testing framework
- [ ] Driver analytics dashboard

---

## Testing

### Manual Testing

1. **Generate a Simple UDP Driver**:
```bash
curl -X POST http://localhost:3000/api/drivers/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @test-driver-spec.json
```

2. **Validate the Generated Code**:
```bash
curl -X POST http://localhost:3000/api/drivers/$DRIVER_ID/validate \
  -H "Authorization: Bearer $TOKEN"
```

3. **List Drivers**:
```bash
curl http://localhost:3000/api/drivers \
  -H "Authorization: Bearer $TOKEN"
```

### Integration Tests

```javascript
describe('Driver Generation', () => {
  it('should generate a TCP driver from description', async () => {
    const response = await request(app)
      .post('/api/drivers/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test TCP Device',
        deviceType: 'test_tcp',
        protocolType: 'tcp',
        description: 'Simple TCP device on port 23...'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.driverCode).toContain('extends BaseDriver');
  });
});
```

---

## Support

### Common Issues

**Q: Driver generation fails with "No API key"**
A: Add AI provider API key to environment variables:
```bash
ANTHROPIC_API_KEY=sk-ant-...
```

**Q: Generated driver has syntax errors**
A: The AI sometimes makes mistakes. Use the `/refine` endpoint:
```bash
curl -X POST /api/drivers/$DRIVER_ID/refine \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"refinementPrompt": "Fix the syntax error on line 42"}'
```

**Q: How do I test without deploying?**
A: Use the validate endpoint first, then test endpoint with testType: "syntax"

---

## Next Steps

1. **Run the migration** to create database tables
2. **Test driver generation** with a simple protocol
3. **Build the frontend UI** (wizard + code editor)
4. **Implement NUC loader** for dynamic driver loading
5. **Add live device testing** capability

---

**Status**: Backend Complete ✅ | Frontend Pending 🔄 | NUC Integration Pending 🔄
