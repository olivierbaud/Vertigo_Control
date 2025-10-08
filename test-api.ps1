# Vertigo Control API Testing Script - PowerShell Version
# Free alternative to Thunder Client using Invoke-RestMethod

# Configuration
$BaseUrl = "https://backend-production-baec.up.railway.app"
$Token = ""
$ProjectId = ""
$ControllerId = ""
$DeviceId = ""
$SceneId = ""

# Helper functions for colored output
function Print-Header {
    param([string]$Message)
    Write-Host "`n========================================" -ForegroundColor Blue
    Write-Host $Message -ForegroundColor Blue
    Write-Host "========================================`n" -ForegroundColor Blue
}

function Print-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Print-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Print-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Yellow
}

# ===========================================
# STEP 1: AUTHENTICATION
# ===========================================

function Test-Register {
    Print-Header "STEP 1.1: Register New User"

    try {
        $Body = @{
            name = "Test Integration Company"
            email = "test@example.com"
            password = "test123"
        } | ConvertTo-Json

        $Response = Invoke-RestMethod -Uri "$BaseUrl/api/auth/register" `
            -Method Post `
            -ContentType "application/json" `
            -Body $Body `
            -ErrorAction Stop

        Print-Success "Registration successful"
        $script:Token = $Response.token
        if ($Token.Length -gt 20) {
            Print-Info "Token saved: $($Token.Substring(0, 20))..."
        }
        $Response | ConvertTo-Json -Depth 10
    }
    catch {
        if ($_.Exception.Response.StatusCode -eq 409) {
            Print-Info "User already exists, proceed to login"
        }
        else {
            Print-Error "Registration failed: $($_.Exception.Message)"
        }
    }
}

function Test-Login {
    Print-Header "STEP 1.2: Login"

    try {
        $Body = @{
            email = "test@example.com"
            password = "test123"
        } | ConvertTo-Json

        $Response = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" `
            -Method Post `
            -ContentType "application/json" `
            -Body $Body `
            -ErrorAction Stop

        Print-Success "Login successful"
        $script:Token = $Response.token
        if ($Token.Length -gt 20) {
            Print-Info "Token saved: $($Token.Substring(0, 20))..."
        }
        $Response | ConvertTo-Json -Depth 10
    }
    catch {
        Print-Error "Login failed: $($_.Exception.Message)"
        exit 1
    }
}

# ===========================================
# STEP 2: PROJECT MANAGEMENT
# ===========================================

function Test-CreateProject {
    Print-Header "STEP 2: Create Project"

    try {
        $Headers = @{
            "Authorization" = "Bearer $Token"
        }

        $Body = @{
            name = "Test Project - Main Office"
            customer_name = "Acme Corp"
            location = "New York, NY"
        } | ConvertTo-Json

        $Response = Invoke-RestMethod -Uri "$BaseUrl/api/projects" `
            -Method Post `
            -Headers $Headers `
            -ContentType "application/json" `
            -Body $Body `
            -ErrorAction Stop

        Print-Success "Project created"
        $script:ProjectId = $Response.id
        Print-Info "Project ID saved: $ProjectId"
        $Response | ConvertTo-Json -Depth 10
    }
    catch {
        Print-Error "Project creation failed: $($_.Exception.Message)"
        exit 1
    }
}

function Test-ListProjects {
    Print-Header "Verify: List Projects"

    try {
        $Headers = @{
            "Authorization" = "Bearer $Token"
        }

        $Response = Invoke-RestMethod -Uri "$BaseUrl/api/projects" `
            -Method Get `
            -Headers $Headers `
            -ErrorAction Stop

        Print-Success "Projects retrieved"
        $Response | ConvertTo-Json -Depth 10
    }
    catch {
        Print-Error "Failed to retrieve projects: $($_.Exception.Message)"
    }
}

# ===========================================
# STEP 3: CONTROLLER MANAGEMENT
# ===========================================

function Test-CreateController {
    Print-Header "STEP 3: Create Controller"

    try {
        $Headers = @{
            "Authorization" = "Bearer $Token"
        }

        $Body = @{
            name = "Main Floor NUC"
        } | ConvertTo-Json

        $Response = Invoke-RestMethod -Uri "$BaseUrl/api/projects/$ProjectId/controllers" `
            -Method Post `
            -Headers $Headers `
            -ContentType "application/json" `
            -Body $Body `
            -ErrorAction Stop

        Print-Success "Controller created"
        $script:ControllerId = $Response.id
        Print-Info "Controller ID saved: $ControllerId"
        Print-Info "Connection Key: $($Response.connection_key)"
        $Response | ConvertTo-Json -Depth 10
    }
    catch {
        Print-Error "Controller creation failed: $($_.Exception.Message)"
        exit 1
    }
}

function Test-ListControllers {
    Print-Header "Verify: List Controllers"

    try {
        $Headers = @{
            "Authorization" = "Bearer $Token"
        }

        $Response = Invoke-RestMethod -Uri "$BaseUrl/api/projects/$ProjectId/controllers" `
            -Method Get `
            -Headers $Headers `
            -ErrorAction Stop

        Print-Success "Controllers retrieved"
        $Response | ConvertTo-Json -Depth 10
    }
    catch {
        Print-Error "Failed to retrieve controllers: $($_.Exception.Message)"
    }
}

# ===========================================
# STEP 4: DEVICE MANAGEMENT
# ===========================================

function Test-CreateDevice {
    Print-Header "STEP 4: Create Device"

    try {
        $Headers = @{
            "Authorization" = "Bearer $Token"
        }

        $Body = @{
            device_id = "dsp_main"
            name = "Harvey DSP - Main Room"
            type = "harvey_dsp"
            connection_config = @{
                host = "192.168.1.50"
                port = 3004
            }
        } | ConvertTo-Json -Depth 10

        $Response = Invoke-RestMethod -Uri "$BaseUrl/api/controllers/$ControllerId/devices" `
            -Method Post `
            -Headers $Headers `
            -ContentType "application/json" `
            -Body $Body `
            -ErrorAction Stop

        Print-Success "Device created"
        $script:DeviceId = $Response.id
        Print-Info "Device ID saved: $DeviceId"
        $Response | ConvertTo-Json -Depth 10
    }
    catch {
        Print-Error "Device creation failed: $($_.Exception.Message)"
        exit 1
    }
}

function Test-ListDevices {
    Print-Header "Verify: List Devices"

    try {
        $Headers = @{
            "Authorization" = "Bearer $Token"
        }

        $Response = Invoke-RestMethod -Uri "$BaseUrl/api/controllers/$ControllerId/devices" `
            -Method Get `
            -Headers $Headers `
            -ErrorAction Stop

        Print-Success "Devices retrieved"
        $Response | ConvertTo-Json -Depth 10
    }
    catch {
        Print-Error "Failed to retrieve devices: $($_.Exception.Message)"
    }
}

# ===========================================
# STEP 5: DEVICE CONTROLS
# ===========================================

function Test-CreateControls {
    Print-Header "STEP 5: Create Device Controls"

    $Headers = @{
        "Authorization" = "Bearer $Token"
    }

    # 5.1 Master Volume
    Print-Info "Creating Master Volume control..."
    try {
        $Body = @{
            control_id = "ctrl_master_volume"
            logical_name = "Master Volume"
            control_type = "gain"
            block_id = "dsp.0.gain.0"
        } | ConvertTo-Json

        $Response = Invoke-RestMethod -Uri "$BaseUrl/api/devices/$DeviceId/controls" `
            -Method Post `
            -Headers $Headers `
            -ContentType "application/json" `
            -Body $Body `
            -ErrorAction Stop

        Print-Success "Master Volume control created"
    }
    catch {
        Print-Error "Master Volume creation failed"
    }

    # 5.2 Microphone Mute
    Print-Info "Creating Microphone Mute control..."
    try {
        $Body = @{
            control_id = "ctrl_mic_mute"
            logical_name = "Microphone Mute"
            control_type = "mute"
            block_id = "dsp.0.mute.1"
        } | ConvertTo-Json

        $Response = Invoke-RestMethod -Uri "$BaseUrl/api/devices/$DeviceId/controls" `
            -Method Post `
            -Headers $Headers `
            -ContentType "application/json" `
            -Body $Body `
            -ErrorAction Stop

        Print-Success "Microphone Mute control created"
    }
    catch {
        Print-Error "Microphone Mute creation failed"
    }

    # 5.3 Zone A Volume
    Print-Info "Creating Zone A Volume control..."
    try {
        $Body = @{
            control_id = "ctrl_zone_a_volume"
            logical_name = "Zone A Volume"
            control_type = "gain"
            block_id = "dsp.0.gain.2"
        } | ConvertTo-Json

        $Response = Invoke-RestMethod -Uri "$BaseUrl/api/devices/$DeviceId/controls" `
            -Method Post `
            -Headers $Headers `
            -ContentType "application/json" `
            -Body $Body `
            -ErrorAction Stop

        Print-Success "Zone A Volume control created"
    }
    catch {
        Print-Error "Zone A Volume creation failed"
    }
}

function Test-ListControls {
    Print-Header "Verify: List Controls"

    try {
        $Headers = @{
            "Authorization" = "Bearer $Token"
        }

        $Response = Invoke-RestMethod -Uri "$BaseUrl/api/devices/$DeviceId/controls" `
            -Method Get `
            -Headers $Headers `
            -ErrorAction Stop

        Print-Success "Controls retrieved"
        $Response | ConvertTo-Json -Depth 10
    }
    catch {
        Print-Error "Failed to retrieve controls: $($_.Exception.Message)"
    }
}

# ===========================================
# STEP 6: SCENE MANAGEMENT
# ===========================================

function Test-CreateScene {
    Print-Header "STEP 6: Create Scene"

    try {
        $Headers = @{
            "Authorization" = "Bearer $Token"
        }

        $Body = @{
            scene_id = "scene_presentation"
            name = "Presentation Mode"
            description = "Set volumes for presentation"
            steps = @(
                @{
                    device = "dsp_main"
                    control = "ctrl_master_volume"
                    value = 70
                    delay = 0
                },
                @{
                    device = "dsp_main"
                    control = "ctrl_mic_mute"
                    value = $false
                    delay = 500
                }
            )
            continue_on_error = $false
        } | ConvertTo-Json -Depth 10

        $Response = Invoke-RestMethod -Uri "$BaseUrl/api/controllers/$ControllerId/scenes" `
            -Method Post `
            -Headers $Headers `
            -ContentType "application/json" `
            -Body $Body `
            -ErrorAction Stop

        Print-Success "Scene created"
        $script:SceneId = $Response.id
        Print-Info "Scene ID saved: $SceneId"
        $Response | ConvertTo-Json -Depth 10
    }
    catch {
        Print-Error "Scene creation failed: $($_.Exception.Message)"
        exit 1
    }
}

function Test-ListScenes {
    Print-Header "Verify: List Scenes"

    try {
        $Headers = @{
            "Authorization" = "Bearer $Token"
        }

        $Response = Invoke-RestMethod -Uri "$BaseUrl/api/controllers/$ControllerId/scenes" `
            -Method Get `
            -Headers $Headers `
            -ErrorAction Stop

        Print-Success "Scenes retrieved"
        $Response | ConvertTo-Json -Depth 10
    }
    catch {
        Print-Error "Failed to retrieve scenes: $($_.Exception.Message)"
    }
}

# ===========================================
# STEP 7: AI CHAT (Optional)
# ===========================================

function Test-AIProviders {
    Print-Header "STEP 7.1: Check AI Providers"

    try {
        $Headers = @{
            "Authorization" = "Bearer $Token"
        }

        $Response = Invoke-RestMethod -Uri "$BaseUrl/api/controllers/$ControllerId/ai/providers" `
            -Method Get `
            -Headers $Headers `
            -ErrorAction Stop

        Print-Success "AI providers retrieved"
        $Response | ConvertTo-Json -Depth 10
    }
    catch {
        Print-Error "Failed to retrieve AI providers: $($_.Exception.Message)"
    }
}

function Test-AIChat {
    Print-Header "STEP 7.2: AI Chat"

    try {
        $Headers = @{
            "Authorization" = "Bearer $Token"
        }

        $Body = @{
            prompt = "Create a main page with volume sliders and scene buttons for presentation mode"
            provider = "gemini"
        } | ConvertTo-Json

        $Response = Invoke-RestMethod -Uri "$BaseUrl/api/controllers/$ControllerId/ai/chat" `
            -Method Post `
            -Headers $Headers `
            -ContentType "application/json" `
            -Body $Body `
            -ErrorAction Stop

        Print-Success "AI chat successful"
        $Response | ConvertTo-Json -Depth 10
    }
    catch {
        if ($_.Exception.Response.StatusCode -eq 503) {
            Print-Info "AI provider not configured (no API key)"
        }
        else {
            Print-Error "AI chat failed: $($_.Exception.Message)"
        }
    }
}

# ===========================================
# STEP 8: GUI MANAGEMENT
# ===========================================

function Test-GUIStatus {
    Print-Header "STEP 8.1: Check GUI Status"

    try {
        $Headers = @{
            "Authorization" = "Bearer $Token"
        }

        $Response = Invoke-RestMethod -Uri "$BaseUrl/api/controllers/$ControllerId/gui/status" `
            -Method Get `
            -Headers $Headers `
            -ErrorAction Stop

        Print-Success "GUI status retrieved"
        $Response | ConvertTo-Json -Depth 10
    }
    catch {
        Print-Error "Failed to retrieve GUI status: $($_.Exception.Message)"
    }
}

function Test-GUIDraftFiles {
    Print-Header "STEP 8.2: Preview Draft Files"

    try {
        $Headers = @{
            "Authorization" = "Bearer $Token"
        }

        $Response = Invoke-RestMethod -Uri "$BaseUrl/api/controllers/$ControllerId/gui/files/draft" `
            -Method Get `
            -Headers $Headers `
            -ErrorAction Stop

        Print-Success "Draft files retrieved"
        $Response | ConvertTo-Json -Depth 10
    }
    catch {
        Print-Error "Failed to retrieve draft files: $($_.Exception.Message)"
    }
}

function Test-GUIDeploy {
    Print-Header "STEP 8.3: Deploy GUI"

    try {
        $Headers = @{
            "Authorization" = "Bearer $Token"
        }

        $Body = @{
            commitMessage = "Initial GUI layout with volume controls"
        } | ConvertTo-Json

        $Response = Invoke-RestMethod -Uri "$BaseUrl/api/controllers/$ControllerId/gui/deploy" `
            -Method Post `
            -Headers $Headers `
            -ContentType "application/json" `
            -Body $Body `
            -ErrorAction Stop

        Print-Success "GUI deployed successfully"
        $Response | ConvertTo-Json -Depth 10
    }
    catch {
        Print-Error "GUI deployment failed: $($_.Exception.Message)"
    }
}

function Test-GUISync {
    Print-Header "STEP 8.5: Sync to NUC"

    try {
        $Headers = @{
            "Authorization" = "Bearer $Token"
        }

        $Response = Invoke-RestMethod -Uri "$BaseUrl/api/controllers/$ControllerId/gui/sync" `
            -Method Post `
            -Headers $Headers `
            -ErrorAction Stop

        Print-Success "Sync initiated"
        $Response | ConvertTo-Json -Depth 10
    }
    catch {
        Print-Info "Controller offline (expected if NUC not connected)"
    }
}

function Test-GUISyncHistory {
    Print-Header "STEP 8.6: View Sync History"

    try {
        $Headers = @{
            "Authorization" = "Bearer $Token"
        }

        $Response = Invoke-RestMethod -Uri "$BaseUrl/api/controllers/$ControllerId/gui/sync/history" `
            -Method Get `
            -Headers $Headers `
            -ErrorAction Stop

        Print-Success "Sync history retrieved"
        $Response | ConvertTo-Json -Depth 10
    }
    catch {
        Print-Error "Failed to retrieve sync history: $($_.Exception.Message)"
    }
}

function Test-GUIVersions {
    Print-Header "STEP 8.7: View Version History"

    try {
        $Headers = @{
            "Authorization" = "Bearer $Token"
        }

        $Response = Invoke-RestMethod -Uri "$BaseUrl/api/controllers/$ControllerId/gui/versions" `
            -Method Get `
            -Headers $Headers `
            -ErrorAction Stop

        Print-Success "Version history retrieved"
        $Response | ConvertTo-Json -Depth 10
    }
    catch {
        Print-Error "Failed to retrieve version history: $($_.Exception.Message)"
    }
}

# ===========================================
# STEP 9: SCENE EXECUTION
# ===========================================

function Test-SceneExecution {
    Print-Header "STEP 9: Test Scene Execution"

    try {
        $Headers = @{
            "Authorization" = "Bearer $Token"
        }

        $Response = Invoke-RestMethod -Uri "$BaseUrl/api/controllers/$ControllerId/scenes/$SceneId/execute" `
            -Method Post `
            -Headers $Headers `
            -ErrorAction Stop

        Print-Success "Scene execution triggered"
        $Response | ConvertTo-Json -Depth 10
    }
    catch {
        Print-Info "Controller offline (expected if NUC not connected)"
    }
}

# ===========================================
# MAIN EXECUTION
# ===========================================

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "║   Vertigo Control API Test Suite      ║" -ForegroundColor Blue
Write-Host "║   PowerShell Version                   ║" -ForegroundColor Blue
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""

# Authentication
Test-Register
Test-Login

# Project Management
Test-CreateProject
Test-ListProjects

# Controller Management
Test-CreateController
Test-ListControllers

# Device Management
Test-CreateDevice
Test-ListDevices

# Device Controls
Test-CreateControls
Test-ListControls

# Scene Management
Test-CreateScene
Test-ListScenes

# AI Chat (Optional)
Test-AIProviders
Test-AIChat

# GUI Management
Test-GUIStatus
Test-GUIDraftFiles
Test-GUIDeploy
Test-GUIStatus  # Check status again after deploy
Test-GUISync
Test-GUISyncHistory
Test-GUIVersions

# Scene Execution
Test-SceneExecution

Print-Header "TEST SUITE COMPLETE"
Print-Success "All tests executed!"
if ($Token.Length -gt 20) {
    Print-Info "Token: $($Token.Substring(0, 20))..."
} else {
    Print-Info "Token: $Token"
}
Print-Info "Project ID: $ProjectId"
Print-Info "Controller ID: $ControllerId"
Print-Info "Device ID: $DeviceId"
Print-Info "Scene ID: $SceneId"
