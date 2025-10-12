-- ============================================
-- DRIVER MANAGEMENT SYSTEM MIGRATION
-- ============================================
-- Purpose: Support AI-assisted device driver creation and deployment
-- Feature: Allow integrators to create custom drivers with AI help
-- Date: October 13, 2025
--
-- This migration adds tables for:
-- - Device driver templates (AI-generated driver code)
-- - Driver commands and protocol specifications
-- - Driver deployments to controllers
-- - Driver test results and validation

-- ============================================
-- DEVICE DRIVERS TABLE
-- ============================================
-- Stores AI-generated device driver templates
CREATE TABLE device_drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integrator_id UUID NOT NULL REFERENCES integrators(id) ON DELETE CASCADE,

    -- Driver identification
    name VARCHAR(255) NOT NULL,
    device_type VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    version VARCHAR(50) NOT NULL DEFAULT '1.0.0',

    -- Driver status
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'testing', 'validated', 'production', 'deprecated')),

    -- Protocol configuration
    protocol_type VARCHAR(50) NOT NULL CHECK (protocol_type IN ('tcp', 'udp', 'serial', 'http', 'websocket', 'mqtt')),
    connection_config JSONB NOT NULL, -- {host, port, baud_rate, timeout, etc}

    -- Driver implementation
    driver_code TEXT NOT NULL, -- Complete JavaScript driver class
    base_driver_version VARCHAR(50) DEFAULT '1.0.0', -- Version of BaseDriver it extends

    -- Protocol specifications
    protocol_documentation TEXT, -- User-uploaded protocol docs
    command_format TEXT, -- General command format template
    response_format TEXT, -- Expected response format
    delimiter VARCHAR(20), -- Command delimiter (e.g., "\r\n", "\n", etc)

    -- AI generation metadata
    ai_prompt TEXT, -- Original prompt used to generate the driver
    ai_provider VARCHAR(50), -- claude, openai, gemini
    ai_model VARCHAR(100), -- Specific model used
    ai_tokens_used INTEGER, -- Total tokens consumed
    ai_cost_usd DECIMAL(10, 4), -- Cost of generation
    generation_timestamp TIMESTAMP,

    -- Validation and testing
    is_validated BOOLEAN DEFAULT FALSE,
    last_tested_at TIMESTAMP,
    test_results JSONB, -- Test execution results

    -- Metadata
    description TEXT,
    notes TEXT, -- Integrator notes
    tags TEXT[], -- Searchable tags
    is_public BOOLEAN DEFAULT FALSE, -- Share with other integrators

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES integrators(id),

    UNIQUE(integrator_id, device_type, version)
);

-- ============================================
-- DRIVER COMMANDS TABLE
-- ============================================
-- Defines individual commands supported by a driver
CREATE TABLE driver_commands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES device_drivers(id) ON DELETE CASCADE,

    -- Command identification
    command_name VARCHAR(100) NOT NULL,
    command_type VARCHAR(50) NOT NULL CHECK (command_type IN ('set', 'get', 'subscribe', 'action')),
    display_name VARCHAR(255), -- User-friendly name

    -- Command structure
    protocol_template TEXT NOT NULL, -- e.g., "SET {block_id} {value}\r\n"
    example_command TEXT, -- e.g., "SET GAIN_1 -24\r\n"

    -- Parameters
    parameters JSONB, -- Parameter definitions with validation rules
    /*
    Example:
    {
      "block_id": {
        "type": "string",
        "required": true,
        "description": "DSP block identifier"
      },
      "value": {
        "type": "number",
        "required": true,
        "min": -80,
        "max": 12,
        "description": "Gain in dB"
      }
    }
    */

    -- Response handling
    expected_response TEXT, -- Expected response pattern
    response_parser TEXT, -- JavaScript function to parse response
    timeout_ms INTEGER DEFAULT 3000,

    -- Validation rules
    validation_rules JSONB,
    /*
    Example:
    {
      "min_value": -80,
      "max_value": 12,
      "allowed_values": ["on", "off"],
      "regex_pattern": "^[A-Z0-9_]+$"
    }
    */

    -- Control type mapping
    control_type VARCHAR(50), -- gain, mute, route, etc.
    maps_to_control_type BOOLEAN DEFAULT FALSE,

    -- Documentation
    description TEXT,
    usage_notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(driver_id, command_name)
);

-- ============================================
-- DRIVER DEPLOYMENTS TABLE
-- ============================================
-- Tracks which drivers are deployed to which controllers
CREATE TABLE driver_deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES device_drivers(id) ON DELETE RESTRICT,
    controller_id UUID NOT NULL REFERENCES controllers(id) ON DELETE CASCADE,

    -- Deployment tracking
    deployed_version VARCHAR(50) NOT NULL,
    deployment_status VARCHAR(50) DEFAULT 'pending' CHECK (deployment_status IN ('pending', 'syncing', 'active', 'failed', 'inactive')),

    -- Sync information
    sync_id UUID, -- References sync operation
    sync_status VARCHAR(50),
    sync_error_message TEXT,

    -- Version on NUC
    nuc_driver_path TEXT, -- Path where driver is stored on NUC
    nuc_checksum VARCHAR(64), -- SHA256 checksum of deployed code

    -- Timestamps
    deployed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deployed_by UUID REFERENCES integrators(id),
    last_synced_at TIMESTAMP,
    activated_at TIMESTAMP,
    deactivated_at TIMESTAMP,

    -- Performance metrics
    uptime_seconds BIGINT DEFAULT 0,
    commands_executed INTEGER DEFAULT 0,
    last_error TEXT,
    last_error_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(controller_id, driver_id)
);

-- ============================================
-- DRIVER TEST RESULTS TABLE
-- ============================================
-- Stores results from driver testing (both cloud simulation and live testing)
CREATE TABLE driver_test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES device_drivers(id) ON DELETE CASCADE,
    test_run_id UUID NOT NULL, -- Groups tests from same run

    -- Test configuration
    test_type VARCHAR(50) NOT NULL CHECK (test_type IN ('syntax', 'simulation', 'live_device', 'integration')),
    test_environment VARCHAR(50) CHECK (test_environment IN ('cloud', 'nuc', 'staging')),

    -- Test execution
    command_tested VARCHAR(100),
    test_input JSONB, -- Input parameters used
    expected_output TEXT,
    actual_output TEXT,

    -- Results
    test_status VARCHAR(50) NOT NULL CHECK (test_status IN ('passed', 'failed', 'error', 'skipped')),
    success BOOLEAN,
    error_message TEXT,
    execution_time_ms INTEGER,

    -- Device connection (for live tests)
    test_device_host VARCHAR(255),
    test_device_port INTEGER,

    -- Metadata
    tested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tested_by UUID REFERENCES integrators(id),
    notes TEXT
);

-- ============================================
-- DRIVER VERSIONS TABLE
-- ============================================
-- Track version history of drivers
CREATE TABLE driver_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES device_drivers(id) ON DELETE CASCADE,
    version_number VARCHAR(50) NOT NULL,

    -- Version snapshot
    driver_code TEXT NOT NULL,
    command_mappings JSONB NOT NULL,
    protocol_config JSONB NOT NULL,

    -- Change tracking
    change_description TEXT,
    changes_made TEXT[], -- List of changes
    breaking_changes BOOLEAN DEFAULT FALSE,

    -- Version metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES integrators(id),
    is_stable BOOLEAN DEFAULT FALSE,

    UNIQUE(driver_id, version_number)
);

-- ============================================
-- DRIVER TEMPLATES TABLE (Community/Platform)
-- ============================================
-- Pre-built driver templates for common devices
CREATE TABLE driver_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Template identification
    name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255) NOT NULL,
    device_model VARCHAR(255),
    category VARCHAR(100), -- dsp, matrix, lighting, display, etc.

    -- Template type
    template_type VARCHAR(50) DEFAULT 'community' CHECK (template_type IN ('official', 'community', 'verified')),

    -- Driver content
    driver_code_template TEXT NOT NULL,
    protocol_type VARCHAR(50) NOT NULL,
    default_config JSONB NOT NULL,
    command_templates JSONB NOT NULL,

    -- Documentation
    description TEXT,
    setup_instructions TEXT,
    documentation_url TEXT,

    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    rating DECIMAL(3, 2), -- Average rating

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID, -- NULL for platform templates
    is_published BOOLEAN DEFAULT FALSE,

    UNIQUE(manufacturer, device_model)
);

-- ============================================
-- INDEXES for Performance
-- ============================================
CREATE INDEX idx_drivers_integrator ON device_drivers(integrator_id, status);
CREATE INDEX idx_drivers_type ON device_drivers(device_type, protocol_type);
CREATE INDEX idx_drivers_status ON device_drivers(status, created_at DESC);
CREATE INDEX idx_drivers_validated ON device_drivers(is_validated, status);
CREATE INDEX idx_drivers_tags ON device_drivers USING GIN(tags);

CREATE INDEX idx_commands_driver ON driver_commands(driver_id, command_type);
CREATE INDEX idx_commands_type ON driver_commands(command_type, control_type);

CREATE INDEX idx_deployments_controller ON driver_deployments(controller_id, deployment_status);
CREATE INDEX idx_deployments_driver ON driver_deployments(driver_id, deployment_status);
CREATE INDEX idx_deployments_status ON driver_deployments(deployment_status, last_synced_at DESC);
CREATE INDEX idx_deployments_active ON driver_deployments(deployment_status) WHERE deployment_status = 'active';

CREATE INDEX idx_test_results_driver ON driver_test_results(driver_id, tested_at DESC);
CREATE INDEX idx_test_results_run ON driver_test_results(test_run_id, test_status);
CREATE INDEX idx_test_results_status ON driver_test_results(test_status, tested_at DESC);

CREATE INDEX idx_driver_versions_driver ON driver_versions(driver_id, version_number DESC);
CREATE INDEX idx_driver_versions_stable ON driver_versions(is_stable, created_at DESC);

CREATE INDEX idx_templates_category ON driver_templates(category, template_type);
CREATE INDEX idx_templates_manufacturer ON driver_templates(manufacturer, device_model);
CREATE INDEX idx_templates_published ON driver_templates(is_published, usage_count DESC);

-- ============================================
-- UPDATED_AT Triggers
-- ============================================
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON device_drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commands_updated_at BEFORE UPDATE ON driver_commands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deployments_updated_at BEFORE UPDATE ON driver_deployments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON driver_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS for Documentation
-- ============================================
COMMENT ON TABLE device_drivers IS 'Stores AI-generated custom device drivers created by integrators';
COMMENT ON COLUMN device_drivers.status IS 'Driver lifecycle: draft → testing → validated → production';
COMMENT ON COLUMN device_drivers.driver_code IS 'Complete JavaScript driver class extending BaseDriver';
COMMENT ON COLUMN device_drivers.protocol_type IS 'Communication protocol: tcp, udp, serial, http, websocket, mqtt';

COMMENT ON TABLE driver_commands IS 'Individual commands supported by each driver with protocol templates';
COMMENT ON COLUMN driver_commands.protocol_template IS 'Command format with placeholders like "SET {block_id} {value}\r\n"';
COMMENT ON COLUMN driver_commands.parameters IS 'JSON schema for command parameters with validation rules';

COMMENT ON TABLE driver_deployments IS 'Tracks which drivers are deployed to which controllers';
COMMENT ON COLUMN driver_deployments.deployment_status IS 'pending → syncing → active/failed';

COMMENT ON TABLE driver_test_results IS 'Stores validation and testing results for drivers';
COMMENT ON COLUMN driver_test_results.test_type IS 'syntax (code validation), simulation (mock device), live_device (real hardware)';

COMMENT ON TABLE driver_versions IS 'Version history for drivers to enable rollback';

COMMENT ON TABLE driver_templates IS 'Pre-built driver templates for common devices (community and official)';
COMMENT ON COLUMN driver_templates.template_type IS 'official (platform), community (user-contributed), verified (tested by platform)';

-- ============================================
-- Initial Data: Base Driver Interface Definition
-- ============================================
-- This is metadata about the BaseDriver that AI will reference
INSERT INTO driver_templates (
    id,
    name,
    manufacturer,
    device_model,
    category,
    template_type,
    driver_code_template,
    protocol_type,
    default_config,
    command_templates,
    description,
    is_published
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'TCP Generic Device',
    'Generic',
    'TCP Device',
    'generic',
    'official',
    '// Base TCP driver template - AI will expand this
const BaseDriver = require(''./base-driver'');
const net = require(''net'');

class TCPDeviceDriver extends BaseDriver {
  constructor(config) {
    super(config);
    this.host = config.host;
    this.port = config.port || 23;
    this.socket = null;
  }

  async connect() {
    // Implementation here
  }

  async disconnect() {
    // Implementation here
  }

  async setControl(control, value) {
    // Implementation here
  }
}

module.exports = TCPDeviceDriver;',
    'tcp',
    '{"host": "192.168.1.100", "port": 23, "timeout": 3000}',
    '{"set": "SET {param} {value}\\r\\n", "get": "GET {param}\\r\\n"}',
    'Generic TCP device driver template for AI generation',
    TRUE
);

-- ============================================
-- Migration Complete
-- ============================================
