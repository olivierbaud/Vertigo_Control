# Vertigo Control - Frontend Dashboard

React-based web dashboard for the AI-Programmable AV Control System with AI chat interface, GUI preview, and manual deploy/sync controls.

## Features

### ✨ Core Features (Phase 4 - Sprint 7)

- **Authentication System**
  - Login/Register pages
  - JWT-based authentication
  - Protected routes

- **Dashboard**
  - Project overview
  - Controller statistics (total, online)
  - Quick actions

- **Project Management**
  - Create/view projects
  - Project cards with details
  - Customer and location info

- **AI Chat Interface** (🌟 Main Feature)
  - Real-time streaming AI responses
  - Multi-provider support (Claude, GPT-4, Gemini)
  - Natural language GUI generation
  - Chat history

- **Deploy/Sync Controls**
  - Three-state deployment (Draft → Deployed → Live)
  - Manual deploy button
  - Manual sync button
  - Discard changes
  - Version tracking

- **GUI Preview Pane**
  - Status display (draft/deployed/live versions)
  - Unsaved changes indicator
  - Controller online/offline status

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **React Router v6** - Client-side routing
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Context API** - State management

## Getting Started

### Prerequisites

- Node.js 20.15+ (or 20.19+ for full compatibility)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`:
```env
VITE_API_URL=http://localhost:3000
```

### Development

Start the development server:
```bash
npm run dev
```

The app will be available at http://localhost:5173/

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
frontend/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable components
│   │   ├── Layout.jsx           # Main app layout with sidebar
│   │   └── ProtectedRoute.jsx   # Auth guard component
│   ├── contexts/        # React contexts
│   │   └── AuthContext.jsx      # Authentication state
│   ├── pages/           # Page components
│   │   ├── Login.jsx            # Login page
│   │   ├── Register.jsx         # Registration page
│   │   ├── Dashboard.jsx        # Main dashboard
│   │   ├── Projects.jsx         # Projects list
│   │   └── ControllerDetail.jsx # AI Chat + GUI preview
│   ├── utils/           # Utilities
│   │   └── api.js               # API client with all endpoints
│   ├── App.jsx          # Main app component with routing
│   ├── main.jsx         # App entry point
│   └── index.css        # Global styles + Tailwind
├── .env.example         # Environment variables template
├── tailwind.config.js   # Tailwind configuration
├── postcss.config.js    # PostCSS configuration
└── vite.config.js       # Vite configuration
```

## Key Components

### ControllerDetail.jsx
The main AI chat interface component featuring:
- Left pane: AI chat with streaming responses
- Right pane: Deploy/sync controls and GUI preview
- Multi-provider AI selection
- Manual deploy and sync buttons
- Version tracking display

### AuthContext
Manages authentication state:
- User login/logout
- Registration
- Token storage
- Protected route access

### API Client (utils/api.js)
Centralized API communication:
- Axios instance with JWT interceptor
- Organized endpoint groups (projects, controllers, devices, AI, GUI)
- Streaming support for AI chat
- Error handling

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:3000` |

## API Integration

The frontend communicates with the backend REST API:

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details

### Controllers
- `GET /api/controllers/:id` - Get controller
- `GET /api/controllers/:id/devices` - List devices
- `GET /api/controllers/:id/scenes` - List scenes

### AI Service
- `POST /api/ai/chat` - Stream AI responses
- `GET /api/ai/providers` - List providers
- `POST /api/ai/keys` - Save BYOK key

### GUI Management
- `GET /api/controllers/:id/gui/status` - Get versions
- `POST /api/controllers/:id/gui/deploy` - Deploy draft → deployed
- `POST /api/controllers/:id/gui/sync` - Sync deployed → live
- `POST /api/controllers/:id/gui/discard` - Discard changes

## Features by Route

| Route | Component | Features |
|-------|-----------|----------|
| `/login` | Login | JWT authentication |
| `/register` | Register | New account creation |
| `/dashboard` | Dashboard | Project overview, stats |
| `/projects` | Projects | Project list, create modal |
| `/controllers/:id` | ControllerDetail | AI chat, deploy/sync |

## Development Tips

1. **Hot Module Replacement (HMR)**: Changes to components automatically reload
2. **Tailwind IntelliSense**: Install VS Code extension for class autocomplete
3. **React DevTools**: Install browser extension for debugging
4. **API Proxy**: Vite dev server can proxy API requests if needed

## Deployment

### Railway (Recommended)

1. Connect GitHub repository
2. Set environment variables:
   - `VITE_API_URL=https://your-api.railway.app`
3. Railway auto-detects Vite and builds correctly
4. Static files served automatically

### Vercel

```bash
npm run build
vercel --prod
```

### Netlify

```bash
npm run build
netlify deploy --prod --dir=dist
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Contributing

When adding new features:

1. Create components in `src/components/`
2. Add pages to `src/pages/`
3. Update `src/App.jsx` routing
4. Add API calls to `src/utils/api.js`
5. Use Tailwind CSS for styling
6. Follow existing code patterns

## Troubleshooting

### "Cannot find module" errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### Port 5173 already in use
```bash
# Kill the process or use a different port
npm run dev -- --port 3001
```

### API connection errors
- Check `VITE_API_URL` in `.env`
- Verify backend is running
- Check CORS settings on backend

## License

Proprietary - All rights reserved

## Support

For issues or questions, contact the development team.
