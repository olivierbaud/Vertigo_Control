/**
 * AI Driver Generator
 *
 * Generates device driver code from natural language descriptions
 * or protocol documentation using AI providers (Claude, GPT-4, Gemini)
 */

const pool = require('../db/connection');

/**
 * Base driver interface that all generated drivers must extend
 */
const BASE_DRIVER_INTERFACE = `
/**
 * BaseDriver - Abstract base class for all device drivers
 * All generated drivers MUST extend this class
 */
const EventEmitter = require('events');

class BaseDriver extends EventEmitter {
  constructor(config) {
    super();
    this.deviceId = config.deviceId;
    this.name = config.name;
    this.connected = false;
    this.config = config;
  }

  /**
   * Connect to the device
   * @returns {Promise<void>}
   */
  async connect() {
    throw new Error('connect() must be implemented by subclass');
  }

  /**
   * Disconnect from the device
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error('disconnect() must be implemented by subclass');
  }

  /**
   * Set a control value on the device
   * @param {Object} control - Control definition with type, block_id, parameters
   * @param {*} value - Value to set
   * @returns {Promise<*>} Response from device
   */
  async setControl(control, value) {
    throw new Error('setControl() must be implemented by subclass');
  }

  /**
   * Get current value of a control (optional)
   * @param {Object} control - Control definition
   * @returns {Promise<*>} Current value
   */
  async getControl(control) {
    return null; // Optional to implement
  }

  /**
   * Ping the device to check connectivity (optional)
   * @returns {Promise<boolean>} True if device responds
   */
  async ping() {
    return this.connected;
  }

  /**
   * Events emitted:
   * - 'connected' - When connection is established
   * - 'disconnected' - When connection is lost
   * - 'error' - When an error occurs (error)
   * - 'response' - When device sends data (data)
   */
}

module.exports = BaseDriver;
`;

/**
 * Example drivers for AI to reference
 */
const EXAMPLE_DRIVERS = {
  tcp_harvey_dsp: `
// Harvey DSP Driver - TCP Example
const BaseDriver = require('./base-driver');
const net = require('net');

class HarveyDSP extends BaseDriver {
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
        console.log(\`Harvey DSP \${this.deviceId} connected\`);
        resolve();
      });

      this.socket.on('data', (data) => {
        this.handleResponse(data.toString());
      });

      this.socket.on('close', () => {
        this.connected = false;
        this.emit('disconnected');
        setTimeout(() => this.connect(), 5000); // Auto-reconnect
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
        const dbValue = this.percentToDb(value, parameters.min, parameters.max);
        return this.sendCommand(\`SET LVLGAIN \${block_id} \${Math.round(dbValue * 10)}\`);

      case 'mute':
        return this.sendCommand(\`SET LVLMUTE \${block_id} \${value ? 1 : 0}\`);

      default:
        throw new Error(\`Unsupported control type: \${control_type}\`);
    }
  }

  async sendCommand(command) {
    if (!this.connected) throw new Error('Not connected');

    return new Promise((resolve, reject) => {
      const requestId = \`req_\${Date.now()}\`;
      const timeout = setTimeout(() => {
        this.responseHandlers.delete(requestId);
        reject(new Error('Command timeout'));
      }, 3000);

      this.responseHandlers.set(requestId, (response) => {
        clearTimeout(timeout);
        response.startsWith('OK') ? resolve(response) : reject(new Error(response));
      });

      this.socket.write(command + '\\r\\n');
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

  percentToDb(percent, minDb, maxDb) {
    return minDb + ((maxDb - minDb) * percent / 100);
  }
}

module.exports = HarveyDSP;
  `,

  udp_simple: `
// Simple UDP Device - UDP Example
const BaseDriver = require('./base-driver');
const dgram = require('dgram');

class UDPDeviceDriver extends BaseDriver {
  constructor(config) {
    super(config);
    this.host = config.host;
    this.port = config.port;
    this.socket = null;
  }

  async connect() {
    return new Promise((resolve) => {
      this.socket = dgram.createSocket('udp4');

      this.socket.on('message', (msg, rinfo) => {
        this.emit('response', msg.toString());
      });

      this.socket.on('error', (err) => {
        this.emit('error', err);
      });

      // UDP is connectionless
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
    const command = \`SET \${control.block_id} \${value}\`;
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

module.exports = UDPDeviceDriver;
  `
};

/**
 * System prompt for driver generation
 */
function buildDriverGenerationPrompt(context) {
  return `You are an expert device driver developer for professional AV control systems.

Your task is to generate a complete, production-ready Node.js device driver that:
1. Extends the BaseDriver class interface provided below
2. Implements the specific protocol described by the user
3. Handles connection management with auto-reconnection
4. Properly encodes commands according to the protocol specification
5. Parses device responses and handles errors gracefully
6. Includes comprehensive error handling and logging
7. Follows Node.js best practices

BASE DRIVER INTERFACE YOU MUST EXTEND:
${BASE_DRIVER_INTERFACE}

EXAMPLE DRIVERS FOR REFERENCE:
${context.protocol_type === 'tcp' ? EXAMPLE_DRIVERS.tcp_harvey_dsp : ''}
${context.protocol_type === 'udp' ? EXAMPLE_DRIVERS.udp_simple : ''}

USER'S PROTOCOL SPECIFICATION:
Protocol Type: ${context.protocol_type.toUpperCase()}
${context.description ? `Description: ${context.description}` : ''}
${context.documentation ? `Documentation:\n${context.documentation}` : ''}
${context.examples ? `Examples:\n${context.examples}` : ''}

${context.connection_config ? `Connection Configuration:\n${JSON.stringify(context.connection_config, null, 2)}` : ''}

REQUIREMENTS:
1. Class name should be descriptive (e.g., AvproMatrixDriver, BiampAudiaDriver)
2. Must extend BaseDriver
3. Implement all required methods: connect(), disconnect(), setControl()
4. Use appropriate Node.js modules (net for TCP, dgram for UDP, serialport for Serial)
5. Add auto-reconnection logic for TCP/Serial
6. Include proper error handling with try-catch blocks
7. Use Promises and async/await (no callbacks)
8. Add detailed comments explaining the protocol
9. Include helper methods for protocol-specific operations
10. Emit events: 'connected', 'disconnected', 'error', 'response'

COMMAND MAPPING:
Also provide a JSON object mapping control types to protocol commands.
Format:
{
  "commands": [
    {
      "name": "set_volume",
      "type": "set",
      "control_type": "gain",
      "protocol_template": "SET GAIN {block_id} {value}\\r\\n",
      "parameters": {
        "block_id": { "type": "string", "required": true },
        "value": { "type": "number", "min": -80, "max": 12 }
      },
      "example": "SET GAIN MASTER -24\\r\\n"
    }
  ]
}

OUTPUT FORMAT:
Return a JSON object with:
{
  "driverCode": "complete JavaScript code",
  "commands": [array of command definitions],
  "className": "DriverClassName",
  "protocolNotes": "any important protocol quirks or notes",
  "dependencies": ["net", "dgram", etc.],
  "explanation": "brief explanation of the implementation"
}

CRITICAL JSON FORMATTING RULES:
- Return ONLY valid JSON, no markdown formatting
- In the driverCode field, you MUST properly escape all special characters:
  * Escape all backslashes: \\ becomes \\\\
  * Escape all double quotes: " becomes \\"
  * Escape all newlines: \\n stays as \\n (already escaped)
  * Escape all tabs: \\t stays as \\t (already escaped)
- The driverCode must be a valid JSON string value
- Ensure the driver code is complete and runnable
- Include all necessary require() statements
- Handle edge cases (timeouts, disconnections, invalid responses)
`;
}

/**
 * Attempt to fix common JSON escaping issues in AI responses
 * Specifically handles unescaped quotes in the driverCode field
 */
function attemptFixJson(jsonString) {
  try {
    // Try to parse as-is first
    return JSON.parse(jsonString);
  } catch (e) {
    console.log('Initial parse failed, attempting to fix JSON...');
    console.log('Error was:', e.message);

    try {
      // Find the start of driverCode field
      const driverCodeStart = jsonString.indexOf('"driverCode"');
      if (driverCodeStart === -1) {
        throw new Error('Could not find driverCode field');
      }

      // Find where the value starts (after : and ")
      const valueStart = jsonString.indexOf('"', jsonString.indexOf(':', driverCodeStart)) + 1;

      // Find the next field (commands, className, etc.) to know where driverCode ends
      // Look for pattern: ",\n  "nextField":
      const nextFieldPattern = /,\s*"(commands|className|protocolNotes|dependencies|explanation)":/g;
      nextFieldPattern.lastIndex = valueStart;
      const nextFieldMatch = nextFieldPattern.exec(jsonString);

      if (!nextFieldMatch) {
        throw new Error('Could not find end of driverCode field');
      }

      // Extract the raw driver code (between the quotes)
      const valueEnd = nextFieldMatch.index - 1; // Position of " before the comma
      const rawDriverCode = jsonString.substring(valueStart, valueEnd);

      console.log('Extracted raw driver code, length:', rawDriverCode.length);

      // Properly escape it
      const escapedDriverCode = rawDriverCode
        .replace(/\\/g, '\\\\')  // Escape backslashes first
        .replace(/"/g, '\\"')    // Then escape quotes
        .replace(/\n/g, '\\n')   // Escape newlines
        .replace(/\r/g, '\\r')   // Escape carriage returns
        .replace(/\t/g, '\\t');  // Escape tabs

      // Reconstruct the JSON
      const before = jsonString.substring(0, valueStart);
      const after = jsonString.substring(valueEnd);
      const fixed = before + escapedDriverCode + after;

      console.log('Attempting to parse fixed JSON...');
      return JSON.parse(fixed);
    } catch (fixError) {
      console.error('Could not automatically fix JSON:', fixError.message);
      throw e; // Rethrow original error
    }
  }
}

/**
 * Generate driver code from user specification
 */
async function generateDriver(context, aiProvider) {
  const prompt = buildDriverGenerationPrompt(context);

  try {
    // Temporarily increase maxTokens for driver generation to ensure complete response
    const originalMaxTokens = aiProvider.config.maxTokens;
    aiProvider.config.maxTokens = 16000; // Increase to handle large driver code

    // Call AI provider
    const response = await aiProvider.chat([
      {
        role: 'system',
        content: 'You are an expert device driver developer. You must return ONLY valid, parseable JSON. ' +
                 'CRITICAL: Properly escape all quotes and backslashes in the driverCode string. ' +
                 'Every " must be \\" and every \\ must be \\\\. Test your JSON before responding.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]);

    // Restore original maxTokens
    aiProvider.config.maxTokens = originalMaxTokens;

    // Parse AI response
    let result;
    try {
      // Log raw response for debugging
      console.log('Raw AI response length:', response.content?.length || 0);
      console.log('First 200 chars:', response.content?.substring(0, 200));

      // Check if response was likely truncated
      if (response.usage) {
        console.log('Token usage:', JSON.stringify(response.usage));
        const outputTokens = response.usage.outputTokens || response.usage.output_tokens || 0;
        if (outputTokens >= originalMaxTokens * 0.95) {
          console.warn('WARNING: Response may have been truncated - using max tokens');
        }
      }

      // Try multiple cleaning strategies
      let cleanedResponse = response.content;

      // Strategy 1: Remove markdown code blocks (do this more aggressively)
      // First, try to extract content between ```json and ``` or between ``` and ```
      let codeBlockMatch = cleanedResponse.match(/```json\s*([\s\S]*?)\s*```/i) ||
                          cleanedResponse.match(/```\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        cleanedResponse = codeBlockMatch[1];
      } else {
        // Fallback: remove any markdown code blocks
        cleanedResponse = cleanedResponse
          .replace(/```json\n?/gi, '')
          .replace(/```javascript\n?/gi, '')
          .replace(/```\n?/g, '')
          .trim();
      }

      // Strategy 2: Extract JSON if there's text before/after
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }

      // Strategy 3: Remove any leading/trailing non-JSON text
      const firstBrace = cleanedResponse.indexOf('{');
      const lastBrace = cleanedResponse.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
      }

      console.log('Cleaned response length:', cleanedResponse.length);
      console.log('First 200 chars of cleaned:', cleanedResponse.substring(0, 200));
      console.log('Last 100 chars of cleaned:', cleanedResponse.substring(cleanedResponse.length - 100));

      // Check if JSON appears truncated
      if (!cleanedResponse.trim().endsWith('}')) {
        console.error('Response appears truncated - does not end with }');
        throw new Error('AI response appears to be truncated (incomplete JSON)');
      }

      // Try to parse with automatic fixing
      result = attemptFixJson(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError.message);
      console.error('Response preview (first 500 chars):', response.content?.substring(0, 500));
      console.error('Response preview (last 500 chars):', response.content?.substring(response.content.length - 500));

      // Check for common truncation patterns
      if (parseError.message.includes('Unexpected end of JSON input') ||
          parseError.message.includes('Unexpected end of input')) {
        throw new Error('AI response was truncated. Try with a simpler protocol description or shorter examples.');
      }

      // Check for string escaping issues
      if (parseError.message.includes('Unterminated string') ||
          parseError.message.includes('Invalid escape')) {
        console.error('Detected string escaping issue. Position:', parseError.message.match(/\d+/)?.[0]);

        // Try to extract position and show context
        const position = parseInt(parseError.message.match(/\d+/)?.[0] || '0');
        if (position > 0) {
          const start = Math.max(0, position - 100);
          const end = Math.min(cleanedResponse.length, position + 100);
          console.error('Context around error position:', cleanedResponse.substring(start, end));
        }

        throw new Error(
          'AI generated invalid JSON (string escaping issue). ' +
          'The driver code likely contains unescaped quotes or backslashes. ' +
          'This is an AI formatting error - please try again or contact support.'
        );
      }

      throw new Error(`AI returned invalid JSON format: ${parseError.message}`);
    }

    // Validate required fields
    if (!result.driverCode || !result.className) {
      throw new Error('AI response missing required fields (driverCode, className)');
    }

    // Validate driver code syntax
    const validation = await validateDriverCode(result.driverCode);
    if (!validation.valid) {
      throw new Error(`Generated driver has syntax errors: ${validation.errors.join(', ')}`);
    }

    return {
      driverCode: result.driverCode,
      commands: result.commands || [],
      className: result.className,
      protocolNotes: result.protocolNotes || '',
      dependencies: result.dependencies || [],
      explanation: result.explanation || 'Driver generated successfully',
      usage: response.usage
    };

  } catch (error) {
    console.error('Driver generation error:', error);
    throw error;
  }
}

/**
 * Validate driver code syntax and structure
 */
async function validateDriverCode(driverCode) {
  const errors = [];
  const warnings = [];

  try {
    // Check for required patterns
    if (!driverCode.includes('extends BaseDriver')) {
      errors.push('Driver must extend BaseDriver');
    }

    if (!driverCode.includes('async connect()')) {
      errors.push('Driver must implement connect() method');
    }

    if (!driverCode.includes('async disconnect()')) {
      errors.push('Driver must implement disconnect() method');
    }

    if (!driverCode.includes('async setControl(')) {
      errors.push('Driver must implement setControl() method');
    }

    if (!driverCode.includes('module.exports')) {
      errors.push('Driver must export the class with module.exports');
    }

    // Check for dangerous patterns (security)
    const dangerousPatterns = [
      { pattern: /eval\s*\(/g, message: 'eval() is not allowed' },
      { pattern: /Function\s*\(/g, message: 'Function() constructor is not allowed' },
      { pattern: /require\s*\(\s*['"]child_process['"]\s*\)/g, message: 'child_process is not allowed' },
      { pattern: /require\s*\(\s*['"]fs['"]\s*\)/g, message: 'Direct fs access is not allowed' },
      { pattern: /process\.exit/g, message: 'process.exit() is not allowed' },
    ];

    for (const { pattern, message } of dangerousPatterns) {
      if (pattern.test(driverCode)) {
        errors.push(`Security: ${message}`);
      }
    }

    // Try to parse as JavaScript (syntax check)
    try {
      // This is a simple check - in production, use a proper parser like @babel/parser
      new Function(driverCode);
    } catch (syntaxError) {
      errors.push(`Syntax error: ${syntaxError.message}`);
    }

    // Warnings for best practices
    if (!driverCode.includes('try') && !driverCode.includes('catch')) {
      warnings.push('Consider adding try-catch blocks for error handling');
    }

    if (!driverCode.includes('console.log') && !driverCode.includes('console.error')) {
      warnings.push('Consider adding logging for debugging');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };

  } catch (error) {
    return {
      valid: false,
      errors: [`Validation error: ${error.message}`],
      warnings
    };
  }
}

/**
 * Save generated driver to database
 */
async function saveDriver(driverData) {
  const {
    integrator_id,
    name,
    device_type,
    manufacturer,
    model,
    protocol_type,
    connection_config,
    driver_code,
    commands,
    description,
    ai_prompt,
    ai_provider,
    ai_model,
    ai_tokens_used,
    ai_cost_usd,
    protocol_notes
  } = driverData;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Insert driver
    const driverResult = await client.query(
      `INSERT INTO device_drivers (
        integrator_id, name, device_type, manufacturer, model, version,
        protocol_type, connection_config, driver_code, protocol_documentation,
        description, ai_prompt, ai_provider, ai_model, ai_tokens_used,
        ai_cost_usd, generation_timestamp, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), $17)
      RETURNING id`,
      [
        integrator_id, name, device_type, manufacturer, model, '1.0.0',
        protocol_type, connection_config, driver_code, protocol_notes,
        description, ai_prompt, ai_provider, ai_model, ai_tokens_used,
        ai_cost_usd, 'draft'
      ]
    );

    const driverId = driverResult.rows[0].id;

    // Insert commands
    if (commands && commands.length > 0) {
      for (const cmd of commands) {
        await client.query(
          `INSERT INTO driver_commands (
            driver_id, command_name, command_type, display_name,
            protocol_template, example_command, parameters,
            expected_response, control_type, description
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            driverId,
            cmd.name,
            cmd.type || 'set',
            cmd.display_name || cmd.name,
            cmd.protocol_template,
            cmd.example,
            cmd.parameters || {},
            cmd.expected_response,
            cmd.control_type,
            cmd.description
          ]
        );
      }
    }

    await client.query('COMMIT');

    return driverId;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get driver with commands
 */
async function getDriver(driverId) {
  const driverResult = await pool.query(
    'SELECT * FROM device_drivers WHERE id = $1',
    [driverId]
  );

  if (driverResult.rows.length === 0) {
    return null;
  }

  const driver = driverResult.rows[0];

  // Get commands
  const commandsResult = await pool.query(
    'SELECT * FROM driver_commands WHERE driver_id = $1 ORDER BY command_name',
    [driverId]
  );

  driver.commands = commandsResult.rows;

  return driver;
}

/**
 * List drivers for an integrator
 */
async function listDrivers(integratorId, filters = {}) {
  let query = `
    SELECT d.*,
           COUNT(DISTINCT dd.controller_id) as deployment_count
    FROM device_drivers d
    LEFT JOIN driver_deployments dd ON d.id = dd.driver_id AND dd.deployment_status = 'active'
    WHERE d.integrator_id = $1
  `;

  const params = [integratorId];
  let paramCount = 1;

  if (filters.status) {
    paramCount++;
    query += ` AND d.status = $${paramCount}`;
    params.push(filters.status);
  }

  if (filters.protocol_type) {
    paramCount++;
    query += ` AND d.protocol_type = $${paramCount}`;
    params.push(filters.protocol_type);
  }

  query += ' GROUP BY d.id ORDER BY d.created_at DESC';

  if (filters.limit) {
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(filters.limit);
  }

  const result = await pool.query(query, params);
  return result.rows;
}

module.exports = {
  generateDriver,
  validateDriverCode,
  saveDriver,
  getDriver,
  listDrivers,
  BASE_DRIVER_INTERFACE,
  EXAMPLE_DRIVERS
};
