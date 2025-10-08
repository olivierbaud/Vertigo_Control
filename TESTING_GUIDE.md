# Testing Guide - Vertigo Control API

This guide walks you through testing the complete workflow from project creation to GUI deployment.

---

## Prerequisites

1. **Thunder Client** (VSCode extension) or **Postman** installed
2. **Railway deployment** running
3. **Base URL**: `https://backend-production-baec.up.railway.app`

---

## Import Thunder Client Collection

1. Open VSCode
2. Click Thunder Client icon in sidebar
3. Click "Collections" → "Import"
4. Select `thunder-collection.json`
5. All requests will be imported with environment variables

---

## Test Workflow

### Step 1: Authentication

**1.1 Register** (one time only)
```
POST /api/auth/register
Body:
{
  "name": "Test Integration Company",
  "email": "test@example.com",
  "password": "test123"
}
```

✅ **Expected:** `201 Created` + JWT token
❌ **If 409 Conflict:** Email already exists, proceed to login

**1.2 Login**
```
POST /api/auth/login
Body:
{
  "email": "test@example.com",
  "password": "test123"
}
```

✅ **Expected:** `200 OK` + JWT token
📝 **Copy the `token` value** - you'll need it for all requests

**Thunder Client:** Token is auto-saved to `{{token}}` variable

---

### Step 2: Create Project

```
POST /api/projects
Headers: Authorization: Bearer {{token}}
Body:
{
  "name": "Test Project - Main Office",
  "customer_name": "Acme Corp",
  "location": "New York, NY"
}
```

✅ **Expected:** `201 Created` + project object
📝 **Copy `project.id`** - save as `{{projectId}}`

**Verify:**
```
GET /api/projects
Headers: Authorization: Bearer {{token}}
```
✅ Should see your project in the list

---

### Step 3: Create Controller

```
POST /api/projects/{{projectId}}/controllers
Headers: Authorization: Bearer {{token}}
Body:
{
  "name": "Main Floor NUC"
}
```

✅ **Expected:** `201 Created` + controller object
📝 **Copy `controller.id`** - save as `{{controllerId}}`
📝 **Copy `controller.connection_key`** - needed for WebSocket connection

**Verify:**
```
GET /api/projects/{{projectId}}/controllers
Headers: Authorization: Bearer {{token}}
```
✅ Controller should show `status: "offline"` (no NUC connected yet)

---

### Step 4: Create Device

```
POST /api/controllers/{{controllerId}}/devices
Headers: Authorization: Bearer {{token}}
Body:
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

✅ **Expected:** `201 Created` + device object
📝 **Copy `device.id`** - save as `{{deviceId}}`

**Verify:**
```
GET /api/controllers/{{controllerId}}/devices
Headers: Authorization: Bearer {{token}}
```

---

### Step 5: Create Device Controls

Create several controls to test with:

**5.1 Master Volume Control**
```
POST /api/devices/{{deviceId}}/controls
Headers: Authorization: Bearer {{token}}
Body:
{
  "control_id": "ctrl_master_volume",
  "logical_name": "Master Volume",
  "control_type": "gain",
  "block_id": "dsp.0.gain.0"
}
```

**5.2 Microphone Mute**
```
POST /api/devices/{{deviceId}}/controls
Headers: Authorization: Bearer {{token}}
Body:
{
  "control_id": "ctrl_mic_mute",
  "logical_name": "Microphone Mute",
  "control_type": "mute",
  "block_id": "dsp.0.mute.1"
}
```

**5.3 Zone A Volume**
```
POST /api/devices/{{deviceId}}/controls
Headers: Authorization: Bearer {{token}}
Body:
{
  "control_id": "ctrl_zone_a_volume",
  "logical_name": "Zone A Volume",
  "control_type": "gain",
  "block_id": "dsp.0.gain.2"
}
```

**Verify:**
```
GET /api/devices/{{deviceId}}/controls
Headers: Authorization: Bearer {{token}}
```
✅ Should see all 3 controls

---

### Step 6: Create Scene

```
POST /api/controllers/{{controllerId}}/scenes
Headers: Authorization: Bearer {{token}}
Body:
{
  "scene_id": "scene_presentation",
  "name": "Presentation Mode",
  "description": "Set volumes for presentation",
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

✅ **Expected:** `201 Created` + scene object
📝 **Copy `scene.id`** - save as `{{sceneId}}`

**Verify:**
```
GET /api/controllers/{{controllerId}}/scenes
Headers: Authorization: Bearer {{token}}
```

---

### Step 7: Test AI Chat (Optional - requires API key)

**7.1 Check Available Providers**
```
GET /api/controllers/{{controllerId}}/ai/providers
Headers: Authorization: Bearer {{token}}
```

✅ **Expected:** List of 3 providers (claude, openai, gemini)
⚠️ Check `available: true` - requires API key in Railway

**7.2 Chat with AI**
```
POST /api/controllers/{{controllerId}}/ai/chat
Headers: Authorization: Bearer {{token}}
Body:
{
  "prompt": "Create a main page with volume sliders and scene buttons for presentation mode",
  "provider": "gemini"
}
```

✅ **Expected:** `200 OK` + generated GUI files
❌ **If 503:** AI provider not configured (no API key in Railway)

**Response structure:**
```json
{
  "success": true,
  "result": {
    "modifiedFiles": ["gui/pages/main.json", ...],
    "explanation": "Created a main page...",
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

### Step 8: GUI Management

**8.1 Check GUI Status**
```
GET /api/controllers/{{controllerId}}/gui/status
Headers: Authorization: Bearer {{token}}
```

**Expected response:**
```json
{
  "status": {
    "draftFileCount": 3,
    "deployedFileCount": 0,
    "deployedVersion": null,
    "liveVersion": null,
    "hasUndeployedChanges": true,
    "needsSync": false
  }
}
```

**8.2 Preview Draft Files**
```
GET /api/controllers/{{controllerId}}/gui/files/draft
Headers: Authorization: Bearer {{token}}
```

✅ **Expected:** JSON object with all draft GUI files

**8.3 Deploy Draft → Deployed**
```
POST /api/controllers/{{controllerId}}/gui/deploy
Headers: Authorization: Bearer {{token}}
Body:
{
  "commitMessage": "Initial GUI layout with volume controls"
}
```

✅ **Expected:**
```json
{
  "message": "Files deployed successfully",
  "version": 1,
  "filesDeployed": 3,
  "timestamp": "..."
}
```

**8.4 Check Status Again**
```
GET /api/controllers/{{controllerId}}/gui/status
```

✅ **Expected:**
```json
{
  "status": {
    "draftFileCount": 3,
    "deployedFileCount": 3,
    "deployedVersion": 1,
    "liveVersion": null,
    "hasUndeployedChanges": false,
    "needsSync": true
  }
}
```

**8.5 Sync to NUC**
```
POST /api/controllers/{{controllerId}}/gui/sync
Headers: Authorization: Bearer {{token}}
```

✅ **Expected (if NUC connected):**
```json
{
  "message": "Sync initiated",
  "syncId": "uuid",
  "version": 1,
  "fileCount": 3
}
```

❌ **Expected (no NUC connected):**
```json
{
  "error": "Controller offline",
  "message": "Controller is not connected via WebSocket"
}
```

**8.6 View Sync History**
```
GET /api/controllers/{{controllerId}}/gui/sync/history
Headers: Authorization: Bearer {{token}}
```

**8.7 View Version History**
```
GET /api/controllers/{{controllerId}}/gui/versions
Headers: Authorization: Bearer {{token}}
```

---

### Step 9: Test Scene Execution (requires NUC connected)

```
POST /api/controllers/{{controllerId}}/scenes/{{sceneId}}/execute
Headers: Authorization: Bearer {{token}}
```

✅ **Expected (NUC online):** `200 OK` + "Scene execution triggered"
❌ **Expected (NUC offline):** `503` + "Controller offline"

---

## Expected States Throughout Workflow

### After Authentication
- ✅ Have JWT token
- ✅ Can access protected endpoints

### After Project Creation
```
Projects: 1
Controllers: 0
Devices: 0
Controls: 0
Scenes: 0
GUI Files: 0
```

### After Controller Creation
```
Projects: 1
Controllers: 1 (status: offline)
Devices: 0
Controls: 0
Scenes: 0
GUI Files: 0
```

### After Device Creation
```
Projects: 1
Controllers: 1
Devices: 1
Controls: 0
Scenes: 0
GUI Files: 0
```

### After Control Creation
```
Projects: 1
Controllers: 1
Devices: 1
Controls: 3
Scenes: 0
GUI Files: 0
```

### After Scene Creation
```
Projects: 1
Controllers: 1
Devices: 1
Controls: 3
Scenes: 1
GUI Files: 0
```

### After AI Chat
```
Projects: 1
Controllers: 1
Devices: 1
Controls: 3
Scenes: 1
GUI Files: 3 (draft)
```

### After Deploy
```
Projects: 1
Controllers: 1
Devices: 1
Controls: 3
Scenes: 1
GUI Files: 3 (draft) + 3 (deployed)
Version: 1
```

### After Sync (NUC connected)
```
Projects: 1
Controllers: 1 (status: online)
Devices: 1
Controls: 3
Scenes: 1
GUI Files: 3 (draft) + 3 (deployed) + 3 (live on NUC)
Version: 1 (deployed) + 1 (live)
```

---

## Common Issues & Solutions

### Issue: 401 Unauthorized
**Cause:** Token missing or expired
**Solution:** Login again to get new token

### Issue: 404 Not Found
**Cause:** Using wrong ID (projectId, controllerId, etc.)
**Solution:** Verify IDs from previous responses

### Issue: 503 AI provider not configured
**Cause:** No AI API key in Railway environment
**Solution:** Add `GEMINI_API_KEY` to Railway variables (free)

### Issue: 503 Controller offline (scene execution)
**Cause:** No NUC connected via WebSocket
**Solution:** Normal - can't execute scenes without NUC

### Issue: 400 No draft files to deploy
**Cause:** Haven't used AI chat yet
**Solution:** Use AI chat first, or manually create GUI files

---

## Success Criteria

✅ **Authentication works** - Can register/login
✅ **Project CRUD works** - Can create, read, update projects
✅ **Controller management works** - Can create controllers
✅ **Device management works** - Can create devices
✅ **Control mapping works** - Can create controls
✅ **Scene management works** - Can create scenes
✅ **AI chat works** (if API key configured)
✅ **GUI deployment works** - Can deploy draft → deployed
✅ **Version control works** - Can view versions, rollback
✅ **WebSocket protocol works** (when NUC connects)

---

## Next Steps

After completing this workflow:

1. **Test Rollback:** Create multiple versions, test rollback
2. **Test Discard:** Modify draft, discard changes
3. **Test Updates:** Update devices/controls/scenes
4. **Test Deletions:** Delete resources (reverse order)
5. **Test Permissions:** Try accessing other user's projects (should fail)

---

## Automated Testing

Run the integration test suite:
```bash
npm test
```

Or individual test files:
```bash
node test-sprint5.js          # Week 1 tests
node test-sprint5-week2.js    # Week 2 tests
```

---

**Happy Testing!** 🧪
