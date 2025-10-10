# AI-Programmable AV Control System - Complete Roadmap

**Last Updated:** December 10, 2025
**Architecture:** Cloud-based with file-based GUI storage and manual sync control

---

## Project Summary

### What it is
A cloud-connected control system that enables non-technical users to program professional AV and building automation equipment using natural language conversations with AI.

### Core Value Proposition
Instead of learning complex programming languages and device protocols, users simply describe what they want in natural language, and the AI generates complete GUI layouts and automation scenes.

### Architecture Overview

**Two-Tier System:**
- **Cloud Tier (Railway):** AI service, configuration, multi-tenant SaaS platform
- **On-Premise Tier (NUC/Linux):** Runtime execution, device control, works offline

**Scope Note (October 2025):** This roadmap reflects the Railway/cloud backend contained in this repository. The on-premise runtime (control-system) is maintained in a separate codebase, so its delivery status is tracked externally.

**Key Innovation:** File-based GUI storage with three-state deployment (DRAFT → DEPLOYED → LIVE)

### Target Users
- AV integrators managing multiple installations
- System integrators
- Facility managers
- Anyone controlling professional AV equipment

---

## Development Roadmap Overview

- **Phase 1 (Weeks 1-4):** Status: **Completed (cloud foundation verified in repo)** - Platform setup, authentication, multi-tenant schema, REST APIs
- **Phase 2 (Weeks 5-8):** Status: **Blocked on control-system runtime** - Cloud device and scene APIs exist here; NUC runtime progress tracked externally
- **Phase 3 (Weeks 9-12):** Status: **Completed (cloud features implemented)** - AI provider stack, file-based GUI workflow, deploy/sync endpoints; on-prem sync handler pending
- **Phase 4 (Weeks 13-16):** Status: **In Progress (65% complete)** - User interfaces (web dashboard implemented, NUC shell pending)
- **Phase 5 (Weeks 17-20):** Status: **Not Started** - Expansion + database migration
- **Phase 6 (Weeks 21-24):** Status: **Not Started** - Launch & iterate

---

# Phase 1: Foundation (Weeks 1-4)

**Status:** Completed (cloud backend delivered in this repository).
**What we have:** Multi-tenant REST backend, auth, and database migrations implemented in this repo (`db/migrations/001_initial_schema.sql`, `src/routes/*`, `src/server.js`).


## Sprint 1: Core Infrastructure ✅

### Cloud Backend Setup
- ✅ Railway project with PostgreSQL database
- ✅ Express.js REST API server
- ✅ JWT authentication system
- ✅ Multi-tenant database schema (6 core tables)
- ✅ Database migrations system
- ✅ GitHub integration with auto-deploy

### API Endpoints Implemented
```
✅ POST   /api/auth/register
✅ POST   /api/auth/login
✅ GET    /api/projects
✅ POST   /api/projects
✅ GET    /api/projects/:id
✅ PUT    /api/projects/:id
✅ DELETE /api/projects/:id
✅ GET    /api/projects/:id/controllers
✅ POST   /api/projects/:id/controllers
```

**Deliverable:** ✅ Functional backend API with authentication

---

## Sprint 2: WebSocket Sync Layer ✅

### Cloud WebSocket Server
- ✅ Connection handling with authentication
- ✅ Connection key validation
- ✅ Heartbeat/keepalive (30-second intervals)
- ✅ Message protocol (JSON-based)
- ✅ Controller status tracking (online/offline)

### NUC Sync Client
- ✅ WebSocket client with auto-reconnect
- ✅ Exponential backoff (1s → 60s max)
- ✅ SQLite local cache
- ✅ Configuration sync logic
- ✅ Offline capability
- ✅ Systemd service (auto-start on boot)

**Deliverable:** ✅ Reliable bidirectional sync between cloud and NUC

---

# Phase 2: Device Control (Weeks 5-8)

**Status:** Blocked on control-system runtime (cloud APIs delivered here; on-prem execution tracked externally).
**Cloud deliverables verified:** Device/control/scene management APIs and WebSocket server (`src/routes/devices.js`, `src/routes/device-controls.js`, `src/routes/scenes.js`, `src/websocket/server.js`).
**Pending external:** Device drivers, scene runtime, and sync client ship with the separate control-system repo.


## Sprint 3: First Device Driver ✅

### Harvey DSP Driver
- ✅ Base driver interface
- ✅ TCP connection management
- ✅ Full H-Text protocol implementation
- ✅ Command formatting and response parsing
- ✅ Auto-reconnect logic
- ✅ Control types: gain, mute, phase, matrix, EQ

### Device Manager
- ✅ Driver plugin loader
- ✅ Device instance management
- ✅ Connection pooling
- ✅ Status monitoring

**Deliverable:** ✅ Can control Harvey DSP from cloud commands

---

## Sprint 4: Scene Engine ✅

### Scene Executor
- ✅ Sequential step processing
- ✅ Timing/delay handling
- ✅ Error handling (continue vs abort)
- ✅ Progress event emission

### Scene Management API
- ✅ Create/update/delete scenes
- ✅ Scene listing and filtering
- ✅ Scene validation
- ✅ Execution endpoint

**Deliverable:** ✅ Working scene automation system

---

# Phase 3: AI Integration (Weeks 9-12)

**Status:** In progress on cloud side (AI services, file workflows, deploy/sync APIs implemented; on-prem sync handler pending external repo).
**Cloud deliverables verified:** AI provider stack, file manager, context builder, validator, and GUI endpoints (`src/ai/*`, `src/routes/ai.js`, `src/routes/gui.js`, `db/migrations/002_gui_file_system.sql`).
**Pending external:** NUC sync handler and live deployment workflow within the control-system runtime.

**ARCHITECTURE:** Cloud-based AI service with file-based GUI storage and manual sync control

---

## Sprint 5: AI Service Foundation & File System
**Goal:** Build AI service with file-based GUI management

### Week 1: File Storage & AI Infrastructure

- [x] **File Storage System**
  - Design file storage structure (draft/deployed/versions)
  - Choose storage method (PostgreSQL JSONB recommended)
  - Implement GUIFileManager class
  - CRUD operations for draft files
  - CRUD operations for deployed files
  - Version snapshot creation
  - File path validation

- [x] **AI Service Architecture**
  - Create `/src/ai/` directory structure
  - Define provider interface (base class)
  - Setup file-based context builder
  - Create validation framework for file-based configs
  - Error handling framework

- [x] **Database Schema Planning**
  - Design `gui_files` table structure
  - Design `gui_file_versions` table structure
  - Design `sync_history` table structure
  - Document migration plan (implement in Sprint 9)
  - Create mock data for testing

- [x] **Environment Variables**
  - Add `ENCRYPTION_KEY` (for API key encryption)
  - Add `ANTHROPIC_API_KEY` (platform key)
  - Add `OPENAI_API_KEY` (platform key)
  - Add `GEMINI_API_KEY` (platform key)
  - Add `FILE_STORAGE_PATH` (if using file system)

### Week 2: AI Provider Implementations

- [x] **Claude Provider (Anthropic)**
  - Implement `/src/ai/providers/claude.js`
  - Use Anthropic Messages API
  - File-aware context building
  - Handle streaming responses
  - Error handling and retries
  - Token counting and cost tracking

- [x] **OpenAI Provider**
  - Implement `/src/ai/providers/openai.js`
  - Use Chat Completions API
  - File-aware context building
  - Handle streaming responses
  - Cost tracking

- [x] **Gemini Provider**
  - Implement `/src/ai/providers/gemini.js`
  - Use Google Generative AI API
  - File-aware context building
  - Handle responses
  - Cost tracking

- [x] **Provider Factory**
  - Dynamic provider loading
  - BYOK key management (encrypted storage)
  - Fallback logic
  - Provider selection logic

**Deliverable:** AI service can read draft files, call multiple providers, and modify draft files

---

## Sprint 6: Deploy/Sync System & Validation
**Goal:** Complete deploy/sync workflow with comprehensive validation

### Week 1: Deploy & Sync Implementation

- [x] **Deploy System**
  - Implement deploy endpoint (draft → deployed)
  - Version numbering logic
  - File copying mechanism (draft to deployed state)
  - Version snapshot creation
  - Rollback to previous version
  - Discard draft changes (revert to deployed)

- [x] **Sync System**
  - Implement sync endpoint (deployed → NUC)
  - WebSocket message protocol for gui_sync
  - Progress tracking system
  - Sync history logging
  - Error handling and recovery
  - Retry mechanism

- [ ] **NUC Sync Handler**
  - Update NUC sync client to handle gui_sync messages
  - File writing logic on NUC
  - Directory creation (recursive)
  - GUI server reload mechanism
  - Progress reporting back to cloud
  - Error handling and rollback

- [x] **Status & History Endpoints**
  - GET /api/controllers/:id/gui/status (draft vs deployed vs live)
  - GET /api/controllers/:id/gui/files/draft (for preview)
  - GET /api/controllers/:id/gui/sync/history
  - GET /api/controllers/:id/gui/sync/:syncId (progress tracking)
  - POST /api/controllers/:id/gui/discard
  - POST /api/controllers/:id/gui/rollback

### Week 2: Context, Prompts & Validation

- [x] **File-Based Context Builder**
  - Implement `/src/ai/context.js`
  - Read all draft files
  - Structure file system for AI
  - Include devices and controls from database
  - Include existing scenes
  - Add file relationship mapping
  - Handle missing files gracefully

- [x] **Prompt Engineering**
  - Implement `/src/ai/prompts.js`
  - System prompt for file-based modifications
  - Define file output format
  - Add examples (few-shot learning)
  - Test with different providers
  - Optimize for token efficiency
  - Handle file operations in prompts

- [x] **Response Parser**
  - Parse AI-generated file changes
  - Extract modified files
  - Extract new files
  - Extract deleted files (if any)
  - Extract warnings/suggestions
  - Handle malformed responses

- [x] **File-Based Validator**
  - Implement `/src/ai/validator.js`
  - Validate JSON structure
  - Check file references (components, assets)
  - Check control references exist
  - Check device availability
  - Validate element properties
  - Check for overlapping elements
  - Generate warnings for issues
  - Prevent circular dependencies

- [x] **Scene Auto-Generator**
  - Parse scene references from GUI files
  - Generate scenes based on naming conventions
  - Infer steps from context
  - Save to draft scenes/
  - Report generated scenes to user
  - Validate generated scenes

- [x] **Rate Limiting**
  - Implement per-integrator rate limits
  - Track monthly usage
  - Enforce subscription tiers
  - Graceful limit exceeded messages
  - Usage dashboard

**Deliverable:** Complete AI service with deploy/sync workflow and file-based GUI generation

---

# Phase 4: User Interfaces (Weeks 13-16)

## Sprint 7: Cloud Dashboard with AI Chat
**Goal:** Web interface for integrators with AI assistant and manual sync controls

### Week 1: Frontend Foundation ✅ COMPLETED

- ✅ **React Application Setup**
  - ✅ Initialize React app (Vite)
  - ✅ Setup Tailwind CSS
  - ✅ Setup React Router v6
  - ✅ Create layout components (header, sidebar, main)
  - ✅ Setup authentication (JWT context)
  - ✅ API client with interceptors

- ✅ **Core Pages**
  - ✅ Login/Registration page
  - ✅ Dashboard (project overview)
  - ✅ Project detail page (with tabs: Overview, Controllers, Devices)
  - ✅ Controller management page (ControllerDetailTabs with Devices, Scenes, AI tabs)
  - ✅ Device configuration page (DeviceManagement component)
  - ⏸️ Scene list/editor page (placeholder created, pending implementation)

- ✅ **API Client**
  - ✅ Axios wrapper with JWT
  - ✅ Request/response interceptors
  - ✅ Error handling
  - ✅ Loading states
  - ✅ Retry logic

**Additional Features Implemented:**
- ✅ Real-time controller status updates (polling every 10s)
- ✅ Connection key display modal for new controllers
- ✅ Edit/Delete controller functionality
- ✅ Device CRUD operations with type selection
- ✅ Hover-reveal action buttons on cards
- ✅ Responsive design for all pages
- ✅ Dark mode support (CSS classes ready)

### Week 2: AI Chat Interface with Manual Sync UI

- [ ] **AI Chat Component**
  - Chat UI (messages list, input box)
  - Message types (user, assistant, system)
  - Streaming response handler
  - Markdown rendering for AI responses
  - Code syntax highlighting (for JSON)
  - Copy to clipboard for configs
  - Message history

- [ ] **GUI Preview Pane**
  - Split screen: chat left, preview right
  - Real-time rendering of draft GUI
  - Interactive preview (click buttons, drag sliders)
  - Zoom and pan controls
  - Mobile/tablet responsive preview
  - Refresh preview on changes

- [ ] **Deploy & Sync Controls**
  - Status display (draft/deployed/live versions)
  - Deploy button with confirmation
  - Sync button with progress bar
  - Discard changes button
  - Rollback to version selector
  - File diff viewer (show what changed)
  - Version history display

- [ ] **AI Settings Panel**
  - Provider selector (Claude/GPT-4/Gemini)
  - Model selector (per provider)
  - Temperature slider
  - BYOK key input form
  - Usage dashboard (requests used/remaining)
  - Cost estimates

- [ ] **GUI Editor Integration**
  - "Edit" button on AI-generated layouts
  - Drag-and-drop element positioning
  - Property editor (labels, colors, actions)
  - Add/remove elements manually
  - "Ask AI to improve" button
  - Undo/redo functionality

**Deliverable:** Complete web dashboard with AI chat and manual sync controls

---

## Sprint 8: NUC Local GUI & System Admin
**Goal:** End-user touch panel + admin diagnostics interface

### Week 1: User Touch Panel GUI (Port 3000)

- [ ] **GUI Server**
  - Implement `/opt/control-system/src/gui-server/server.js`
  - Express server with static file serving
  - WebSocket for real-time updates
  - Load GUI config from local files
  - Serve cached images
  - Handle file changes (hot reload)

- [ ] **GUI Renderer**
  - Implement `/opt/control-system/src/gui-server/renderer.js`
  - HTML/CSS generation from JSON files
  - Element types:
    - Buttons (with scenes)
    - Sliders (with controls)
    - Button groups (multiple options)
    - Status indicators (device status)
    - Text labels
    - Images/backgrounds
  - Page navigation
  - Touch-friendly sizing (minimum 60px)
  - Responsive design

- [ ] **Real-Time Updates**
  - WebSocket server
  - Push device status changes
  - Push scene execution progress
  - Update control values (feedback)
  - Connection status indicator
  - Auto-reconnect logic

- [ ] **Image Caching**
  - Download images from Cloudflare R2
  - Cache locally in `/var/cache/gui-images/`
  - LRU cache with size limit
  - Fallback for missing images
  - Image optimization

### Week 2: System Admin GUI (Port 3001)

- [ ] **Admin Server**
  - Implement `/opt/control-system/src/admin-server/server.js`
  - Password authentication
  - Session management (30-min timeout)
  - Separate from user GUI
  - HTTPS (self-signed cert)

- [ ] **Dashboard Page**
  - System status (CPU, RAM, disk, uptime)
  - Cloud connection status
  - Device status summary
  - Recent activity feed
  - Quick action buttons (restart, force sync)

- [ ] **Provisioning Page**
  - Connection key input
  - Register with cloud
  - Test connectivity
  - Network diagnostics (ping, traceroute)
  - View/edit system config
  - Set admin password

- [ ] **Device Management Page**
  - List all devices
  - Connection status per device
  - Test connection buttons
  - Raw command console
  - View device response logs
  - Add/edit/remove devices (syncs to cloud)

- [ ] **Logs & Debugging Page**
  - Real-time log viewer (journalctl integration)
  - Filter by severity (error, warn, info, debug)
  - Search logs
  - Export logs
  - Scene execution history
  - Device communication logs
  - Download logs as ZIP

- [ ] **Sync & Data Page**
  - SQLite database status
  - Last sync timestamp
  - Current versions (draft/deployed/live)
  - Force sync button
  - View cached GUI files
  - Clear cache option
  - Configuration version

- [ ] **Maintenance Page**
  - Restart service
  - Reboot system
  - Check for updates
  - Apply updates
  - Backup configuration
  - Restore from backup
  - Factory reset

**Deliverable:** Complete NUC GUI system (user + admin interfaces)

---

# Phase 5: Expansion & Polish (Weeks 17-20)

## Sprint 9: Database Migrations & Additional Drivers
**Goal:** Implement file-based GUI database schema and support more device types

### Week 1: GUI File System Database Migration

- [ ] **Database Migration**
  - Create migration file: `003_gui_file_system.sql`
  - Implement `gui_files` table
  - Implement `gui_file_versions` table
  - Implement `sync_history` table
  - Add indexes for performance
  - Add foreign key constraints
  - Test migration on development database

- [ ] **Data Migration Script**
  - Convert existing GUI configs (if any) to file format
  - Create initial draft/deployed states
  - Set initial version numbers
  - Backup existing data before migration
  - Rollback script in case of failure

- [ ] **Testing GUI File System**
  - Test draft file operations
  - Test deploy process
  - Test sync process
  - Test version rollback
  - Test with multiple controllers
  - Performance testing (1000+ files)
  - Concurrent access testing

- [ ] **Production Deployment**
  - Apply migration to Railway database
  - Monitor for errors
  - Verify data integrity
  - Update documentation

### Week 2: Additional Device Drivers

- [ ] **AV PRO Matrix Driver**
  - TCP protocol implementation
  - Route command handling
  - Status queries
  - All input/output testing
  - Testing with real hardware (if available)

- [ ] **Additional Protocols (Choose 2-3)**
  - Option 1: DMX Lighting (serial/Art-Net)
  - Option 2: KNX Building Automation (UDP/TCP via gateway)
  - Option 3: C-Bus (TCP via C-Gate)
  - Option 4: Generic Serial Devices (RS232/485)
  - Implement drivers for chosen protocols
  - Document protocols
  - Test with real hardware

- [ ] **Driver Documentation**
  - API documentation for each driver
  - Integration guides
  - Example configurations
  - Troubleshooting guides
  - Command reference

**Deliverable:** Production database schema + Support for 4-5+ device types

---

## Sprint 10: Production Readiness
**Goal:** Deploy-ready system with monitoring and security

### Week 1: Monitoring & Observability

- [ ] **Logging System**
  - Winston/structured logging
  - Log levels (error, warn, info, debug)
  - Log rotation
  - Centralized log aggregation
  - Search and filter

- [ ] **Error Tracking**
  - Sentry integration (optional)
  - Error reporting
  - Stack traces
  - User context
  - Release tracking

- [ ] **Performance Monitoring**
  - Response time tracking
  - Database query performance
  - Memory usage monitoring
  - CPU usage monitoring
  - WebSocket connection monitoring

- [ ] **Health Checks**
  - Cloud health endpoint
  - NUC health checks
  - Database connectivity
  - External service checks
  - Alerting on failures

### Week 2: Security & Documentation

- [ ] **Security Hardening**
  - Input validation on all endpoints
  - SQL injection prevention (parameterized queries)
  - XSS prevention
  - CSRF protection
  - Rate limiting on sensitive endpoints
  - API key rotation mechanism
  - Security headers (helmet.js)

- [ ] **Security Audit**
  - Dependency vulnerability scan
  - Code review for security issues
  - Penetration testing (basic)
  - Fix identified issues

- [ ] **Documentation**
  - Installation guides (cloud + NUC)
  - API documentation (OpenAPI/Swagger)
  - User manuals (integrators)
  - User manuals (end users)
  - Video tutorials
  - Troubleshooting guides
  - FAQ

- [ ] **Testing**
  - Unit test coverage >80%
  - Integration tests
  - End-to-end tests
  - Load testing
  - Security testing
  - Browser compatibility testing

**Deliverable:** Production-ready system with comprehensive monitoring and security

---

# Phase 6: Launch & Iterate (Weeks 21-24)

## Sprint 11: Beta Testing
**Goal:** Real-world validation with actual integrators

### Week 1-2: Beta Program

- [ ] **Beta Recruitment**
  - Recruit 3-5 integrator companies
  - Sign NDAs and beta agreements
  - Provide training materials
  - Setup demo systems

- [ ] **Onboarding**
  - Setup accounts for beta users
  - Provide NUC hardware
  - Initial training sessions
  - Support channel setup (Slack/Discord)

- [ ] **Support & Monitoring**
  - Daily check-ins with beta users
  - Monitor system usage and errors
  - Gather detailed feedback
  - Track bug reports
  - Performance monitoring

### Week 3-4: Iteration

- [ ] **Bug Fixes**
  - Address critical bugs immediately
  - Fix high-priority issues
  - Improve error messages
  - Performance optimization

- [ ] **UX Improvements**
  - Based on beta feedback
  - Simplify confusing workflows
  - Add requested features (if quick)
  - Polish UI/UX

- [ ] **Documentation Updates**
  - Update based on common questions
  - Add missing sections
  - Improve examples
  - Video tutorials for common tasks

- [ ] **Deployment Tools**
  - NUC installer script
  - Automated provisioning
  - Update mechanism
  - Backup/restore tools

**Deliverable:** Validated system with real users and critical bugs fixed

---

## Sprint 12: Launch & Scale
**Goal:** General availability and growth

### Week 1-2: Marketing & Launch

- [ ] **Marketing Site**
  - Product website
  - Feature pages
  - Pricing page
  - Documentation portal
  - Blog
  - Case studies (from beta)

- [ ] **Launch Campaign**
  - Press release
  - Social media announcement
  - Email campaign to prospects
  - Industry publication outreach
  - Demo videos

- [ ] **Sales Materials**
  - Product brochures
  - Sales deck
  - ROI calculator
  - Comparison charts
  - Demo system

### Week 3-4: Operations & Scale

- [ ] **Onboarding Automation**
  - Self-service signup
  - Automated provisioning
  - Tutorial videos
  - Sample projects
  - Email drip campaign

- [ ] **Support System**
  - Support ticketing system
  - Knowledge base
  - Community forum
  - Support SLAs
  - Escalation process

- [ ] **Billing Integration**
  - Stripe integration
  - Subscription management
  - Usage tracking
  - Invoice generation
  - Payment retry logic

- [ ] **Analytics**
  - User behavior tracking
  - Feature usage
  - Conversion funnel
  - Churn analysis
  - Revenue metrics

**Deliverable:** Publicly available SaaS product ready to scale

---

# Future Enhancements (Post-Launch)

## Advanced AI Features
- Visual GUI builder with AI suggestions (drag-and-drop + AI)
- AI-powered troubleshooting assistant
- Natural language scene editor
- "Optimize my GUI" command
- Multi-language support (AI translates labels)
- AI-generated documentation
- Predictive maintenance suggestions

## UI/UX Enhancements
- Advanced drag-and-drop GUI editor
- Theme customizer (colors, fonts, layouts)
- Animation support (button press effects, transitions)
- Custom element types (graphs, schedules, weather)
- Mobile app (iOS/Android)
- Widgets and dashboards
- Accessibility improvements (screen readers, high contrast)

## Integration Expansion
- Voice control (Alexa, Google Home)
- Calendar integration (schedule scenes)
- Conditional logic (if/then/else scenes)
- Sensor triggers (motion, light, temperature)
- Third-party integrations (IFTTT, Zapier, Home Assistant)
- API webhooks
- Email/SMS notifications

## Device Support
- Crestron integration
- AMX integration
- Q-SYS integration (QSC)
- Extron integration
- Lutron lighting
- Sonos audio
- Shure microphones
- Biamp DSPs
- And 50+ more manufacturers

## Enterprise Features
- Single Sign-On (SSO)
- LDAP/Active Directory integration
- Advanced role-based access control (RBAC)
- Audit logging
- Compliance reporting (GDPR, SOC2)
- Multi-region deployment
- White-label options
- API rate limiting tiers

## Scale & Performance
- Read replicas for database
- Load balancing for API
- Regional deployments (US, EU, APAC)
- Redis caching layer
- CDN for assets
- Horizontal NUC scaling
- Edge computing support

---

# Success Metrics

## Technical Metrics
- ✓ 99.9% uptime for cloud platform
- ✓ <100ms command execution latency
- ✓ Zero security incidents
- ✓ <5% error rate on device commands
- ✓ AI success rate >90% for GUI generation
- ✓ Deploy time <1 second
- ✓ Sync time <10 seconds

## Business Metrics
- 10 paying integrator customers by Month 6
- 50 deployed controllers by Month 12
- <10% monthly churn rate
- NPS >50
- 20% month-over-month growth
- $50K MRR by Month 12

## User Experience Metrics
- Average scene creation time <5 minutes
- Average GUI creation time <10 minutes
- AI success rate >90% for scene generation
- User satisfaction score >4.5/5
- Support ticket resolution <24 hours
- Feature adoption rate >70%

---

# Critical Dependencies

## External Services
- Railway.app (cloud hosting)
- Anthropic Claude API (AI provider)
- OpenAI API (AI provider)
- Google Gemini API (AI provider)
- Cloudflare R2 (image storage)

## Hardware
- GMKtec NUCs or similar (fanless Intel N100/N305)
- Test equipment (Harvey DSP, AV matrices, etc.)
- Development hardware (for drivers)

## Partnerships
- Beta partner integrators (willing to test)
- Hardware vendors (for driver development)
- Industry associations (for marketing)

---

# Risk Mitigation

## Technical Risks
- **Device protocol documentation incomplete**
  - Mitigation: Start with well-documented protocols, work with vendors
  
- **WebSocket reliability in production**
  - Mitigation: Robust reconnection logic, fallback to polling
  
- **AI hallucination creating bad configs**
  - Mitigation: Comprehensive validation, manual deploy/sync

- **File storage size growth**
  - Mitigation: Version history limits, archive old versions

## Business Risks
- **Hardware vendor lock-in**
  - Mitigation: Plugin architecture for flexibility
  
- **Scaling costs exceed revenue**
  - Mitigation: Monitor usage, optimize early, BYOK option
  
- **Competition from established players**
  - Mitigation: Focus on AI differentiation, rapid iteration

- **AI provider API changes**
  - Mitigation: Multi-provider support, abstract provider interface

## Operational Risks
- **NUC hardware failure in field**
  - Mitigation: Remote monitoring, backup systems, replacement program

- **Customer data loss**
  - Mitigation: Automated backups, version history, redundancy

- **Security breach**
  - Mitigation: Security audits, encryption, monitoring, incident response plan

---

# Timeline Summary

**Total Duration:** 24 weeks (6 months)

- **Weeks 1-8:** Cloud foundation delivered in this repository; on-prem runtime tracked externally.
- **Weeks 9-12:** Cloud AI workflows implemented here; NUC sync handler pending in the control-system repo.
- **Weeks 13-16:** User interfaces (not started).
- **Weeks 17-20:** Expansion + database migration (not started).
- **Weeks 21-24:** Launch & iterate (not started).

**Projected Public Launch:** Mid-January 2026

**First Revenue:** Month 6 (April 2026)

**Break-even:** Month 12-18 (depending on customer acquisition)

---

**This roadmap provides a structured 6-month path to launch with clear milestones, deliverables, and success metrics. The file-based GUI architecture with manual sync control provides the safety and flexibility needed for production deployments.**
