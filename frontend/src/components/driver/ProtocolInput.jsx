import { useState } from 'react';

export default function ProtocolInput({ onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    deviceType: '',
    manufacturer: '',
    model: '',
    protocolType: 'tcp',
    description: '',
    examples: '',
    documentation: '',
    provider: 'gemini',
    connectionConfig: {
      host: '192.168.1.100',
      port: ''
    }
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [useExistingDriver, setUseExistingDriver] = useState(false);
  const [existingDriverCode, setExistingDriverCode] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('config.')) {
      const configKey = name.split('.')[1];
      setFormData({
        ...formData,
        connectionConfig: {
          ...formData.connectionConfig,
          [configKey]: value
        }
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.deviceType) {
      alert('Please fill in all required fields');
      return;
    }

    // If using existing driver code
    if (useExistingDriver) {
      if (!existingDriverCode.trim()) {
        alert('Please paste the driver code');
        return;
      }
      onSubmit({
        ...formData,
        existingDriverCode,
        skipAI: true
      });
      return;
    }

    // AI generation path - require description
    if (!formData.description) {
      alert('Please fill in the protocol description');
      return;
    }

    // Clean up connection config based on protocol
    const connectionConfig = { ...formData.connectionConfig };
    if (formData.protocolType === 'serial') {
      connectionConfig.baudRate = parseInt(connectionConfig.baudRate) || 9600;
      delete connectionConfig.host;
      delete connectionConfig.port;
    } else if (formData.protocolType === 'http' || formData.protocolType === 'websocket') {
      connectionConfig.url = `${formData.protocolType}://${connectionConfig.host}:${connectionConfig.port || 80}`;
    } else {
      connectionConfig.port = parseInt(connectionConfig.port) || 23;
    }

    onSubmit({
      ...formData,
      connectionConfig
    });
  };

  const protocolTemplates = {
    tcp: {
      description: 'TCP device on port 23. Commands format: SET {param} {value}\\r\\n. Response: OK or ERROR.',
      examples: 'SET VOLUME 75\nGET STATUS\nSET MUTE 1',
      port: '23'
    },
    udp: {
      description: 'UDP device on port 5000. Commands: ROUTE {input} {output}. Response: OK.',
      examples: 'ROUTE 1 3\nROUTE 5 2\nSTATUS',
      port: '5000'
    },
    serial: {
      description: 'Serial device at 9600 baud. Commands: V{channel}:{value}. Response: ACK.',
      examples: 'V1:75\nV2:50\nS?',
      port: '/dev/ttyUSB0'
    },
    http: {
      description: 'HTTP REST API. POST /api/control with JSON body. Returns JSON response.',
      examples: '{"command": "set_volume", "value": 75}\n{"command": "get_status"}',
      port: '80'
    }
  };

  const loadTemplate = (protocol) => {
    const template = protocolTemplates[protocol];
    if (template) {
      setFormData({
        ...formData,
        protocolType: protocol,
        description: formData.description || template.description,
        examples: formData.examples || template.examples,
        connectionConfig: {
          ...formData.connectionConfig,
          port: template.port
        }
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Basic Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Driver Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Biamp Audia DSP"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Device Type <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="deviceType"
              value={formData.deviceType}
              onChange={handleChange}
              placeholder="e.g., biamp_audia"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Lowercase, underscores only
            </p>
          </div>

          {showAdvanced && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Manufacturer
                </label>
                <input
                  type="text"
                  name="manufacturer"
                  value={formData.manufacturer}
                  onChange={handleChange}
                  placeholder="e.g., Biamp Systems"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Model
                </label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  placeholder="e.g., Audia Flex"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}
        </div>

        {!showAdvanced && (
          <button
            type="button"
            onClick={() => setShowAdvanced(true)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            + Show advanced fields
          </button>
        )}
      </div>

      {/* Protocol Configuration */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Protocol Configuration
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Protocol Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {['tcp', 'udp', 'serial', 'http', 'websocket', 'mqtt'].map((protocol) => (
              <button
                key={protocol}
                type="button"
                onClick={() => loadTemplate(protocol)}
                className={`
                  px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all
                  ${formData.protocolType === protocol
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300'
                  }
                `}
              >
                {protocol.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formData.protocolType !== 'serial' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Host/IP Address
                </label>
                <input
                  type="text"
                  name="config.host"
                  value={formData.connectionConfig.host}
                  onChange={handleChange}
                  placeholder="192.168.1.100"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Port
                </label>
                <input
                  type="text"
                  name="config.port"
                  value={formData.connectionConfig.port}
                  onChange={handleChange}
                  placeholder="23"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Serial Port
                </label>
                <input
                  type="text"
                  name="config.port"
                  value={formData.connectionConfig.port}
                  onChange={handleChange}
                  placeholder="/dev/ttyUSB0 or COM1"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Baud Rate
                </label>
                <select
                  name="config.baudRate"
                  value={formData.connectionConfig.baudRate || '9600'}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {[9600, 19200, 38400, 57600, 115200].map((rate) => (
                    <option key={rate} value={rate}>{rate}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Driver Source
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {useExistingDriver
                ? 'Paste existing driver code to skip AI generation'
                : 'Let AI generate the driver from protocol description'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setUseExistingDriver(!useExistingDriver)}
            className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg
                       hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm font-medium
                       text-gray-700 dark:text-gray-300"
          >
            {useExistingDriver ? '← Use AI Generation' : 'Paste Existing Code →'}
          </button>
        </div>
      </div>

      {/* Existing Driver Code Input */}
      {useExistingDriver && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Paste Driver Code
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Driver Code (JavaScript) <span className="text-red-500">*</span>
            </label>
            <textarea
              value={existingDriverCode}
              onChange={(e) => setExistingDriverCode(e.target.value)}
              rows={20}
              placeholder="const BaseDriver = require('./base-driver');
const net = require('net');

class MyDriver extends BaseDriver {
  constructor(config) {
    super(config);
    // ... your driver code
  }

  async connect() {
    // ...
  }

  async disconnect() {
    // ...
  }

  async setControl(control, value) {
    // ...
  }
}

module.exports = MyDriver;"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              required={useExistingDriver}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Paste complete driver code that extends BaseDriver and implements all required methods
            </p>
          </div>
        </div>
      )}

      {/* Protocol Description - Only show for AI generation */}
      {!useExistingDriver && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Protocol Description
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              How does the protocol work? <span className="text-red-500">*</span>
            </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={6}
            placeholder="Describe the protocol in plain English. Example:
The device uses TCP on port 23. Commands are text-based with \r\n line endings.
Format: SET <attribute_code> <channel> <value>
Response: +OK or -ERR
Example: SET 1 1 -20 sets channel 1 gain to -20dB"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Be as detailed as possible. Include command format, response format, line endings, etc.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Command Examples (Optional but recommended)
          </label>
          <textarea
            name="examples"
            value={formData.examples}
            onChange={handleChange}
            rows={4}
            placeholder="Example commands (one per line):
SET GAIN MASTER -24
GET STATUS
SET MUTE 1"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
        </div>

        {showAdvanced && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Protocol Documentation (Optional)
            </label>
            <textarea
              name="documentation"
              value={formData.documentation}
              onChange={handleChange}
              rows={8}
              placeholder="Paste full protocol documentation here if available..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>
        )}
        </div>
      )}

      {/* AI Provider Selection - Only show for AI generation */}
      {!useExistingDriver && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            AI Provider
          </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Choose AI Provider
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { value: 'gemini', name: 'Gemini 2.0 Flash', cost: 'FREE', recommended: 'Testing' },
              { value: 'claude', name: 'Claude 3.5 Sonnet', cost: '$0.05-$0.30', recommended: 'Production' },
              { value: 'openai', name: 'GPT-4 Turbo', cost: '$0.20-$0.60', recommended: 'Complex' }
            ].map((provider) => (
              <button
                key={provider.value}
                type="button"
                onClick={() => setFormData({ ...formData, provider: provider.value })}
                className={`
                  p-4 rounded-lg border-2 text-left transition-all
                  ${formData.provider === provider.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700'
                  }
                `}
              >
                <div className="font-semibold text-gray-900 dark:text-white">
                  {provider.name}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                  {provider.cost}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Best for: {provider.recommended}
                </div>
              </button>
            ))}
          </div>
        </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          type="submit"
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                     dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors
                     font-medium flex items-center gap-2"
        >
          {useExistingDriver ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Save Driver Code
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate Driver with AI
            </>
          )}
        </button>
      </div>
    </form>
  );
}
