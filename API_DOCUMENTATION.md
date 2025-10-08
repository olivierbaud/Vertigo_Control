# Vertigo Control - API Documentation

**Base URL:** `https://backend-production-baec.up.railway.app`
**Version:** 1.0.0
**Last Updated:** October 8, 2025

---

## Table of Contents

1. [Authentication](#authentication)
2. [Projects](#projects)
3. [Controllers](#controllers)
4. [Devices](#devices)
5. [Device Controls](#device-controls)
6. [Scenes](#scenes)
7. [AI Chat](#ai-chat)
8. [GUI Management](#gui-management)
9. [Images](#images)
10. [WebSocket Protocol](#websocket-protocol)

---

## Authentication

All endpoints (except auth endpoints) require a JWT token in the `Authorization` header:
```
Authorization: Bearer <token>
```

### Register

**POST** `/api/auth/register`

**Request:**
```json
{
  "name": "AV Integration Company",
  "email": "admin@avcompany.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "message": "Registration successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "AV Integration Company",
    "email": "admin@avcompany.com"
  }
}
```

### Login

**POST** `/api/auth/login`

**Request:**
```json
{
  "email": "admin@avcompany.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "AV Integration Company",
    "email": "admin@avcompany.com"
  }
}
```

---

## Projects

Projects represent customer sites/installations.

### List Projects

**GET** `/api/projects`

**Response:**
```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "Corporate Headquarters",
      "customer_name": "Acme Corp",
      "location": "New York, NY",
      "created_at": "2025-10-01T12:00:00Z"
    }
  ]
}
```

### Create Project

**POST** `/api/projects`

**Request:**
```json
{
  "name": "Corporate Headquarters",
  "customer_name": "Acme Corp",
  "location": "New York, NY"
}
```

**Response:**
```json
{
  "message": "Project created",
  "project": {
    "id": "uuid",
    "name": "Corporate Headquarters",
    "customer_name": "Acme Corp",
    "location": "New York, NY",
    "created_at": "2025-10-08T10:00:00Z"
  }
}
```

### Get Project

**GET** `/api/projects/:id`

**Response:**
```json
{
  "project": {
    "id": "uuid",
    "name": "Corporate Headquarters",
    "customer_name": "Acme Corp",
    "location": "New York, NY",
    "created_at": "2025-10-01T12:00:00Z"
  }
}
```

### Update Project

**PUT** `/api/projects/:id`

**Request:**
```json
{
  "name": "Updated Project Name",
  "location": "Los Angeles, CA"
}
```

### Delete Project

**DELETE** `/api/projects/:id`

---

## Controllers

Controllers are physical NUC devices running at customer sites.

### List Controllers

**GET** `/api/projects/:projectId/controllers`

**Response:**
```json
{
  "controllers": [
    {
      "id": "uuid",
      "name": "Main Floor Controller",
      "connection_key": "ctrl-abc123...",
      "status": "online",
      "last_seen": "2025-10-08T10:00:00Z",
      "ip_address": "192.168.1.100",
      "created_at": "2025-10-01T12:00:00Z"
    }
  ]
}
```

### Create Controller

**POST** `/api/projects/:projectId/controllers`

**Request:**
```json
{
  "name": "Main Floor Controller"
}
```

**Response:**
```json
{
  "message": "Controller created",
  "controller": {
    "id": "uuid",
    "name": "Main Floor Controller",
    "connection_key": "ctrl-abc123def456...",
    "status": "offline",
    "created_at": "2025-10-08T10:00:00Z"
  }
}
```

**Note:** Save the `connection_key` - it's needed for NUC to connect via WebSocket.

### Get Controller

**GET** `/api/projects/:projectId/controllers/:id`

### Update Controller

**PUT** `/api/projects/:projectId/controllers/:id`

**Request:**
```json
{
  "name": "Updated Controller Name"
}
```

### Delete Controller

**DELETE** `/api/projects/:projectId/controllers/:id`

---

## Devices

Devices are AV equipment (DSPs, matrices, etc.) controlled by a controller.

### List Devices

**GET** `/api/controllers/:controllerId/devices`

**Response:**
```json
{
  "devices": [
    {
      "id": "uuid",
      "device_id": "dsp_main",
      "name": "Harvey DSP - Main Room",
      "type": "harvey_dsp",
      "connection_config": {
        "host": "192.168.1.50",
        "port": 3004
      },
      "status": "unknown",
      "created_at": "2025-10-01T12:00:00Z"
    }
  ]
}
```

### Create Device

**POST** `/api/controllers/:controllerId/devices`

**Request:**
```json
{
  "device_id": "dsp_main",
  "name": "Harvey DSP - Main Room",
  "type": "harvey_dsp",
  "connection_config": {
    "host": "192.168.1.50",
    "port": 3004
  }
}
```

**Response:**
```json
{
  "message": "Device created",
  "device": {
    "id": "uuid",
    "device_id": "dsp_main",
    "name": "Harvey DSP - Main Room",
    "type": "harvey_dsp",
    "connection_config": {
      "host": "192.168.1.50",
      "port": 3004
    },
    "status": "unknown",
    "created_at": "2025-10-08T10:00:00Z"
  }
}
```

### Get Device

**GET** `/api/controllers/:controllerId/devices/:id`

### Update Device

**PUT** `/api/controllers/:controllerId/devices/:id`

### Delete Device

**DELETE** `/api/controllers/:controllerId/devices/:id`

---

## Device Controls

Controls map logical names to hardware control blocks (the abstraction layer).

### List Controls

**GET** `/api/devices/:deviceId/controls`

**Response:**
```json
{
  "controls": [
    {
      "id": "uuid",
      "control_id": "ctrl_master_volume",
      "logical_name": "Master Volume",
      "control_type": "gain",
      "block_id": "dsp.0.gain.0",
      "parameters": null,
      "created_at": "2025-10-01T12:00:00Z"
    }
  ]
}
```

### Create Control

**POST** `/api/devices/:deviceId/controls`

**Request:**
```json
{
  "control_id": "ctrl_master_volume",
  "logical_name": "Master Volume",
  "control_type": "gain",
  "block_id": "dsp.0.gain.0"
}
```

**Response:**
```json
{
  "message": "Control mapping created",
  "control": {
    "id": "uuid",
    "control_id": "ctrl_master_volume",
    "logical_name": "Master Volume",
    "control_type": "gain",
    "block_id": "dsp.0.gain.0",
    "parameters": null,
    "created_at": "2025-10-08T10:00:00Z"
  }
}
```

### Update Control

**PUT** `/api/devices/:deviceId/controls/:id`

### Delete Control

**DELETE** `/api/devices/:deviceId/controls/:id`

---

## Scenes

Scenes are automation sequences (presets).

### List Scenes

**GET** `/api/controllers/:controllerId/scenes`

**Response:**
```json
{
  "scenes": [
    {
      "id": "uuid",
      "scene_id": "scene_presentation",
      "name": "Presentation Mode",
      "description": "Lower lights, raise screen, set audio",
      "steps": [
        {
          "device": "dsp_main",
          "control": "ctrl_master_volume",
          "value": 70,
          "delay": 0
        }
      ],
      "continue_on_error": false,
      "created_at": "2025-10-01T12:00:00Z"
    }
  ]
}
```

### Create Scene

**POST** `/api/controllers/:controllerId/scenes`

**Request:**
```json
{
  "scene_id": "scene_presentation",
  "name": "Presentation Mode",
  "description": "Lower lights, raise screen, set audio",
  "steps": [
    {
      "device": "dsp_main",
      "control": "ctrl_master_volume",
      "value": 70,
      "delay": 0
    },
    {
      "device": "dsp_main",
      "control": "ctrl_mic_mute",
      "value": false,
      "delay": 500
    }
  ],
  "continue_on_error": false
}
```

**Response:**
```json
{
  "message": "Scene created",
  "scene": {
    "id": "uuid",
    "scene_id": "scene_presentation",
    "name": "Presentation Mode",
    "description": "Lower lights, raise screen, set audio",
    "steps": [...],
    "continue_on_error": false,
    "created_at": "2025-10-08T10:00:00Z"
  }
}
```

### Get Scene

**GET** `/api/controllers/:controllerId/scenes/:id`

### Update Scene

**PUT** `/api/controllers/:controllerId/scenes/:id`

### Delete Scene

**DELETE** `/api/controllers/:controllerId/scenes/:id`

### Execute Scene

**POST** `/api/controllers/:controllerId/scenes/:id/execute`

**Response:**
```json
{
  "message": "Scene execution triggered"
}
```

**OR** if controller offline:
```json
{
  "error": "Controller offline",
  "message": "Controller is not connected"
}
```

---

## AI Chat

Generate GUI layouts using AI.

### Chat with AI

**POST** `/api/controllers/:controllerId/ai/chat`

**Request:**
```json
{
  "prompt": "Create a main page with volume controls and scene buttons",
  "provider": "gemini",
  "temperature": 0.7
}
```

**Parameters:**
- `prompt` (required): Natural language description
- `provider` (optional): `"claude"`, `"openai"`, or `"gemini"` (default: `"claude"`)
- `model` (optional): Override default model
- `temperature` (optional): 0.0-1.0 (default: 0.7)

**Response:**
```json
{
  "success": true,
  "result": {
    "modifiedFiles": [
      "gui/pages/main.json",
      "gui/components/volume-slider.json"
    ],
    "deletedFiles": [],
    "explanation": "Created a main page with volume controls...",
    "warnings": [],
    "errors": []
  },
  "usage": {
    "inputTokens": 523,
    "outputTokens": 1847,
    "totalTokens": 2370,
    "cost": {
      "input": 0.001569,
      "output": 0.027705,
      "total": 0.029274
    }
  },
  "provider": "claude",
  "model": "claude-3-5-sonnet-20241022"
}
```

### List AI Providers

**GET** `/api/controllers/:controllerId/ai/providers`

**Response:**
```json
{
  "providers": [
    {
      "name": "claude",
      "available": true,
      "hasBYOK": false,
      "hasPlatform": true,
      "info": {
        "name": "Claude",
        "provider": "Anthropic",
        "model": "claude-3-5-sonnet-20241022",
        "pricing": {
          "input": 3.00,
          "output": 15.00
        }
      }
    },
    {
      "name": "gemini",
      "available": true,
      "hasBYOK": false,
      "hasPlatform": true,
      "info": {
        "name": "Gemini",
        "provider": "Google",
        "model": "gemini-2.0-flash-exp",
        "pricing": {
          "input": 0.00,
          "output": 0.00
        }
      }
    }
  ]
}
```

### Save BYOK API Key

**POST** `/api/ai/keys`

**Request:**
```json
{
  "provider": "claude",
  "apiKey": "sk-ant-your-api-key-here"
}
```

**Response:**
```json
{
  "message": "API key saved successfully",
  "provider": "claude"
}
```

### Delete BYOK API Key

**DELETE** `/api/ai/keys/:provider`

### Get AI Usage Stats

**GET** `/api/ai/usage?days=30`

**Response:**
```json
{
  "usage": {
    "period": "Last 30 days",
    "totalRequests": 42,
    "totalTokens": 98543,
    "totalCost": 1.23,
    "byProvider": {
      "claude": {
        "requests": 25,
        "tokens": 65432,
        "cost": 0.98
      },
      "gemini": {
        "requests": 17,
        "tokens": 33111,
        "cost": 0.00
      }
    }
  }
}
```

---

## GUI Management

Manage draft/deployed/live GUI files.

### Get GUI Status

**GET** `/api/controllers/:controllerId/gui/status`

**Response:**
```json
{
  "status": {
    "draftFileCount": 3,
    "deployedFileCount": 2,
    "deployedVersion": 5,
    "liveVersion": 4,
    "hasUndeployedChanges": true,
    "needsSync": true
  }
}
```

### Get Draft Files (Preview)

**GET** `/api/controllers/:controllerId/gui/files/draft`

**Response:**
```json
{
  "files": {
    "gui/pages/main.json": {
      "name": "Main Page",
      "elements": [...]
    },
    "gui/components/volume-slider.json": {
      "type": "slider",
      "control": {...}
    }
  }
}
```

### Deploy Draft to Deployed

**POST** `/api/controllers/:controllerId/gui/deploy`

**Request:**
```json
{
  "commitMessage": "Added volume controls to main page"
}
```

**Response:**
```json
{
  "message": "Files deployed successfully",
  "version": 6,
  "filesDeployed": 3,
  "timestamp": "2025-10-08T10:00:00Z"
}
```

### Sync Deployed to NUC

**POST** `/api/controllers/:controllerId/gui/sync`

**Response:**
```json
{
  "message": "Sync initiated",
  "syncId": "uuid",
  "version": 6,
  "fileCount": 3
}
```

**OR** if controller offline:
```json
{
  "error": "Controller offline",
  "message": "Controller is not connected via WebSocket"
}
```

### Get Sync History

**GET** `/api/controllers/:controllerId/gui/sync/history?limit=20`

**Response:**
```json
{
  "history": [
    {
      "id": "uuid",
      "version_number": 6,
      "status": "completed",
      "started_at": "2025-10-08T10:00:00Z",
      "completed_at": "2025-10-08T10:00:05Z",
      "duration_ms": 5000,
      "files_synced": 3,
      "error_message": null
    }
  ]
}
```

### Discard Draft Changes

**POST** `/api/controllers/:controllerId/gui/discard`

**Response:**
```json
{
  "message": "Draft changes discarded",
  "filesReverted": 3
}
```

### Rollback to Previous Version

**POST** `/api/controllers/:controllerId/gui/rollback`

**Request:**
```json
{
  "version": 5
}
```

**Response:**
```json
{
  "message": "Rolled back to version",
  "version": 5,
  "filesRestored": 2
}
```

### Get Version History

**GET** `/api/controllers/:controllerId/gui/versions?limit=20`

**Response:**
```json
{
  "versions": [
    {
      "version_number": 6,
      "commit_message": "Added volume controls",
      "created_at": "2025-10-08T10:00:00Z",
      "created_by": "user-id",
      "file_count": 3
    },
    {
      "version_number": 5,
      "commit_message": "Initial layout",
      "created_at": "2025-10-07T15:00:00Z",
      "created_by": "user-id",
      "file_count": 2
    }
  ]
}
```

---

## Images

Upload and manage images for GUIs (requires Cloudflare R2 configuration).

### Upload Image

**POST** `/api/images/upload`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `image`: Image file (max 10MB, JPG/PNG/GIF/WEBP/SVG)

**Response:**
```json
{
  "message": "Image uploaded successfully",
  "image": {
    "filename": "integrator-id/1696780800-abc123.png",
    "url": "https://your-bucket.r2.dev/integrator-id/1696780800-abc123.png",
    "size": 245678,
    "sizeFormatted": "239.92 KB"
  }
}
```

### List Images

**GET** `/api/images?limit=100`

**Response:**
```json
{
  "images": [
    {
      "id": "uuid",
      "filename": "integrator-id/1696780800-abc123.png",
      "url": "https://...",
      "mimeType": "image/png",
      "size": 245678,
      "sizeFormatted": "239.92 KB",
      "createdAt": "2025-10-08T10:00:00Z"
    }
  ]
}
```

### Delete Image

**DELETE** `/api/images/:integratorPath/:filename`

Example: `DELETE /api/images/uuid-123/1696780800-abc123.png`

### Check Image Storage Status

**GET** `/api/images/status`

**Response:**
```json
{
  "enabled": false,
  "message": "Image storage not configured (missing R2 credentials)"
}
```

---

## WebSocket Protocol

Controllers connect via WebSocket for real-time sync and control.

**URL:** `wss://backend-production-baec.up.railway.app?key=<connection_key>`

### Connection

1. Controller connects with `connection_key` from database
2. Server validates key and responds with `connected` message
3. Server updates controller status to `online`

**Connected Message (Server → Controller):**
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

### Heartbeat

**Every 30 seconds:**

**Controller → Server:**
```json
{
  "type": "heartbeat"
}
```

**Server → Controller:**
```json
{
  "type": "heartbeat_ack",
  "timestamp": "2025-10-08T10:00:00Z"
}
```

### Config Updates

When devices/controls/scenes are added/updated/deleted via API:

**Server → Controller:**
```json
{
  "type": "config_update",
  "timestamp": "2025-10-08T10:00:00Z",
  "data": {
    "config_type": "device_added",
    "device": {
      "id": "uuid",
      "device_id": "dsp_main",
      "name": "Harvey DSP"
    }
  }
}
```

**Config Types:**
- `device_added`, `device_updated`, `device_deleted`
- `control_added`, `control_updated`, `control_deleted`
- `scene_added`, `scene_updated`, `scene_deleted`

### Scene Execution

**Server → Controller:**
```json
{
  "type": "execute_scene",
  "timestamp": "2025-10-08T10:00:00Z",
  "data": {
    "scene_id": "scene_presentation"
  }
}
```

**Controller → Server (Result):**
```json
{
  "type": "execution_result",
  "data": {
    "scene_id": "scene_presentation",
    "status": "completed",
    "steps_executed": 3,
    "errors": []
  }
}
```

### GUI Sync

**Server → Controller:**
```json
{
  "type": "gui_sync",
  "timestamp": "2025-10-08T10:00:00Z",
  "data": {
    "sync_id": "uuid",
    "version": 6,
    "files": {
      "gui/pages/main.json": { ... },
      "gui/components/volume.json": { ... }
    }
  }
}
```

**Controller → Server (Progress):**
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

**Controller → Server (Complete):**
```json
{
  "type": "sync_complete",
  "data": {
    "sync_id": "uuid",
    "version": 6,
    "status": "completed",
    "files_synced": 2,
    "duration_ms": 3500
  }
}
```

**Controller → Server (Error):**
```json
{
  "type": "sync_error",
  "data": {
    "sync_id": "uuid",
    "error_message": "Failed to write file: permission denied"
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

**Common Status Codes:**
- `400` - Bad Request (validation failed)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error
- `503` - Service Unavailable (feature not configured)

---

## Rate Limiting

Currently not implemented. Future versions will have:
- 100 requests/minute per user
- 10 AI requests/hour per user
- Custom limits per subscription tier

---

## Changelog

### v1.0.0 (October 8, 2025)
- Initial release
- Full CRUD for projects, controllers, devices, controls, scenes
- AI chat with 3 providers (Claude, OpenAI, Gemini)
- GUI file management (draft/deploy/sync)
- WebSocket real-time sync
- Image upload (with R2)
- BYOK support
