# AI-Programmable AV Control System - Complete Technical Reference

**Document Type:** Complete Technical Context Reference  
**Purpose:** Provide full project context for AI assistance in development  
**Audience:** Claude Code, AI development assistants, future developers  
**Last Updated:** October 7, 2025  
**Architecture Version:** 2.0 (File-Based GUI with Manual Sync)

---

## Executive Summary

This is a cloud-connected control system that enables non-technical users to program professional AV and building automation equipment using natural language conversations with AI via a cloud-based multi-provider AI service.

**Core Innovation:** Users describe desired automation and GUI layouts in plain English ("make a GUI with volume sliders for each zone"), and the system translates this to complete touch panel interfaces and precise hardware commands without requiring knowledge of control system programming, device-specific protocols, or hardware identifiers.

**Architecture:** Two-tier system with cloud programming interface (Railway) and on-premise runtime controllers (NUC running LMDE Linux). GUI configurations stored as individual JSON files with three-state deployment model (DRAFT → DEPLOYED → LIVE).

**Target Users:** AV integrators, system integrators, facility managers managing multiple installations.

---

## System Architecture Overview

### High-Level Structure

```
┌────────────────────────────────────────────────────────┐
│                   CLOUD TIER                           │
│                (Railway Platform)                      │
│                                                        │
│  ┌────────────────────────────────────────────────┐   │
│  │  DRAFT FILES (AI Workspace)                    │   │
│  │  /storage/controllers/{id}/draft/              │   │
│  │    ├── gui/ (pages, components)                │   │
│  │    └── scenes/                                 │   │
│  └────────────────────────────────────────────────┘   │
│                          ↓                             │
│                  [Deploy Button]                       │
│                          ↓                             │
│  ┌────────────────────────────────────────────────┐   │
│  │  DEPLOYED FILES (Stable Version)               │   │
│  │  /storage/controllers/{id}/deployed/           │   │
│  │  + Version Snapshots                           │   │
│  └────────────────────────────────────────────────┘   │
│                          ↓                             │
│            [Sync to Controller Button]                 │
│                          ↓                             │
│  PostgreSQL Database (multi-tenant)                    │
│  Backend API (Node.js + Express)                       │
│  AI Service (Multi-provider)                           │
│  Frontend (React SPA)                                  │
│  Image Storage (Cloudflare R2)                         │
│                                                        │
└───────────────────┬────────────────────────────────────┘
                    │
         Secure WebSocket (wss://)
         Persistent connection
         Manual sync trigger
                    │
                    ↓
┌────────────────────────────────────────────────────────┐
│              ON-PREMISE CONTROLLER TIER                │
│              (GMKtec NUC + LMDE Linux)                 │
│                                                        │
│  Sync Client (WebSocket consumer)                      │
│  SQLite Cache (mirrored config)                        │
│  Runtime Engine (scene executor)                       │
│  Device Driver Manager (plugin loader)                 │
│  Device Drivers (Harvey DSP, matrices, etc.)           │
│  GUI Server (local web interface - port 3000)          │
│  Admin Server (diagnostics - port 3001)                │
│  Image Cache (downloaded assets)                       │
│                                                        │
│  ┌────────────────────────────────────────────────┐   │
│  │  LIVE FILES                                    │   │
│  │  /opt/control-system/var/gui-files/            │   │
│  │    ├── gui/ (rendered on port 3000)            │   │
│  │    └── scenes/                                 │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
└───────────────────┬────────────────────────────────────┘
                    │
         Local Network (TCP/IP, Serial, etc.)
                    │
                    ↓
              Physical Devices
              (Harvey DSP, AV matrices, lighting, etc.)
```

### Architectural Principles

1. **Cloud for Programming, Local for Runtime**
   - Configuration, AI-powered GUI creation happen in cloud
   - Execution happens entirely on-premise
   - Controllers work fully offline after initial sync

2. **Multi-Tenant SaaS Model**
   - Multiple integrator companies share infrastructure
   - Complete data isolation via `integrator_id` filtering
   - Each integrator manages multiple projects/sites

3. **File-Based GUI Storage with Three-State Deployment**
   - DRAFT: AI's workspace (safe experimentation)
   - DEPLOYED: Stable version (ready to sync)
   - LIVE: Running on NUC (users see this)
   - Manual Deploy button (draft → deployed)
   - Manual Sync button (deployed → live)

4. **Device Abstraction Through Mapping**
   - Hardware uses specific IDs (e.g., Harvey DSP block IDs)
   - System uses logical controls ("Conference Room A Volume")
   - Integrators manually map logical → physical during setup
   - AI and users interact only with logical layer

5. **Protocol-Agnostic Plugin Architecture**
   - Drivers implement standard interface
   - Easy to add new device types
   - No vendor lock-in

---

## Core Concepts

### 1. Three-Layer Abstraction Model

**The Problem:** Professional AV equipment uses manufacturer-specific identifiers that users shouldn't need to know.

**Example:** Harvey DSP has internal blocks named "Gain_CRA_Master", "Mute_Room1_Mic", etc.

**The Solution:** Three abstraction layers:

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: USER/AI INTERACTION                           │
│ Language: Natural, descriptive                          │
│ Example: "Conference Room A Volume"                     │
│ Who sees: End users, AI, integrators                    │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 2: SYSTEM MAPPING                                 │
│ Format: control_id → block_id                           │
│ Example: ctrl_001 → Gain_CRA_Master                     │
│ Who sees: Internal system only                          │
│ Stored in: device_controls table                        │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 3: HARDWARE PROTOCOL                              │
│ Format: Device-specific command syntax                  │
│ Example: "SET Gain_CRA_Master -24.8\r\n"                │
│ Who sees: Device drivers only                           │
│ Sent via: TCP socket to hardware IP                     │
└─────────────────────────────────────────────────────────┘
```

### 2. Manual Mapping Process

**Context:** When a Harvey DSP is programmed in Harvey Designer software, the integrator creates processing blocks (gain, matrix, mute, etc.) and assigns them IDs. These IDs are unique per installation and arbitrary.

**Setup Workflow:**
1. Physical installation (integrator programs Harvey DSP)
2. System configuration (cloud interface - add device, create logical controls, manual mapping)
3. Sync to controller (mappings pushed to NUC)

**Why Manual:** Device manufacturers don't provide standard APIs for block enumeration, and block naming is installation-specific.

### 3. Scene-Based Automation

**Definition:** A scene is a sequence of device commands executed in order with optional timing delays.

**Scene Structure:**
```javascript
{
  id: "scene_presentation_mode",
  name: "Presentation Mode",
  description: "Lower screen, start projector, configure audio",
  steps: [
    {
      device: "dsp_main",
      control: "ctrl_volume_a",
      value: 70,
      wait_ms: 0
    },
    {
      device: "dsp_main",
      control: "ctrl_mute_mic",
      value: false,
      wait_ms: 2000
    }
  ],
  continue_on_error: false
}
```

### 4. File-Based GUI Storage (NEW)

**Architecture:** GUI configurations stored as individual JSON files instead of monolithic blobs.

**File Structure:**
```
/storage/controllers/{controller_id}/
├── draft/                          # AI's workspace
│   ├── gui/
│   │   ├── config.json
│   │   ├── pages/
│   │   │   ├── main.json
│   │   │   ├── audio.json
│   │   │   └── video.json
│   │   └── components/
│   │       ├── volume-slider.json
│   │       └── source-selector.json
│   └── scenes/
│       └── presentation-mode.json
│
├── deployed/                       # Stable version
│   └── (same structure)
│
└── versions/                       # History
    ├── v1_2025-10-07/
    ├── v2_2025-10-08/
    └── v3_2025-10-09/
```

**Benefits:**
- AI can analyze complete structure
- Version control built-in
- Easy to backup/restore
- Modular and reusable
- Safe experimentation in draft

### 5. Three-State Deployment Model (NEW)

**States:**
```
DRAFT → DEPLOYED → LIVE
```

**DRAFT:**
- AI modifies these files
- Integrator iterates safely
- Preview shows this version
- Can be discarded
- No impact on production

**DEPLOYED:**
- Stable, tested version
- Ready to sync
- Version number assigned
- Waiting for manual sync trigger

**LIVE:**
- Running on NUC
- Users see this version
- Only updates when sync button clicked
- Previous version available for rollback

**Workflow:**
1. AI modifies draft files
2. Integrator reviews in preview
3. Integrator clicks "Deploy" (draft → deployed, creates version)
4. Integrator clicks "Sync to Controller" (deployed → NUC)
5. NUC receives files, writes to disk, reloads GUI

### 6. Multi-Tenancy Model

**Hierarchy:**
```
Platform (you, the owner)
└─ Integrator (AV company customer)
   └─ Project (end customer site)
      └─ Controller (physical NUC)
         └─ Devices (AV equipment)
            └─ Controls (logical abstractions)
               └─ Block IDs (hardware identifiers)
```

**Data Isolation:**
- Every table has `integrator_id` (directly or via foreign key)
- Every query filters by authenticated user's `integrator_id`
- Impossible to access another integrator's data
- JWT tokens carry `integrator_id` for authentication

### 7. Offline-First Controller Design

**Principle:** On-premise controllers must function without internet connectivity after initial configuration.

**Implementation:**
- Complete configuration mirrored in local SQLite
- GUI files cached locally
- Scene execution is purely local
- Device drivers maintain persistent connections
- GUI served from local web server

**Sync Behavior:**
```
When Online:
├─ Persistent WebSocket to cloud
├─ Receives manual sync triggers
├─ Updates local SQLite cache
├─ Updates local GUI files
└─ Reports status back to cloud

When Offline:
├─ WebSocket disconnects (automatic retry)
├─ All functionality continues using cached data
├─ Scene execution unaffected
├─ GUI continues to work
└─ Reconnects when network available
```

---

## Technology Stack

### Cloud Platform

**Hosting:** Railway.app
- Reason: Supports WebSocket, persistent processes, includes PostgreSQL

**Backend:**
- Language: Node.js 20+
- Framework: Express.js
- Database: PostgreSQL 15+
- Real-time: WebSocket (ws library)
- Authentication: JWT (jsonwebtoken)

**Frontend:**
- Framework: React 18+
- Build: Vite
- Styling: Tailwind CSS
- State: React hooks (useState, useContext)
- API: Fetch + WebSocket

**AI Service:**
- Runtime: Node.js (same as backend)
- Providers: Anthropic (Claude), OpenAI (GPT-4), Google (Gemini)
- SDK: Provider-specific APIs

**Image Storage:**
- Service: Cloudflare R2
- Reason: S3-compatible, free egress
- Access: Direct from cloud, cached on NUC

### On-Premise Controller

**Hardware:** GMKtec G2 Plus NUC or similar
- CPU: Intel N100/N305 (fanless, low power)
- RAM: 8-16GB
- Storage: 128GB SSD/eMMC
- Network: Gigabit Ethernet (required)

**Operating System:** LMDE 6
- Reason: Debian stability + long-term support
- Package manager: apt
- Init system: systemd

**Runtime:**
- Language: Node.js 20+
- Local DB: SQLite3
- Process manager: systemd service
- Logging: journald + local files

**File Structure:**
```
/opt/control-system/
├── src/
│   ├── sync/
│   │   └── client.js          # WebSocket sync
│   ├── database/
│   │   └── db.js              # SQLite manager
│   ├── drivers/
│   │   ├── base-driver.js
│   │   ├── harvey-dsp.js
│   │   └── device-manager.js
│   ├── runtime/
│   │   └── scene-engine.js
│   ├── gui-server/            # Port 3000 (user touch panel)
│   │   ├── server.js
│   │   └── renderer.js
│   ├── admin-server/          # Port 3001 (diagnostics)
│   │   ├── server.js
│   │   ├── system-info.js
│   │   └── log-viewer.js
│   └── index.js
├── var/
│   ├── db/
│   │   └── local-cache.db
│   ├── gui-files/             # Synced from cloud
│   │   ├── gui/
│   │   ├── scenes/
│   │   └── assets/
│   └── logs/
├── .env
└── package.json
```

---

## Database Schema

### PostgreSQL (Cloud)

**Key Tables:**

```sql
-- Integrator companies
CREATE TABLE integrators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  subscription_tier VARCHAR(50) DEFAULT 'free',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Customer sites
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integrator_id UUID REFERENCES integrators(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),
  location TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Physical controllers
CREATE TABLE controllers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  connection_key VARCHAR(255) UNIQUE NOT NULL,
  last_seen TIMESTAMP,
  status VARCHAR(50) DEFAULT 'offline',
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- AV equipment
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  controller_id UUID REFERENCES controllers(id) ON DELETE CASCADE,
  device_id VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  connection_config JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(controller_id, device_id)
);

-- THE CRITICAL MAPPING TABLE
CREATE TABLE device_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  control_id VARCHAR(100) NOT NULL,
  logical_name VARCHAR(255) NOT NULL,
  control_type VARCHAR(50) NOT NULL,
  block_id VARCHAR(255) NOT NULL,
  parameters JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(device_id, control_id)
);

-- Automation sequences
CREATE TABLE scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  controller_id UUID REFERENCES controllers(id) ON DELETE CASCADE,
  scene_id VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  steps JSONB NOT NULL,
  continue_on_error BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(controller_id, scene_id)
);

-- GUI files in different states (NEW - Sprint 9)
CREATE TABLE gui_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  controller_id UUID REFERENCES controllers(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  state VARCHAR(20) NOT NULL,
  content JSONB NOT NULL,
  modified_at TIMESTAMP DEFAULT NOW(),
  modified_by VARCHAR(100),
  UNIQUE(controller_id, file_path, state),
  CHECK (state IN ('draft', 'deployed'))
);

-- Version snapshots (NEW - Sprint 9)
CREATE TABLE gui_file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  controller_id UUID REFERENCES controllers(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  state VARCHAR(20) NOT NULL,
  files JSONB NOT NULL,
  commit_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(100),
  UNIQUE(controller_id, version_number),
  CHECK (state IN ('deployed', 'live'))
);

-- Sync history (NEW - Sprint 9)
CREATE TABLE sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  controller_id UUID REFERENCES controllers(id) ON DELETE CASCADE,
  version_number INTEGER,
  status VARCHAR(20) NOT NULL,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  duration_ms INTEGER,
  files_synced INTEGER,
  error_message TEXT,
  triggered_by VARCHAR(100),
  CHECK (status IN ('pending', 'in_progress', 'completed', 'failed'))
);

-- AI usage tracking (NEW - Sprint 5)
CREATE TABLE ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integrator_id UUID REFERENCES integrators(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  request_type VARCHAR(50) NOT NULL,
  tokens_used INTEGER,
  cost_usd DECIMAL(10, 4),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Encrypted API keys for BYOK (NEW - Sprint 5)
CREATE TABLE ai_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integrator_id UUID REFERENCES integrators(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  UNIQUE(integrator_id, provider)
);

-- AI metrics (NEW - Sprint 5)
CREATE TABLE ai_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL,
  success BOOLEAN NOT NULL,
  response_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Image assets
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integrator_id UUID REFERENCES integrators(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  storage_url TEXT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_projects_integrator ON projects(integrator_id);
CREATE INDEX idx_controllers_project ON controllers(project_id);
CREATE INDEX idx_controllers_status ON controllers(status);
CREATE INDEX idx_controllers_key ON controllers(connection_key);
CREATE INDEX idx_devices_controller ON devices(controller_id);
CREATE INDEX idx_devices_device_id ON devices(device_id, controller_id);
CREATE INDEX idx_controls_device ON device_controls(device_id);
CREATE INDEX idx_controls_control_id ON device_controls(control_id, device_id);
CREATE INDEX idx_scenes_controller ON scenes(controller_id);
CREATE INDEX idx_gui_files_controller_state ON gui_files(controller_id, state);
CREATE INDEX idx_gui_files_path ON gui_files(controller_id, file_path);
CREATE INDEX idx_versions_controller ON gui_file_versions(controller_id, version_number DESC);
CREATE INDEX idx_sync_history_controller ON sync_history(controller_id, started_at DESC);
CREATE INDEX idx_ai_usage_integrator ON ai_usage(integrator_id, created_at DESC);
```

### SQLite (NUC Local Cache)

**Simplified schema mirroring cloud data:**

```sql
-- Metadata
CREATE TABLE config_meta (
  key TEXT PRIMARY KEY,
  value TEXT,
  last_sync TIMESTAMP
);

-- Devices
CREATE TABLE devices (
  device_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  connection_config TEXT NOT NULL,
  config TEXT
);

-- Controls with mappings
CREATE TABLE device_controls (
  control_id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  logical_name TEXT NOT NULL,
  control_type TEXT NOT NULL,
  block_id TEXT NOT NULL,
  parameters TEXT,
  FOREIGN KEY (device_id) REFERENCES devices(device_id)
);

-- Scenes
CREATE TABLE scenes (
  scene_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  steps TEXT NOT NULL,
  continue_on_error INTEGER DEFAULT 0,
  updated_at TIMESTAMP
);

-- GUI file references (NEW)
CREATE TABLE gui_file_cache (
  file_path TEXT PRIMARY KEY,
  local_path TEXT NOT NULL,
  version INTEGER NOT NULL,
  checksum TEXT,
  synced_at TIMESTAMP
);

-- Image cache
CREATE TABLE image_cache (
  filename TEXT PRIMARY KEY,
  local_path TEXT NOT NULL,
  url TEXT NOT NULL,
  checksum TEXT,
  downloaded_at TIMESTAMP
);
```

---

## Communication Protocols

### Cloud ↔ NUC Sync (WebSocket)

**Connection:**
```
URL: wss://cloud-platform.railway.app/sync?key=CONNECTION_KEY
Initiated by: NUC (security - no open ports on NUC)
Authentication: Connection key validated on connect
Heartbeat: Every 30 seconds
Reconnect: Exponential backoff on disconnect
```

**Message Format:**
```javascript
{
  type: "message_type",
  timestamp: "2025-10-07T12:00:00Z",
  data: { /* payload */ }
}
```

**Message Types (Cloud → NUC):**
```javascript
// Configuration updates
{type: "config_update", data: {config_type: "scene_added", scene: {...}}}
{type: "config_update", data: {config_type: "device_updated", device: {...}}}

// GUI sync (MANUAL TRIGGER ONLY)
{
  type: "gui_sync",
  sync_id: "uuid",
  version: 5,
  files: [
    {path: "gui/pages/main.json", content: {...}},
    {path: "gui/pages/audio.json", content: {...}}
  ]
}

// Direct commands
{type: "execute_scene", scene_id: "scene_001", request_id: "req_123"}
```

**Message Types (NUC → Cloud):**
```javascript
// Status reporting
{type: "status_update", data: {devices: [{device_id, status, last_command}]}}
{type: "heartbeat", data: {uptime: 86400, memory_usage: 45}}

// Execution results
{type: "execution_result", request_id: "req_123", success: true, duration_ms: 3500}
{type: "scene_executed", scene_id: "scene_001", success: true, steps: [...]}

// GUI sync progress (NEW)
{
  type: "sync_progress",
  sync_id: "uuid",
  status: "in_progress",
  progress: 45,
  files_synced: 3,
  files_total: 8
}

// Errors
{type: "error", error: "Device connection failed", device_id: "dsp_main"}
```

### NUC ↔ Device Protocols

**Harvey DSP (TCP):**
```
Connection: TCP socket to device IP:port (typically port 23)
Format: Plain text, line-terminated (\r\n)
Persistent: Connection stays open

Commands:
  SET <block_id> <value>\r\n
  GET <block_id>\r\n
  MATRIX <block_id> <input> <output> <state>\r\n

Responses:
  OK\r\n
  ERROR <message>\r\n
  VALUE <value>\r\n

Example:
  → SET Gain_CRA_Master -24.8\r\n
  ← OK\r\n
```

---

## AI Integration Architecture

### Overview

Cloud-based AI service that generates complete GUI layouts from natural language. Supports multiple providers (Claude, OpenAI, Gemini) with both included credits and bring-your-own-key (BYOK) models.

### File-Based AI Workflow

```
1. Integrator chats with AI
   ↓
2. AI reads ALL draft files for context
   ↓
3. AI modifies draft files (creates/updates/deletes)
   ↓
4. Preview updates (shows draft version)
   ↓
5. Integrator iterates with AI (stays in draft)
   ↓
6. Integrator clicks "Deploy" (draft → deployed, version created)
   ↓
7. Integrator clicks "Sync" (deployed → NUC via WebSocket)
   ↓
8. NUC writes files, reloads GUI
   ↓
9. Users see updated interface
```

### AI Service Architecture

**Directory Structure:**
```
/src/ai/
├── service.js              # Main AI orchestrator
├── file-manager.js         # Draft/deployed file operations
├── providers/
│   ├── base.js            # Abstract provider interface
│   ├── claude.js          # Anthropic API
│   ├── openai.js          # OpenAI API
│   └── gemini.js          # Google Gemini API
├── context.js             # File-based context builder
├── prompts.js             # System prompts for GUI generation
├── validator.js           # File-based validator
└── scene-generator.js     # Auto-generate scenes from GUI
```

### AI Provider Interface

```javascript
class BaseAIProvider {
  constructor(apiKey, config) {
    this.apiKey = apiKey;
    this.config = config;
  }
  
  async generateGUI(prompt, context) {
    throw new Error('Must be implemented by subclass');
  }
  
  async streamResponse(prompt, context, onChunk) {
    throw new Error('Must be implemented by subclass');
  }
  
  async estimateTokens(prompt, context) {
    // Return estimated token count
  }
  
  async estimateCost(prompt, context) {
    // Return estimated cost in USD
  }
}
```

### Context Builder

```javascript
class AIContextBuilder {
  async buildContext(controllerId) {
    // Read ALL draft files
    const draftFiles = await this.fileManager.readDraftFiles(controllerId);
    
    // Get devices and controls from database
    const devices = await this.db.getDevices(controllerId);
    const controls = await this.db.getControls(controllerId);
    
    return {
      system_info: {
        integrator: "...",
        project: "...",
        controller: "..."
      },
      gui_files: {
        config: draftFiles['gui/config.json'],
        pages: {
          main: draftFiles['gui/pages/main.json'],
          audio: draftFiles['gui/pages/audio.json']
        },
        components: {
          'volume-slider': draftFiles['gui/components/volume-slider.json']
        }
      },
      scenes: {
        'presentation-mode': draftFiles['scenes/presentation-mode.json']
      },
      available_devices: devices,
      available_controls: controls
    };
  }
}
```

### File Manager

```javascript
class GUIFileManager {
  // Read draft files
  async readDraftFiles(controllerId) {
    const result = await db.query(
      `SELECT file_path, content FROM gui_files 
       WHERE controller_id=$1 AND state='draft'`,
      [controllerId]
    );
    
    const files = {};
    for (const row of result.rows) {
      files[row.file_path] = row.content;
    }
    return files;
  }
  
  // Write to draft (AI modifies here)
  async writeDraftFile(controllerId, filePath, content) {
    await db.query(
      `INSERT INTO gui_files (controller_id, file_path, state, content, modified_by)
       VALUES ($1, $2, 'draft', $3, 'ai')
       ON CONFLICT (controller_id, file_path, state)
       DO UPDATE SET content=$3, modified_at=NOW(), modified_by='ai'`,
      [controllerId, filePath, content]
    );
  }
  
  // Deploy: copy draft → deployed
  async deployDraftFiles(controllerId, userId, commitMessage) {
    // Get all draft files
    const draftFiles = await this.readDraftFiles(controllerId);
    
    // Get next version number
    const version = await this.getNextVersion(controllerId);
    
    // Copy each file to deployed state
    for (const [filePath, content] of Object.entries(draftFiles)) {
      await db.query(
        `INSERT INTO gui_files (controller_id, file_path, state, content, modified_by)
         VALUES ($1, $2, 'deployed', $3, $4)
         ON CONFLICT (controller_id, file_path, state)
         DO UPDATE SET content=$3, modified_at=NOW(), modified_by=$4`,
        [controllerId, filePath, content, userId]
      );
    }
    
    // Create version snapshot
    await db.query(
      `INSERT INTO gui_file_versions 
       (controller_id, version_number, state, files, commit_message, created_by)
       VALUES ($1, $2, 'deployed', $3, $4, $5)`,
      [controllerId, version, JSON.stringify(draftFiles), commitMessage, userId]
    );
    
    return {version, files_deployed: Object.keys(draftFiles).length};
  }
  
  // Sync: send deployed → NUC
  async syncToNUC(controllerId, userId) {
    const ws = getControllerWebSocket(controllerId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error('Controller offline');
    }
    
    // Get deployed files
    const deployedFiles = await db.query(
      `SELECT file_path, content FROM gui_files 
       WHERE controller_id=$1 AND state='deployed'`,
      [controllerId]
    );
    
    const syncId = uuid();
    
    // Send via WebSocket
    ws.send(JSON.stringify({
      type: 'gui_sync',
      sync_id: syncId,
      files: deployedFiles.rows
    }));
    
    // Create sync record
    await db.query(
      `INSERT INTO sync_history 
       (id, controller_id, status, triggered_by)
       VALUES ($1, $2, 'pending', $3)`,
      [syncId, controllerId, userId]
    );
    
    return {sync_id: syncId, status: 'in_progress'};
  }
}
```

### Validator

```javascript
class GUIValidator {
  async validate(guiFiles, controllerId) {
    const errors = [];
    const warnings = [];
    
    // Get available controls
    const controls = await db.query(
      `SELECT control_id, device_id FROM device_controls dc
       JOIN devices d ON dc.device_id = d.id
       WHERE d.controller_id = $1`,
      [controllerId]
    );
    
    // Validate each GUI file
    for (const [filePath, content] of Object.entries(guiFiles)) {
      // Check JSON structure
      if (!this.isValidJSON(content)) {
        errors.push(`Invalid JSON in ${filePath}`);
        continue;
      }
      
      // Validate control references
      if (filePath.startsWith('gui/pages/')) {
        const controlRefs = this.extractControlReferences(content);
        for (const ref of controlRefs) {
          const exists = controls.rows.find(
            c => c.device_id === ref.device && c.control_id === ref.control
          );
          if (!exists) {
            errors.push(`${filePath}: Control ${ref.device}.${ref.control} not found`);
          }
        }
      }
      
      // Validate file references
      const fileRefs = this.extractFileReferences(content);
      for (const ref of fileRefs) {
        if (!guiFiles[ref]) {
          warnings.push(`${filePath}: Referenced file ${ref} not found`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
```

---

## API Endpoints

### Authentication

```javascript
POST /api/auth/register
  Request: {name, email, password}
  Response: {token, user: {id, name, email}}

POST /api/auth/login
  Request: {email, password}
  Response: {token, user: {id, name, email}}
```

### Projects

```javascript
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id
```

### Controllers

```javascript
GET    /api/projects/:projectId/controllers
POST   /api/projects/:projectId/controllers
GET    /api/controllers/:id
PUT    /api/controllers/:id
DELETE /api/controllers/:id
```

### Devices

```javascript
GET    /api/controllers/:controllerId/devices
POST   /api/controllers/:controllerId/devices
GET    /api/devices/:id
PUT    /api/devices/:id
DELETE /api/devices/:id
```

### Device Controls

```javascript
GET    /api/devices/:deviceId/controls
POST   /api/devices/:deviceId/controls
GET    /api/device-controls/:id
PUT    /api/device-controls/:id
DELETE /api/device-controls/:id
```

### Scenes

```javascript
GET    /api/controllers/:controllerId/scenes
POST   /api/controllers/:controllerId/scenes
GET    /api/scenes/:id
PUT    /api/scenes/:id
DELETE /api/scenes/:id
POST   /api/scenes/:id/execute
```

### GUI Management (NEW - Sprint 6)

```javascript
// Get current state
GET /api/controllers/:id/gui/status
  Response: {
    draft_version: 5,
    deployed_version: 4,
    live_version: 3,
    has_unsaved_changes: true
  }

// Get draft files for preview
GET /api/controllers/:id/gui/files/draft
  Response: {files: {...}}

// Deploy draft → deployed
POST /api/controllers/:id/gui/deploy
  Request: {commit_message: "Added master volume"}
  Response: {version: 5, ready_to_sync: true}

// Sync deployed → NUC
POST /api/controllers/:id/gui/sync
  Response: {sync_id: "uuid", status: "in_progress"}

// Check sync progress
GET /api/controllers/:id/gui/sync/:syncId
  Response: {status: "completed", progress: 100}

// Get sync history
GET /api/controllers/:id/gui/sync/history
  Response: {syncs: [...]}

// Discard draft changes
POST /api/controllers/:id/gui/discard
  Response: {reverted_to_version: 4}

// Rollback to previous version
POST /api/controllers/:id/gui/rollback
  Request: {target_version: 3}
  Response: {current_version: 3}
```

### AI Service (NEW - Sprint 5-6)

```javascript
// AI chat (streaming)
POST /api/ai/chat
  Request: {controller_id, message, provider}
  Response: Stream of JSON chunks

// List providers
GET /api/ai/providers
  Response: {
    providers: [{id, name, models, available}],
    usage: {requests_this_month, limit}
  }

// Save API key (BYOK)
POST /api/ai/keys
  Request: {provider, api_key}
  Response: {message: "Key saved"}

// Get usage stats
GET /api/ai/usage
  Response: {requests_this_month, limit, cost}

// Validate GUI config
POST /api/ai/validate
  Request: {gui_files, controller_id}
  Response: {valid, errors, warnings}
```

---

## Device Driver Architecture

### Base Driver Interface

```javascript
const EventEmitter = require('events');

class BaseDriver extends EventEmitter {
  constructor(config) {
    super();
    this.deviceId = config.deviceId;
    this.name = config.name;
    this.connected = false;
  }
  
  // Required methods
  async connect() {
    throw new Error('Must be implemented by subclass');
  }
  
  async disconnect() {
    throw new Error('Must be implemented by subclass');
  }
  
  async setControl(control, value) {
    throw new Error('Must be implemented by subclass');
  }
  
  // Optional methods
  async getControl(control) {
    return null;
  }
  
  async ping() {
    return this.connected;
  }
  
  // Events emitted:
  // - 'connected'
  // - 'disconnected'
  // - 'error', error
  // - 'response', data
}

module.exports = BaseDriver;
```

### Harvey DSP Driver Implementation

```javascript
const BaseDriver = require('./base-driver');
const net = require('net');

class HarveyDSP extends BaseDriver {
  constructor(config) {
    super(config);
    this.host = config.ip;
    this.port = config.port || 23;
    this.socket = null;
    this.responseHandlers = new Map();
    this.commandQueue = [];
  }
  
  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = net.connect(this.port, this.host);
      
      this.socket.on('connect', () => {
        this.connected = true;
        this.emit('connected');
        console.log(`Harvey DSP ${this.deviceId} connected`);
        resolve();
      });
      
      this.socket.on('data', (data) => {
        this.handleResponse(data.toString());
      });
      
      this.socket.on('close', () => {
        this.connected = false;
        this.emit('disconnected');
        console.log(`Harvey DSP ${this.deviceId} disconnected`);
        
        // Auto-reconnect after 5 seconds
        setTimeout(() => this.connect(), 5000);
      });
      
      this.socket.on('error', (err) => {
        this.emit('error', err);
        console.error(`Harvey DSP ${this.deviceId} error:`, err.message);
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
    const {control_type, block_id, parameters} = control;
    
    switch(control_type) {
      case 'gain':
        const dbValue = this.percentToDb(value, parameters.min, parameters.max);
        return this.sendCommand(`SET LVLGAIN ${block_id} ${Math.round(dbValue * 10)}`);
        
      case 'mute':
        const muteValue = value ? 1 : 0;
        return this.sendCommand(`SET LVLMUTE ${block_id} ${muteValue}`);
        
      case 'phase':
        const phaseValue = value ? 1 : 0;
        return this.sendCommand(`SET LVLPHREV ${block_id} ${phaseValue}`);
        
      case 'matrix':
        const {input, output, state} = value;
        return this.sendCommand(
          `SET MXXPGAIN ${block_id} ${input} ${output} ${state ? 0 : -999}`
        );
        
      default:
        throw new Error(`Unsupported control type: ${control_type}`);
    }
  }
  
  async sendCommand(command, retries = 3) {
    if (!this.connected) {
      throw new Error('Not connected');
    }
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await this._sendCommandOnce(command);
      } catch (error) {
        if (attempt === retries) throw error;
        console.warn(`Retry ${attempt}/${retries} for command: ${command}`);
        await this.sleep(1000 * attempt);
      }
    }
  }
  
  async _sendCommandOnce(command) {
    return new Promise((resolve, reject) => {
      const requestId = `req_${Date.now()}_${Math.random()}`;
      
      const timeout = setTimeout(() => {
        this.responseHandlers.delete(requestId);
        reject(new Error('Command timeout'));
      }, 3000);
      
      this.responseHandlers.set(requestId, (response) => {
        clearTimeout(timeout);
        if (response.startsWith('OK')) {
          resolve(response);
        } else {
          reject(new Error(response));
        }
      });
      
      this.socket.write(command + '\r\n');
      console.log(`Harvey DSP ${this.deviceId}: ${command}`);
    });
  }
  
  handleResponse(data) {
    this.emit('response', data);
    
    // Get first pending handler
    const [requestId, handler] = this.responseHandlers.entries().next().value || [];
    if (handler) {
      this.responseHandlers.delete(requestId);
      handler(data.trim());
    }
  }
  
  percentToDb(percent, minDb, maxDb) {
    return minDb + ((maxDb - minDb) * percent / 100);
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = HarveyDSP;
```

### Device Manager

```javascript
class DeviceManager {
  constructor() {
    this.devices = new Map();
    this.drivers = new Map();
    this.loadDrivers();
  }
  
  loadDrivers() {
    this.drivers.set('harvey_dsp', require('./harvey-dsp'));
    this.drivers.set('avpro_matrix', require('./avpro-matrix'));
    // More drivers...
  }
  
  async addDevice(config) {
    const DriverClass = this.drivers.get(config.type);
    if (!DriverClass) {
      throw new Error(`Unknown driver: ${config.type}`);
    }
    
    const instance = new DriverClass(config);
    await instance.connect();
    
    this.devices.set(config.device_id, instance);
    console.log(`Device added: ${config.device_id}`);
    
    return instance;
  }
  
  async removeDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (device) {
      await device.disconnect();
      this.devices.delete(deviceId);
      console.log(`Device removed: ${deviceId}`);
    }
  }
  
  async setControl(deviceId, controlId, value) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }
    
    const control = await db.getControl(deviceId, controlId);
    if (!control) {
      throw new Error(`Control not found: ${controlId}`);
    }
    
    return device.setControl(control, value);
  }
}

module.exports = DeviceManager;
```

---

## Scene Execution Engine

```javascript
const EventEmitter = require('events');

class SceneEngine extends EventEmitter {
  constructor(deviceManager) {
    super();
    this.deviceManager = deviceManager;
  }
  
  async executeScene(sceneId) {
    const scene = await db.getScene(sceneId);
    if (!scene) {
      throw new Error(`Scene not found: ${sceneId}`);
    }
    
    const execution = {
      scene_id: sceneId,
      started_at: Date.now(),
      steps: [],
      status: 'running'
    };
    
    this.emit('scene_start', {scene_id: sceneId, scene_name: scene.name});
    
    try {
      for (let i = 0; i < scene.steps.length; i++) {
        const step = scene.steps[i];
        
        const stepExecution = {
          step_number: i + 1,
          device: step.device,
          control: step.control,
          value: step.value,
          status: 'running',
          started_at: Date.now()
        };
        
        execution.steps.push(stepExecution);
        this.emit('step_start', stepExecution);
        
        try {
          await this.deviceManager.setControl(
            step.device,
            step.control,
            step.value
          );
          
          stepExecution.status = 'completed';
          stepExecution.completed_at = Date.now();
          stepExecution.duration_ms = stepExecution.completed_at - stepExecution.started_at;
          this.emit('step_complete', stepExecution);
          
        } catch (error) {
          stepExecution.status = 'failed';
          stepExecution.error = error.message;
          this.emit('step_failed', stepExecution);
          
          if (!scene.continue_on_error) {
            throw error;
          }
        }
        
        if (step.wait_ms > 0) {
          await this.sleep(step.wait_ms);
        }
      }
      
      execution.status = 'completed';
      execution.completed_at = Date.now();
      execution.duration_ms = execution.completed_at - execution.started_at;
      this.emit('scene_complete', execution);
      
      return execution;
      
    } catch (error) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.completed_at = Date.now();
      execution.duration_ms = execution.completed_at - execution.started_at;
      this.emit('scene_failed', execution);
      
      throw error;
    }
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = SceneEngine;
```

---

## GUI Architecture (Two GUIs on NUC)

### 1. User Touch Panel GUI (Port 3000)

**Purpose:** End-user interface for controlling AV equipment

**Features:**
- Simple, touch-friendly interface
- Buttons for scene triggers
- Sliders for volume/lighting control
- Page navigation
- Visual feedback
- Image backgrounds
- No authentication required (local network only)

**File Structure:**
```
/opt/control-system/src/gui-server/
├── server.js              # Express server
├── renderer.js            # JSON → HTML renderer
└── public/
    ├── index.html
    ├── styles.css
    └── app.js
```

**Renderer Example:**
```javascript
class GUIRenderer {
  renderPage(pageConfig) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${pageConfig.name}</title>
        <style>${this.generateStyles(pageConfig)}</style>
      </head>
      <body>
        ${this.renderElements(pageConfig.elements)}
      </body>
      </html>
    `;
    return html;
  }
  
  renderElements(elements) {
    return elements.map(el => {
      switch(el.type) {
        case 'button':
          return this.renderButton(el);
        case 'slider':
          return this.renderSlider(el);
        case 'button-group':
          return this.renderButtonGroup(el);
        case 'status-indicator':
          return this.renderStatusIndicator(el);
        default:
          return '';
      }
    }).join('\n');
  }
  
  renderButton(element) {
    return `
      <button 
        class="gui-button" 
        data-action="${element.action.type}"
        data-scene="${element.action.scene_id}"
        style="
          left: ${element.position.x}px;
          top: ${element.position.y}px;
          width: ${element.position.width}px;
          height: ${element.position.height}px;
        ">
        ${element.label}
      </button>
    `;
  }
}
```

### 2. System Admin GUI (Port 3001)

**Purpose:** System diagnostics, configuration, and troubleshooting

**Features:**
- System status dashboard
- Provisioning & configuration
- Device management
- Sync & data status
- Logs & debugging
- System maintenance

**Authentication:** Password-protected

**File Structure:**
```
/opt/control-system/src/admin-server/
├── server.js              # Express server
├── auth.js                # Password authentication
├── system-info.js         # CPU, RAM, disk monitoring
├── log-viewer.js          # journalctl integration
└── views/
    ├── dashboard.html
    ├── devices.html
    ├── logs.html
    └── maintenance.html
```

---

## Security Model

### Authentication & Authorization

**JWT Structure:**
```javascript
{
  user_id: "uuid",
  integrator_id: "uuid",
  email: "user@company.com",
  role: "admin",
  iat: 1234567890,
  exp: 1234654290
}
```

**Middleware:**
```javascript
async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({error: 'Unauthorized'});
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({error: 'Invalid token'});
  }
}
```

**Database Queries:**
```javascript
// ALWAYS filter by integrator_id
async function getDevices(req, res) {
  const integratorId = req.user.integrator_id;
  const controllerId = req.params.controllerId;
  
  const devices = await db.query(`
    SELECT d.* FROM devices d
    JOIN controllers c ON d.controller_id = c.id
    JOIN projects p ON c.project_id = p.id
    WHERE p.integrator_id = $1 AND c.id = $2
  `, [integratorId, controllerId]);
  
  res.json(devices.rows);
}
```

### API Key Encryption (BYOK)

```javascript
const crypto = require('crypto');

class APIKeyManager {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  }
  
  encrypt(plaintext) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }
  
  decrypt(ciphertext) {
    const parts = ciphertext.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

---

## Deployment

### Cloud (Railway)

**Deployment Process:**
```bash
git push railway main
# Railway automatically:
# - Detects Node.js
# - Runs npm install
# - Executes npm start
# - Provides PostgreSQL
# - Generates HTTPS URL
```

**Environment Variables:**
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
ENCRYPTION_KEY=...
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
GEMINI_API_KEY=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_URL=...
NODE_ENV=production
PORT=3000
```

### NUC (Systemd)

**Service File:** `/etc/systemd/system/control-system.service`
```ini
[Unit]
Description=AV Control System
After=network.target

[Service]
Type=simple
User=controlsystem
WorkingDirectory=/opt/control-system
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
```

**Management:**
```bash
sudo systemctl enable control-system
sudo systemctl start control-system
sudo systemctl status control-system
sudo journalctl -u control-system -f
```

---

## Development Workflow

### Local Development

**Cloud:**
```bash
cd VERTIGO_CONTROL
npm install
cp .env.example .env
# Edit .env with local database URL
npm run migrate
npm run dev
```

**NUC Simulator:**
```bash
cd control-system
npm install
cp .env.example .env
# Edit .env to point to local cloud
npm start
```

### Testing

**Unit Tests:**
```javascript
describe('HarveyDSP Driver', () => {
  it('should convert percentage to dB correctly', () => {
    const driver = new HarveyDSP({...});
    const result = driver.percentToDb(60, -80, 12);
    expect(result).toBe(-24.8);
  });
});
```

---

## Common Gotchas & Solutions

1. **Multi-Tenant Data Leakage:** Always filter by integrator_id
2. **Block ID Case Sensitivity:** Harvey DSP is case-sensitive
3. **Percentage vs. dB Confusion:** Always convert at driver level
4. **WebSocket Reconnection:** Implement exponential backoff
5. **SQLite Locking:** Use WAL mode, serialize writes
6. **File Cache Growth:** Implement LRU cache with size limit

---

## Quick Reference for AI Assistants

**Key Principles:**
1. Multi-tenancy is critical - every query filters by integrator_id
2. File-based GUI with three states (DRAFT → DEPLOYED → LIVE)
3. Manual deploy and sync for safety
4. AI sees only logical controls, never hardware IDs
5. Offline-first for controllers
6. Error handling everywhere

**Key Files:**
- Database: `db/migrations/`
- API: `src/routes/`
- AI Service: `src/ai/`
- Drivers: `control-system/src/drivers/`
- GUI: `control-system/src/gui-server/`

**Common Commands:**
```bash
# Cloud dev
cd VERTIGO_CONTROL && npm run dev

# NUC dev
cd control-system && npm start

# View logs
sudo journalctl -u control-system -f

# Database migration
npm run migrate
```

---

**End of Technical Reference**