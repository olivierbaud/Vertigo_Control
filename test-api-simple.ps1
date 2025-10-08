# Simple API Test Script for Vertigo Control
$BaseUrl = "https://backend-production-baec.up.railway.app"

Write-Host "`n=== STEP 1: Register New User ===" -ForegroundColor Cyan

# Generate unique email for this test run
$timestamp = [DateTimeOffset]::Now.ToUnixTimeSeconds()
$email = "test$timestamp@example.com"
Write-Host "[INFO] Using email: $email" -ForegroundColor Yellow

$registerBody = @{
    name = "Test Integration Company"
    email = $email
    password = "test12345"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$BaseUrl/api/auth/register" -Method Post -ContentType "application/json" -Body $registerBody
    $token = $registerResponse.token
    Write-Host "[OK] Registered successfully" -ForegroundColor Green
    Write-Host "Token: $($token.Substring(0,30))..." -ForegroundColor Yellow
} catch {
    Write-Host "[ERROR] Registration failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== STEP 2: Create Project ===" -ForegroundColor Cyan

$headers = @{
    "Authorization" = "Bearer $token"
}

$projectBody = @{
    name = "Test Project - Main Office"
    customer_name = "Acme Corp"
    location = "New York, NY"
} | ConvertTo-Json

try {
    $projectResponse = Invoke-RestMethod -Uri "$BaseUrl/api/projects" -Method Post -Headers $headers -ContentType "application/json" -Body $projectBody
    $projectId = $projectResponse.project.id
    Write-Host "[OK] Project created: $projectId" -ForegroundColor Green
    $projectResponse | ConvertTo-Json
} catch {
    Write-Host "[ERROR] Failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== STEP 3: Create Controller ===" -ForegroundColor Cyan

$controllerBody = @{
    name = "Main Floor NUC"
} | ConvertTo-Json

try {
    $controllerResponse = Invoke-RestMethod -Uri "$BaseUrl/api/projects/$projectId/controllers" -Method Post -Headers $headers -ContentType "application/json" -Body $controllerBody
    $controllerId = $controllerResponse.controller.id
    Write-Host "[OK] Controller created: $controllerId" -ForegroundColor Green
    Write-Host "Connection Key: $($controllerResponse.controller.connection_key)" -ForegroundColor Yellow
    $controllerResponse | ConvertTo-Json
} catch {
    Write-Host "[ERROR] Failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== STEP 4: Create Device ===" -ForegroundColor Cyan

$deviceBody = @{
    device_id = "dsp_main"
    name = "Harvey DSP - Main Room"
    type = "harvey_dsp"
    connection_config = @{
        host = "192.168.1.50"
        port = 3004
    }
} | ConvertTo-Json -Depth 10

try {
    $deviceResponse = Invoke-RestMethod -Uri "$BaseUrl/api/controllers/$controllerId/devices" -Method Post -Headers $headers -ContentType "application/json" -Body $deviceBody
    $deviceId = $deviceResponse.device.id
    Write-Host "[OK] Device created: $deviceId" -ForegroundColor Green
    $deviceResponse | ConvertTo-Json
} catch {
    Write-Host "[ERROR] Failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== STEP 5: Create Controls ===" -ForegroundColor Cyan

# Master Volume
$control1 = @{
    control_id = "ctrl_master_volume"
    logical_name = "Master Volume"
    control_type = "gain"
    block_id = "dsp.0.gain.0"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$BaseUrl/api/devices/$deviceId/controls" -Method Post -Headers $headers -ContentType "application/json" -Body $control1 | Out-Null
    Write-Host "[OK] Master Volume control created" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to create Master Volume" -ForegroundColor Red
}

# Mic Mute
$control2 = @{
    control_id = "ctrl_mic_mute"
    logical_name = "Microphone Mute"
    control_type = "mute"
    block_id = "dsp.0.mute.1"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$BaseUrl/api/devices/$deviceId/controls" -Method Post -Headers $headers -ContentType "application/json" -Body $control2 | Out-Null
    Write-Host "[OK] Microphone Mute control created" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to create Mic Mute" -ForegroundColor Red
}

# Zone A Volume
$control3 = @{
    control_id = "ctrl_zone_a_volume"
    logical_name = "Zone A Volume"
    control_type = "gain"
    block_id = "dsp.0.gain.2"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$BaseUrl/api/devices/$deviceId/controls" -Method Post -Headers $headers -ContentType "application/json" -Body $control3 | Out-Null
    Write-Host "[OK] Zone A Volume control created" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to create Zone A Volume" -ForegroundColor Red
}

Write-Host "`n=== STEP 6: Create Scene ===" -ForegroundColor Cyan

$sceneBody = @{
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

try {
    $sceneResponse = Invoke-RestMethod -Uri "$BaseUrl/api/controllers/$controllerId/scenes" -Method Post -Headers $headers -ContentType "application/json" -Body $sceneBody
    $sceneId = $sceneResponse.scene.id
    Write-Host "[OK] Scene created: $sceneId" -ForegroundColor Green
    $sceneResponse | ConvertTo-Json
} catch {
    Write-Host "[ERROR] Failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== STEP 7: Check AI Providers ===" -ForegroundColor Cyan

try {
    $providers = Invoke-RestMethod -Uri "$BaseUrl/api/controllers/$controllerId/ai/providers" -Method Get -Headers $headers
    Write-Host "[OK] AI providers retrieved" -ForegroundColor Green
    $providers | ConvertTo-Json
} catch {
    Write-Host "[ERROR] Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== STEP 8: AI Chat ===" -ForegroundColor Cyan

$aiBody = @{
    prompt = "Create a main page with volume sliders and scene buttons for presentation mode"
    provider = "gemini"
} | ConvertTo-Json

try {
    $aiResponse = Invoke-RestMethod -Uri "$BaseUrl/api/controllers/$controllerId/ai/chat" -Method Post -Headers $headers -ContentType "application/json" -Body $aiBody
    Write-Host "[OK] AI chat successful" -ForegroundColor Green
    $aiResponse | ConvertTo-Json -Depth 3
} catch {
    Write-Host "[ERROR] AI chat failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "[ERROR] Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host "`n=== STEP 9: GUI Status ===" -ForegroundColor Cyan

try {
    $guiStatus = Invoke-RestMethod -Uri "$BaseUrl/api/controllers/$controllerId/gui/status" -Method Get -Headers $headers
    Write-Host "[OK] GUI status retrieved" -ForegroundColor Green
    $guiStatus | ConvertTo-Json
} catch {
    Write-Host "[ERROR] Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== STEP 10: Deploy GUI ===" -ForegroundColor Cyan

$deployBody = @{
    commitMessage = "Initial GUI layout with volume controls"
} | ConvertTo-Json

try {
    $deployResponse = Invoke-RestMethod -Uri "$BaseUrl/api/controllers/$controllerId/gui/deploy" -Method Post -Headers $headers -ContentType "application/json" -Body $deployBody
    Write-Host "[OK] GUI deployed successfully" -ForegroundColor Green
    $deployResponse | ConvertTo-Json
} catch {
    Write-Host "[INFO] Deploy failed (might be no draft files yet)" -ForegroundColor Yellow
}

Write-Host "`n=== COMPLETE ===" -ForegroundColor Cyan
Write-Host "[OK] All tests completed!" -ForegroundColor Green
Write-Host "Project ID: $projectId" -ForegroundColor Yellow
Write-Host "Controller ID: $controllerId" -ForegroundColor Yellow
Write-Host "Device ID: $deviceId" -ForegroundColor Yellow
Write-Host "Scene ID: $sceneId" -ForegroundColor Yellow
