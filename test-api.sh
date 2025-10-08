#!/bin/bash

# Vertigo Control API Testing Script
# Free alternative to Thunder Client using cURL

# Configuration
BASE_URL="https://backend-production-baec.up.railway.app"
TOKEN=""
PROJECT_ID=""
CONTROLLER_ID=""
DEVICE_ID=""
SCENE_ID=""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper function to print section headers
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# Helper function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Helper function to print error
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Helper function to print info
print_info() {
    echo -e "${YELLOW}📝 $1${NC}"
}

# Helper function to extract JSON field
extract_json() {
    echo "$1" | grep -o "\"$2\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | cut -d'"' -f4
}

# ===========================================
# STEP 1: AUTHENTICATION
# ===========================================

test_register() {
    print_header "STEP 1.1: Register New User"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/register" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "Test Integration Company",
            "email": "test@example.com",
            "password": "test123"
        }')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "201" ]; then
        print_success "Registration successful"
        TOKEN=$(extract_json "$BODY" "token")
        print_info "Token saved: ${TOKEN:0:20}..."
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    elif [ "$HTTP_CODE" == "409" ]; then
        print_info "User already exists, proceed to login"
    else
        print_error "Registration failed with code $HTTP_CODE"
        echo "$BODY"
    fi
}

test_login() {
    print_header "STEP 1.2: Login"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "test@example.com",
            "password": "test123"
        }')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "200" ]; then
        print_success "Login successful"
        TOKEN=$(extract_json "$BODY" "token")
        print_info "Token saved: ${TOKEN:0:20}..."
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    else
        print_error "Login failed with code $HTTP_CODE"
        echo "$BODY"
        exit 1
    fi
}

# ===========================================
# STEP 2: PROJECT MANAGEMENT
# ===========================================

test_create_project() {
    print_header "STEP 2: Create Project"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/projects" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{
            "name": "Test Project - Main Office",
            "customer_name": "Acme Corp",
            "location": "New York, NY"
        }')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "201" ]; then
        print_success "Project created"
        PROJECT_ID=$(extract_json "$BODY" "id")
        print_info "Project ID saved: $PROJECT_ID"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    else
        print_error "Project creation failed with code $HTTP_CODE"
        echo "$BODY"
        exit 1
    fi
}

test_list_projects() {
    print_header "Verify: List Projects"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/projects" \
        -H "Authorization: Bearer $TOKEN")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "200" ]; then
        print_success "Projects retrieved"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    else
        print_error "Failed to retrieve projects"
        echo "$BODY"
    fi
}

# ===========================================
# STEP 3: CONTROLLER MANAGEMENT
# ===========================================

test_create_controller() {
    print_header "STEP 3: Create Controller"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/projects/$PROJECT_ID/controllers" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{
            "name": "Main Floor NUC"
        }')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "201" ]; then
        print_success "Controller created"
        CONTROLLER_ID=$(extract_json "$BODY" "id")
        CONNECTION_KEY=$(extract_json "$BODY" "connection_key")
        print_info "Controller ID saved: $CONTROLLER_ID"
        print_info "Connection Key: $CONNECTION_KEY"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    else
        print_error "Controller creation failed with code $HTTP_CODE"
        echo "$BODY"
        exit 1
    fi
}

test_list_controllers() {
    print_header "Verify: List Controllers"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/projects/$PROJECT_ID/controllers" \
        -H "Authorization: Bearer $TOKEN")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "200" ]; then
        print_success "Controllers retrieved"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    else
        print_error "Failed to retrieve controllers"
        echo "$BODY"
    fi
}

# ===========================================
# STEP 4: DEVICE MANAGEMENT
# ===========================================

test_create_device() {
    print_header "STEP 4: Create Device"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/controllers/$CONTROLLER_ID/devices" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{
            "device_id": "dsp_main",
            "name": "Harvey DSP - Main Room",
            "type": "harvey_dsp",
            "connection_config": {
                "host": "192.168.1.50",
                "port": 3004
            }
        }')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "201" ]; then
        print_success "Device created"
        DEVICE_ID=$(extract_json "$BODY" "id")
        print_info "Device ID saved: $DEVICE_ID"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    else
        print_error "Device creation failed with code $HTTP_CODE"
        echo "$BODY"
        exit 1
    fi
}

test_list_devices() {
    print_header "Verify: List Devices"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/controllers/$CONTROLLER_ID/devices" \
        -H "Authorization: Bearer $TOKEN")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "200" ]; then
        print_success "Devices retrieved"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    else
        print_error "Failed to retrieve devices"
        echo "$BODY"
    fi
}

# ===========================================
# STEP 5: DEVICE CONTROLS
# ===========================================

test_create_controls() {
    print_header "STEP 5: Create Device Controls"

    # 5.1 Master Volume
    print_info "Creating Master Volume control..."
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/devices/$DEVICE_ID/controls" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{
            "control_id": "ctrl_master_volume",
            "logical_name": "Master Volume",
            "control_type": "gain",
            "block_id": "dsp.0.gain.0"
        }')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    if [ "$HTTP_CODE" == "201" ]; then
        print_success "Master Volume control created"
    else
        print_error "Master Volume creation failed"
    fi

    # 5.2 Microphone Mute
    print_info "Creating Microphone Mute control..."
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/devices/$DEVICE_ID/controls" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{
            "control_id": "ctrl_mic_mute",
            "logical_name": "Microphone Mute",
            "control_type": "mute",
            "block_id": "dsp.0.mute.1"
        }')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    if [ "$HTTP_CODE" == "201" ]; then
        print_success "Microphone Mute control created"
    else
        print_error "Microphone Mute creation failed"
    fi

    # 5.3 Zone A Volume
    print_info "Creating Zone A Volume control..."
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/devices/$DEVICE_ID/controls" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{
            "control_id": "ctrl_zone_a_volume",
            "logical_name": "Zone A Volume",
            "control_type": "gain",
            "block_id": "dsp.0.gain.2"
        }')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    if [ "$HTTP_CODE" == "201" ]; then
        print_success "Zone A Volume control created"
    else
        print_error "Zone A Volume creation failed"
    fi
}

test_list_controls() {
    print_header "Verify: List Controls"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/devices/$DEVICE_ID/controls" \
        -H "Authorization: Bearer $TOKEN")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "200" ]; then
        print_success "Controls retrieved"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    else
        print_error "Failed to retrieve controls"
        echo "$BODY"
    fi
}

# ===========================================
# STEP 6: SCENE MANAGEMENT
# ===========================================

test_create_scene() {
    print_header "STEP 6: Create Scene"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/controllers/$CONTROLLER_ID/scenes" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{
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
        }')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "201" ]; then
        print_success "Scene created"
        SCENE_ID=$(extract_json "$BODY" "id")
        print_info "Scene ID saved: $SCENE_ID"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    else
        print_error "Scene creation failed with code $HTTP_CODE"
        echo "$BODY"
        exit 1
    fi
}

test_list_scenes() {
    print_header "Verify: List Scenes"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/controllers/$CONTROLLER_ID/scenes" \
        -H "Authorization: Bearer $TOKEN")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "200" ]; then
        print_success "Scenes retrieved"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    else
        print_error "Failed to retrieve scenes"
        echo "$BODY"
    fi
}

# ===========================================
# STEP 7: AI CHAT (Optional)
# ===========================================

test_ai_providers() {
    print_header "STEP 7.1: Check AI Providers"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/controllers/$CONTROLLER_ID/ai/providers" \
        -H "Authorization: Bearer $TOKEN")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "200" ]; then
        print_success "AI providers retrieved"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    else
        print_error "Failed to retrieve AI providers"
        echo "$BODY"
    fi
}

test_ai_chat() {
    print_header "STEP 7.2: AI Chat"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/controllers/$CONTROLLER_ID/ai/chat" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{
            "prompt": "Create a main page with volume sliders and scene buttons for presentation mode",
            "provider": "gemini"
        }')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "200" ]; then
        print_success "AI chat successful"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    elif [ "$HTTP_CODE" == "503" ]; then
        print_info "AI provider not configured (no API key)"
        echo "$BODY"
    else
        print_error "AI chat failed with code $HTTP_CODE"
        echo "$BODY"
    fi
}

# ===========================================
# STEP 8: GUI MANAGEMENT
# ===========================================

test_gui_status() {
    print_header "STEP 8.1: Check GUI Status"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/controllers/$CONTROLLER_ID/gui/status" \
        -H "Authorization: Bearer $TOKEN")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "200" ]; then
        print_success "GUI status retrieved"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    else
        print_error "Failed to retrieve GUI status"
        echo "$BODY"
    fi
}

test_gui_draft_files() {
    print_header "STEP 8.2: Preview Draft Files"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/controllers/$CONTROLLER_ID/gui/files/draft" \
        -H "Authorization: Bearer $TOKEN")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "200" ]; then
        print_success "Draft files retrieved"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    else
        print_error "Failed to retrieve draft files"
        echo "$BODY"
    fi
}

test_gui_deploy() {
    print_header "STEP 8.3: Deploy GUI"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/controllers/$CONTROLLER_ID/gui/deploy" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{
            "commitMessage": "Initial GUI layout with volume controls"
        }')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "200" ]; then
        print_success "GUI deployed successfully"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    else
        print_error "GUI deployment failed with code $HTTP_CODE"
        echo "$BODY"
    fi
}

test_gui_sync() {
    print_header "STEP 8.5: Sync to NUC"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/controllers/$CONTROLLER_ID/gui/sync" \
        -H "Authorization: Bearer $TOKEN")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "200" ]; then
        print_success "Sync initiated"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    else
        print_info "Controller offline (expected if NUC not connected)"
        echo "$BODY"
    fi
}

test_gui_sync_history() {
    print_header "STEP 8.6: View Sync History"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/controllers/$CONTROLLER_ID/gui/sync/history" \
        -H "Authorization: Bearer $TOKEN")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "200" ]; then
        print_success "Sync history retrieved"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    else
        print_error "Failed to retrieve sync history"
        echo "$BODY"
    fi
}

test_gui_versions() {
    print_header "STEP 8.7: View Version History"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/controllers/$CONTROLLER_ID/gui/versions" \
        -H "Authorization: Bearer $TOKEN")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "200" ]; then
        print_success "Version history retrieved"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    else
        print_error "Failed to retrieve version history"
        echo "$BODY"
    fi
}

# ===========================================
# STEP 9: SCENE EXECUTION
# ===========================================

test_scene_execution() {
    print_header "STEP 9: Test Scene Execution"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/controllers/$CONTROLLER_ID/scenes/$SCENE_ID/execute" \
        -H "Authorization: Bearer $TOKEN")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "200" ]; then
        print_success "Scene execution triggered"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    else
        print_info "Controller offline (expected if NUC not connected)"
        echo "$BODY"
    fi
}

# ===========================================
# MAIN EXECUTION
# ===========================================

main() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════╗"
    echo "║   Vertigo Control API Test Suite      ║"
    echo "║   Free cURL Alternative                ║"
    echo "╚════════════════════════════════════════╝"
    echo -e "${NC}"

    # Check if jq is installed for pretty JSON
    if ! command -v jq &> /dev/null; then
        print_info "Note: Install 'jq' for pretty JSON output"
    fi

    # Authentication
    test_register
    test_login

    # Project Management
    test_create_project
    test_list_projects

    # Controller Management
    test_create_controller
    test_list_controllers

    # Device Management
    test_create_device
    test_list_devices

    # Device Controls
    test_create_controls
    test_list_controls

    # Scene Management
    test_create_scene
    test_list_scenes

    # AI Chat (Optional)
    test_ai_providers
    test_ai_chat

    # GUI Management
    test_gui_status
    test_gui_draft_files
    test_gui_deploy
    test_gui_status  # Check status again after deploy
    test_gui_sync
    test_gui_sync_history
    test_gui_versions

    # Scene Execution
    test_scene_execution

    print_header "TEST SUITE COMPLETE"
    print_success "All tests executed!"
    print_info "Token: ${TOKEN:0:20}..."
    print_info "Project ID: $PROJECT_ID"
    print_info "Controller ID: $CONTROLLER_ID"
    print_info "Device ID: $DEVICE_ID"
    print_info "Scene ID: $SCENE_ID"
}

# Run main function
main
