-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- INTEGRATORS TABLE (Multi-tenant root)
-- ============================================
CREATE TABLE integrators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    subscription_tier VARCHAR(50) DEFAULT 'free',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PROJECTS TABLE (Customer sites)
-- ============================================
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integrator_id UUID NOT NULL REFERENCES integrators(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255),
    location TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CONTROLLERS TABLE (Physical NUCs)
-- ============================================
CREATE TABLE controllers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    connection_key VARCHAR(255) UNIQUE NOT NULL,
    last_seen TIMESTAMP,
    status VARCHAR(50) DEFAULT 'offline',
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- DEVICES TABLE (AV equipment)
-- ============================================
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    controller_id UUID NOT NULL REFERENCES controllers(id) ON DELETE CASCADE,
    device_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    connection_config JSONB,
    status VARCHAR(50) DEFAULT 'unknown',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(controller_id, device_id)
);

-- ============================================
-- DEVICE CONTROLS TABLE (The mapping layer)
-- ============================================
CREATE TABLE device_controls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    control_id VARCHAR(100) NOT NULL,
    logical_name VARCHAR(255) NOT NULL,
    control_type VARCHAR(50) NOT NULL,
    block_id VARCHAR(255) NOT NULL,
    parameters JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(device_id, control_id)
);

-- ============================================
-- SCENES TABLE (Automation sequences)
-- ============================================
CREATE TABLE scenes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    controller_id UUID NOT NULL REFERENCES controllers(id) ON DELETE CASCADE,
    scene_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    steps JSONB NOT NULL,
    continue_on_error BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(controller_id, scene_id)
);

-- ============================================
-- INDEXES for Performance
-- ============================================
CREATE INDEX idx_projects_integrator ON projects(integrator_id);
CREATE INDEX idx_controllers_project ON controllers(project_id);
CREATE INDEX idx_controllers_status ON controllers(status);
CREATE INDEX idx_controllers_last_seen ON controllers(last_seen);
CREATE INDEX idx_controllers_key ON controllers(connection_key);
CREATE INDEX idx_devices_controller ON devices(controller_id);
CREATE INDEX idx_devices_device_id ON devices(device_id, controller_id);
CREATE INDEX idx_controls_device ON device_controls(device_id);
CREATE INDEX idx_controls_control_id ON device_controls(control_id, device_id);
CREATE INDEX idx_scenes_controller ON scenes(controller_id);

-- ============================================
-- UPDATED_AT Trigger Function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
CREATE TRIGGER update_integrators_updated_at BEFORE UPDATE ON integrators
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_controllers_updated_at BEFORE UPDATE ON controllers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_device_controls_updated_at BEFORE UPDATE ON device_controls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scenes_updated_at BEFORE UPDATE ON scenes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();