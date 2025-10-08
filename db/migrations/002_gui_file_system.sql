-- ============================================
-- GUI FILE SYSTEM MIGRATION
-- ============================================
-- Purpose: Support file-based GUI storage with draft/deployed states
-- Sprint: 5 Week 1
-- Date: October 8, 2025

-- ============================================
-- GUI FILES TABLE (Draft and Deployed states)
-- ============================================
CREATE TABLE gui_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    controller_id UUID NOT NULL REFERENCES controllers(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    state VARCHAR(20) NOT NULL CHECK (state IN ('draft', 'deployed')),
    content JSONB NOT NULL,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by VARCHAR(100),
    UNIQUE(controller_id, file_path, state)
);

-- ============================================
-- GUI FILE VERSIONS TABLE (Version snapshots)
-- ============================================
CREATE TABLE gui_file_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    controller_id UUID NOT NULL REFERENCES controllers(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    state VARCHAR(20) NOT NULL CHECK (state IN ('deployed', 'live')),
    files JSONB NOT NULL,
    commit_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    UNIQUE(controller_id, version_number)
);

-- ============================================
-- SYNC HISTORY TABLE (Track sync operations)
-- ============================================
CREATE TABLE sync_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    controller_id UUID NOT NULL REFERENCES controllers(id) ON DELETE CASCADE,
    version_number INTEGER,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    files_synced INTEGER,
    error_message TEXT,
    triggered_by VARCHAR(100)
);

-- ============================================
-- AI USAGE TRACKING TABLE (Monitor AI costs)
-- ============================================
CREATE TABLE ai_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integrator_id UUID NOT NULL REFERENCES integrators(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    request_type VARCHAR(50) NOT NULL,
    tokens_used INTEGER,
    cost_usd DECIMAL(10, 4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- AI API KEYS TABLE (BYOK - Bring Your Own Key)
-- ============================================
CREATE TABLE ai_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integrator_id UUID NOT NULL REFERENCES integrators(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP,
    UNIQUE(integrator_id, provider)
);

-- ============================================
-- AI METRICS TABLE (Provider reliability tracking)
-- ============================================
CREATE TABLE ai_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(50) NOT NULL,
    success BOOLEAN NOT NULL,
    response_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- IMAGES TABLE (Cloudflare R2 assets)
-- ============================================
CREATE TABLE images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integrator_id UUID NOT NULL REFERENCES integrators(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    storage_url TEXT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES for Performance
-- ============================================
CREATE INDEX idx_gui_files_controller_state ON gui_files(controller_id, state);
CREATE INDEX idx_gui_files_path ON gui_files(controller_id, file_path);
CREATE INDEX idx_gui_files_modified ON gui_files(modified_at DESC);

CREATE INDEX idx_versions_controller ON gui_file_versions(controller_id, version_number DESC);
CREATE INDEX idx_versions_created ON gui_file_versions(created_at DESC);

CREATE INDEX idx_sync_history_controller ON sync_history(controller_id, started_at DESC);
CREATE INDEX idx_sync_history_status ON sync_history(status, started_at DESC);

CREATE INDEX idx_ai_usage_integrator ON ai_usage(integrator_id, created_at DESC);
CREATE INDEX idx_ai_usage_provider ON ai_usage(provider, created_at DESC);

CREATE INDEX idx_ai_keys_integrator ON ai_api_keys(integrator_id, provider);

CREATE INDEX idx_ai_metrics_provider ON ai_metrics(provider, created_at DESC);
CREATE INDEX idx_ai_metrics_success ON ai_metrics(success, created_at DESC);

CREATE INDEX idx_images_integrator ON images(integrator_id, created_at DESC);
CREATE INDEX idx_images_filename ON images(filename);

-- ============================================
-- UPDATED_AT Trigger for gui_files
-- ============================================
CREATE TRIGGER update_gui_files_modified_at BEFORE UPDATE ON gui_files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS for Documentation
-- ============================================
COMMENT ON TABLE gui_files IS 'Stores GUI configuration files in draft and deployed states';
COMMENT ON COLUMN gui_files.state IS 'Either draft (AI workspace) or deployed (stable version ready to sync)';
COMMENT ON COLUMN gui_files.content IS 'JSON content of the GUI file (pages, components, etc.)';

COMMENT ON TABLE gui_file_versions IS 'Version snapshots created on deploy for rollback capability';
COMMENT ON COLUMN gui_file_versions.state IS 'Either deployed (cloud version) or live (running on NUC)';
COMMENT ON COLUMN gui_file_versions.files IS 'Complete snapshot of all files at this version';

COMMENT ON TABLE sync_history IS 'Tracks all sync operations from cloud to NUC controllers';
COMMENT ON COLUMN sync_history.status IS 'pending → in_progress → completed/failed';

COMMENT ON TABLE ai_usage IS 'Tracks AI API usage for billing and rate limiting';
COMMENT ON TABLE ai_api_keys IS 'Stores encrypted BYOK (Bring Your Own Key) API keys';
COMMENT ON TABLE ai_metrics IS 'Monitors AI provider reliability and performance';
COMMENT ON TABLE images IS 'Tracks images stored in Cloudflare R2';
