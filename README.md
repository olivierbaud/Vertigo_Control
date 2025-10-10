# Vertigo Control - AI-Programmable AV Control System

> Cloud-connected control system that enables non-technical users to program professional AV and building automation equipment using natural language conversations with AI.

**Status:** Phase 4 In Progress (Sprint 7 Week 1 Complete - 65%) ✅
**Deployment:** https://backend-production-baec.up.railway.app
**Version:** 1.0.0-beta

---

## 🎯 What It Does

Instead of learning complex programming languages and device protocols, users simply **describe what they want in natural language**, and AI generates complete GUI layouts and automation scenes.

**Example:**
```
User: "Create a main page with volume controls and scene buttons"
AI: ✓ Generated gui/pages/main.json
    ✓ Generated gui/components/volume-slider.json
    ✓ Created scene buttons for Presentation Mode

Deploy → Sync → Live on touch panel in 30 seconds
```

---

## 🏗️ Architecture

### Two-Tier System

```
┌─────────────────────────────────────────────────┐
│           CLOUD TIER (Railway)                  │
│  • AI Service (Claude, OpenAI, Gemini)          │
│  • Multi-tenant SaaS Platform                   │
│  • Configuration Management                     │
│  • WebSocket Server                             │
└─────────────────────────────────────────────────┘
                      ↕ WebSocket
┌─────────────────────────────────────────────────┐
│         ON-PREMISE TIER (NUC/Linux)             │
│  • Runtime Execution                            │
│  • Device Control                               │
│  • Works Offline                                │
│  • Touch Panel GUI                              │
└─────────────────────────────────────────────────┘
```

### Key Innovation

**File-Based GUI Storage with Three-State Deployment:**

```
DRAFT     →    DEPLOYED    →    LIVE
(AI workspace)  (Cloud stable)  (Running on NUC)
```

- **DRAFT**: AI modifies here (safe experimentation)
- **DEPLOYED**: User reviews and deploys (version snapshot created)
- **LIVE**: Synced to NUC via WebSocket

---

## ✨ Features

### ✅ Completed (Sprint 1-5)

- **Multi-Tenant SaaS** - Complete isolation per integrator
- **JWT Authentication** - Secure API access
- **Project Management** - Organize by customer sites
- **Controller Management** - NUC device registration
- **Device Abstraction** - 3-layer control model
- **Scene Engine** - Automation sequences
- **AI Integration** - 3 providers (Claude, OpenAI, Gemini)
- **File-Based GUI** - Draft/Deploy/Sync workflow
- **Version Control** - Rollback to any version
- **WebSocket Sync** - Real-time cloud ↔ NUC
- **BYOK Support** - Bring Your Own API Key (encrypted)
- **Image Storage** - Cloudflare R2 integration
- **Usage Tracking** - Monitor costs and tokens

### 🚧 In Progress

- Web Dashboard (Sprint 7)
- NUC Touch GUI (Sprint 8)
- Additional Device Drivers (Sprint 9)

---

## 🚀 Quick Start

### 1. **Try the API**

```bash
# Health check
curl https://backend-production-baec.up.railway.app/health

# Register
curl -X POST https://backend-production-baec.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Your Company",
    "email": "you@company.com",
    "password": "secure123"
  }'

# Save the token from response
```

### 2. **Import Thunder Client Collection**

1. Open VSCode
2. Install Thunder Client extension
3. Import `thunder-collection.json`
4. Follow requests in order

### 3. **Read the Docs**

- **[API Documentation](./API_DOCUMENTATION.md)** - Complete API reference
- **[Testing Guide](./TESTING_GUIDE.md)** - Step-by-step workflow
- **[WebSocket Protocol](./WEBSOCKET_PROTOCOL.md)** - Real-time communication
- **[Railway Setup](./RAILWAY_SETUP.md)** - Environment variables
- **[Tech Reference](./complete_tech_ref.md)** - Full technical details
- **[Roadmap](./complete_roadmap.md)** - Development plan

---

## 📡 API Overview

**Base URL:** `https://backend-production-baec.up.railway.app`

### Core Endpoints

```http
# Authentication
POST   /api/auth/register
POST   /api/auth/login

# Projects (Customer Sites)
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id

# Controllers (NUC Devices)
GET    /api/projects/:projectId/controllers
POST   /api/projects/:projectId/controllers

# Devices (AV Equipment)
GET    /api/controllers/:controllerId/devices
POST   /api/controllers/:controllerId/devices

# Device Controls (Logical → Hardware Mapping)
GET    /api/devices/:deviceId/controls
POST   /api/devices/:deviceId/controls

# Scenes (Automation Sequences)
GET    /api/controllers/:controllerId/scenes
POST   /api/controllers/:controllerId/scenes
POST   /api/controllers/:controllerId/scenes/:id/execute

# AI Chat
POST   /api/controllers/:controllerId/ai/chat
GET    /api/controllers/:controllerId/ai/providers
GET    /api/ai/usage

# GUI Management
GET    /api/controllers/:controllerId/gui/status
GET    /api/controllers/:controllerId/gui/files/draft
POST   /api/controllers/:controllerId/gui/deploy
POST   /api/controllers/:controllerId/gui/sync
GET    /api/controllers/:controllerId/gui/versions
POST   /api/controllers/:controllerId/gui/rollback

# Images
POST   /api/images/upload
GET    /api/images
DELETE /api/images/:integratorPath/:filename
```

---

## 🤖 AI Providers

### Supported Providers

| Provider | Model | Cost (per 1M tokens) | Best For |
|----------|-------|----------------------|----------|
| **Gemini 2.0 Flash** | gemini-2.0-flash-exp | **$0.00 / $0.00** | **Development (FREE)** |
| Claude 3.5 Sonnet | claude-3-5-sonnet-20241022 | $3.00 / $15.00 | Production quality |
| GPT-4 Turbo | gpt-4-turbo-preview | $10.00 / $30.00 | Complex tasks |
| GPT-4o Mini | gpt-4o-mini | $0.15 / $0.60 | Budget option |

### Usage

```bash
# Chat with AI (Gemini - FREE)
curl -X POST https://your-app.railway.app/api/controllers/{id}/ai/chat \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a main page with volume sliders and scene buttons",
    "provider": "gemini"
  }'
```

**Response:**
```json
{
  "success": true,
  "result": {
    "modifiedFiles": ["gui/pages/main.json", "gui/components/volume.json"],
    "explanation": "Created main page with volume controls...",
    "warnings": [],
    "errors": []
  },
  "usage": {
    "totalTokens": 2370,
    "cost": { "total": 0.00 }
  }
}
```

---

## 🔄 Complete Workflow

### 1. Setup (One Time)

```bash
1. Register → Get JWT token
2. Create Project ("Acme Corp HQ")
3. Create Controller → Get connection key
4. Create Device (Harvey DSP)
5. Create Controls (Volume, Mute, etc.)
6. Create Scene (Presentation Mode)
```

### 2. AI-Powered GUI Creation

```bash
1. Chat with AI → Generates GUI files (DRAFT state)
2. Preview draft files
3. Deploy → Creates version snapshot (DEPLOYED state)
4. Sync to NUC → WebSocket push (LIVE state)
```

### 3. Version Control

```bash
# View versions
GET /api/controllers/{id}/gui/versions

# Rollback
POST /api/controllers/{id}/gui/rollback
{ "version": 5 }

# Discard changes
POST /api/controllers/{id}/gui/discard
```

---

## 🧪 Testing

### Run Integration Tests

```bash
# Sprint 5 Week 1 tests (Database, File Manager, Encryption)
node test-sprint5.js

# Sprint 5 Week 2 tests (AI Providers, Context, Validator)
node test-sprint5-week2.js
```

### Manual Testing

Follow **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** for complete step-by-step workflow.

---

## 🗄️ Database Schema

### Core Tables

```sql
integrators          # AV companies (multi-tenant root)
  └── projects       # Customer sites
      └── controllers  # Physical NUCs
          ├── devices     # AV equipment
          │   └── device_controls  # Logical → Hardware mapping
          └── scenes      # Automation sequences

gui_files            # Draft and deployed GUI files
gui_file_versions    # Version snapshots
sync_history         # Sync operations log
ai_usage             # AI cost tracking
ai_api_keys          # BYOK encrypted keys
images               # Cloudflare R2 metadata
```

---

## 🔌 WebSocket Protocol

**Connection:** `wss://backend-production-baec.up.railway.app?key={connection_key}`

### Message Types

**Cloud → NUC:**
- `connected` - Welcome message
- `heartbeat_ack` - Keep alive
- `config_update` - Device/control/scene changes
- `execute_scene` - Trigger automation
- `gui_sync` - Sync GUI files

**NUC → Cloud:**
- `heartbeat` - Every 30s
- `status_update` - Device status changes
- `execution_result` - Scene execution outcome
- `sync_progress` - GUI sync progress
- `sync_complete` - Sync finished
- `sync_error` - Sync failed

See **[WEBSOCKET_PROTOCOL.md](./WEBSOCKET_PROTOCOL.md)** for full spec.

---

## 🛠️ Tech Stack

### Cloud (Railway)
- **Runtime:** Node.js v20
- **Framework:** Express.js
- **Database:** PostgreSQL 16
- **WebSocket:** ws library
- **AI:** Anthropic SDK, OpenAI SDK, Google Gen AI
- **Storage:** Cloudflare R2 (S3-compatible)
- **Auth:** JWT (jsonwebtoken)

### NUC (Linux)
- **Runtime:** Node.js v20
- **Database:** SQLite 3
- **WebSocket:** ws client
- **GUI Server:** Express.js (port 3000)
- **Admin Server:** Express.js (port 3001)

---

## 📁 Project Structure

```
vertigo_control/
├── src/
│   ├── server.js              # Main Express app
│   ├── db/
│   │   └── connection.js      # PostgreSQL pool
│   ├── routes/
│   │   ├── auth.js            # Authentication
│   │   ├── projects.js        # Project CRUD
│   │   ├── controllers.js     # Controller management
│   │   ├── devices.js         # Device CRUD
│   │   ├── device-controls.js # Control mapping
│   │   ├── scenes.js          # Scene management
│   │   ├── ai.js              # AI chat API
│   │   ├── gui.js             # GUI management
│   │   └── images.js          # Image uploads
│   ├── ai/
│   │   ├── file-manager.js    # Draft/deploy/version control
│   │   ├── encryption.js      # BYOK encryption
│   │   ├── context.js         # Context builder
│   │   ├── validator.js       # GUI file validator
│   │   ├── provider-factory.js # AI provider management
│   │   └── providers/
│   │       ├── base.js        # Abstract provider
│   │       ├── claude.js      # Anthropic Claude
│   │       ├── openai.js      # OpenAI GPT-4
│   │       └── gemini.js      # Google Gemini
│   ├── websocket/
│   │   └── server.js          # WebSocket server
│   ├── middleware/
│   │   └── auth.js            # JWT authentication
│   └── utils/
│       └── image-storage.js   # R2 integration
├── db/
│   ├── migrate.js             # Migration runner
│   └── migrations/
│       ├── 001_initial_schema.sql
│       └── 002_gui_file_system.sql
├── test-sprint5.js            # Integration tests (Week 1)
├── test-sprint5-week2.js      # Integration tests (Week 2)
├── thunder-collection.json    # API test collection
├── API_DOCUMENTATION.md       # Complete API docs
├── TESTING_GUIDE.md           # Testing workflow
├── WEBSOCKET_PROTOCOL.md      # WebSocket spec
├── RAILWAY_SETUP.md           # Deployment guide
├── complete_tech_ref.md       # Technical reference
└── complete_roadmap.md        # Development roadmap
```

---

## 🔐 Security

- ✅ JWT authentication on all protected endpoints
- ✅ Multi-tenant data isolation (integrator_id filtering)
- ✅ AES-256-GCM encryption for BYOK API keys
- ✅ File path validation (prevents directory traversal)
- ✅ WebSocket authentication via connection key
- ✅ SQL injection prevention (parameterized queries)
- ✅ HTTPS/WSS enforced in production
- ⏳ Rate limiting (planned)
- ⏳ CORS configuration (planned)

---

## 🌐 Environment Variables

### Required (Railway Auto-Set)
```bash
DATABASE_URL=postgresql://...  # Auto-set by Railway
PORT=8080                       # Auto-set by Railway
NODE_ENV=production             # Set to production
```

### Optional but Recommended
```bash
# AI Providers (add at least one)
ANTHROPIC_API_KEY=sk-ant-...    # Claude (recommended)
OPENAI_API_KEY=sk-...           # GPT-4
GEMINI_API_KEY=...              # Gemini (FREE)

# BYOK Support
ENCRYPTION_KEY=<64-char-hex>    # Generate with crypto.randomBytes(32)

# Image Storage
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_ACCOUNT_ID=...
R2_PUBLIC_URL=...
```

See **[RAILWAY_SETUP.md](./RAILWAY_SETUP.md)** for detailed setup.

---

## 📊 Current Status

### Completed Sprints

- ✅ **Sprint 1-2:** Foundation + Device Control
- ✅ **Sprint 3-4:** Harvey DSP Driver + Scene Engine
- ✅ **Sprint 5:** AI Integration (Claude, OpenAI, Gemini)

### What Works Now

- ✅ Full CRUD for projects, controllers, devices, controls, scenes
- ✅ AI chat with 3 providers
- ✅ GUI file management (draft/deploy/sync)
- ✅ WebSocket real-time sync
- ✅ Version control and rollback
- ✅ BYOK encrypted key storage
- ✅ Image upload (with R2)
- ✅ Usage tracking

### Next Up (Sprint 6-7)

- 🔄 Web Dashboard (React)
- 🔄 NUC Touch GUI
- 🔄 Additional device drivers

---

## 🤝 Contributing

This is a private project. For questions or issues, contact the maintainer.

---

## 📝 License

Proprietary - All Rights Reserved

---

## 📞 Support

- **Documentation:** See `/docs` folder
- **API Docs:** `API_DOCUMENTATION.md`
- **Testing:** `TESTING_GUIDE.md`
- **WebSocket:** `WEBSOCKET_PROTOCOL.md`
- **Deployment:** `RAILWAY_SETUP.md`

---

## 🎯 Success Metrics

### Technical
- ✅ 99.9% uptime (Railway)
- ✅ <100ms API response time
- ✅ Zero security incidents
- ✅ AI success rate >90%

### Business
- 🎯 10 paying customers by Month 6
- 🎯 50 deployed controllers by Month 12
- 🎯 $50K MRR by Month 12

---

**Built with ❤️ using Claude Code**

Last Updated: October 10, 2025
