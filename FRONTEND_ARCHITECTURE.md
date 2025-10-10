# Frontend Architecture - React Dashboard

**Last Updated:** October 10, 2025
**Framework:** React 19 + Vite + Tailwind CSS
**Status:** 55% Complete (Structure implemented, key features pending)
**Location:** `/frontend/`

---

## 📋 Overview

The Vertigo Control web dashboard is a **modern React single-page application (SPA)** built with Vite for fast development and optimized production builds. It provides integrators with a comprehensive interface to manage projects, controllers, devices, and AI-powered GUI design.

### Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.1.1 | UI framework |
| **React Router DOM** | 7.9.4 | Client-side routing |
| **Vite** | 7.1.7 | Build tool & dev server |
| **Tailwind CSS** | 3.4.18 | Utility-first styling |
| **Axios** | 1.12.2 | HTTP client |
| **ESLint** | 9.36.0 | Code linting |

---

## 🏗️ Project Structure

```
frontend/
├── src/
│   ├── main.jsx                 # App entry point
│   ├── App.jsx                  # Root component with routing
│   ├── App.css                  # Global styles
│   ├── index.css                # Tailwind imports
│   │
│   ├── pages/                   # Page-level components
│   │   ├── Login.jsx            # ✅ Login page
│   │   ├── Register.jsx         # ✅ Registration page
│   │   ├── Dashboard.jsx        # ✅ Project overview dashboard
│   │   ├── Projects.jsx         # ✅ Project list & create
│   │   ├── ProjectDetail.jsx    # ✅ Project detail with tabs
│   │   ├── ControllerDetailTabs.jsx  # ✅ Controller tabs (Devices, Scenes, AI)
│   │   └── ControllerDetail.jsx      # ⏸️ Legacy AI chat page
│   │
│   ├── components/              # Reusable components
│   │   ├── Layout.jsx           # ✅ Main layout wrapper
│   │   ├── ProtectedRoute.jsx   # ✅ Auth route guard
│   │   ├── DeviceManagement.jsx # ✅ Device CRUD interface
│   │   └── GuiPreview.jsx       # ⏸️ Placeholder GUI preview
│   │
│   ├── contexts/                # React Context providers
│   │   └── AuthContext.jsx      # ✅ JWT authentication state
│   │
│   ├── hooks/                   # Custom React hooks
│   │   └── useControllerStatus.js  # ✅ Real-time polling hook
│   │
│   ├── utils/                   # Utility functions
│   │   └── api.js               # ✅ Axios HTTP client
│   │
│   └── assets/                  # Static assets
│       └── react.svg            # Logo
│
├── public/                      # Public assets
├── index.html                   # HTML entry point
├── package.json                 # Dependencies
├── vite.config.js               # Vite configuration
├── tailwind.config.js           # Tailwind configuration
├── postcss.config.js            # PostCSS configuration
└── eslint.config.js             # ESLint configuration
```

---

## 🎨 Design System

### Tailwind CSS Configuration

**Theme Colors:**
```javascript
// tailwind.config.js
{
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',    // Blue
        secondary: '#10b981',  // Green
        danger: '#ef4444',     // Red
        dark: '#1f2937',       // Dark gray
      }
    }
  }
}
```

**Utility Classes Used:**
- `bg-gray-50` - Light background
- `text-gray-900` - Dark text
- `rounded-lg` - Rounded corners
- `shadow-md` - Medium shadows
- `hover:bg-blue-600` - Hover states
- `transition-colors` - Smooth animations

### Component Patterns

**Card Component:**
```jsx
<div className="bg-white rounded-lg shadow-md p-6">
  <h2 className="text-xl font-semibold mb-4">Title</h2>
  <p className="text-gray-600">Content</p>
</div>
```

**Button Component:**
```jsx
<button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors">
  Action
</button>
```

**Form Input:**
```jsx
<input
  type="text"
  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  placeholder="Enter value"
/>
```

---

## 🔐 Authentication Flow

### AuthContext Provider

**Location:** [frontend/src/contexts/AuthContext.jsx](frontend/src/contexts/AuthContext.jsx)

**State Management:**
```jsx
const [user, setUser] = useState(null);
const [token, setToken] = useState(localStorage.getItem('token'));
const [loading, setLoading] = useState(true);
```

**Methods:**
- `login(email, password)` - Authenticate and store JWT
- `register(name, email, password)` - Create new account
- `logout()` - Clear token and redirect
- `isAuthenticated()` - Check login status

**Usage:**
```jsx
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { user, login, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated()) {
    return <Navigate to="/login" />;
  }

  return <div>Welcome, {user.name}</div>;
}
```

### Protected Routes

**Location:** [frontend/src/components/ProtectedRoute.jsx](frontend/src/components/ProtectedRoute.jsx)

**Implementation:**
```jsx
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
```

**Usage in App.jsx:**
```jsx
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

---

## 📡 API Integration

### Axios Client

**Location:** [frontend/src/utils/api.js](frontend/src/utils/api.js)

**Configuration:**
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor (adds JWT token)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor (handles errors)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login on 401
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

**Usage Examples:**
```javascript
// GET request
const projects = await api.get('/api/projects');

// POST request
const newProject = await api.post('/api/projects', {
  name: 'My Project',
  customer_name: 'Acme Corp'
});

// PUT request
await api.put(`/api/projects/${id}`, { name: 'Updated Name' });

// DELETE request
await api.delete(`/api/projects/${id}`);
```

---

## 🔄 Real-Time Updates

### Controller Status Polling

**Location:** [frontend/src/hooks/useControllerStatus.js](frontend/src/hooks/useControllerStatus.js)

**Hook Implementation:**
```javascript
function useControllerStatus(controllerIds) {
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatuses = async () => {
      const results = {};
      for (const id of controllerIds) {
        const response = await api.get(`/api/controllers/${id}`);
        results[id] = response.data.controller.status;
      }
      setStatuses(results);
      setLoading(false);
    };

    fetchStatuses();
    const interval = setInterval(fetchStatuses, 10000); // Poll every 10s

    return () => clearInterval(interval);
  }, [controllerIds]);

  return { statuses, loading };
}
```

**Usage:**
```jsx
function ControllerList({ controllers }) {
  const controllerIds = controllers.map(c => c.id);
  const { statuses } = useControllerStatus(controllerIds);

  return (
    <div>
      {controllers.map(controller => (
        <div key={controller.id}>
          <h3>{controller.name}</h3>
          <span className={statuses[controller.id] === 'online' ? 'text-green-500' : 'text-red-500'}>
            {statuses[controller.id] || 'unknown'}
          </span>
        </div>
      ))}
    </div>
  );
}
```

**Features:**
- ✅ Polls multiple controllers simultaneously
- ✅ 10-second refresh interval
- ✅ Automatic cleanup on unmount
- ✅ Loading states
- ✅ Error handling

---

## 🗺️ Routing Structure

**Location:** [frontend/src/App.jsx](frontend/src/App.jsx)

```jsx
<Router>
  <Routes>
    {/* Public routes */}
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />

    {/* Protected routes */}
    <Route path="/" element={
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    }>
      <Route index element={<Dashboard />} />
      <Route path="projects" element={<Projects />} />
      <Route path="projects/:projectId" element={<ProjectDetail />} />
      <Route path="controllers/:controllerId" element={<ControllerDetailTabs />} />
    </Route>

    {/* 404 */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
</Router>
```

**URL Structure:**
- `/login` - Login page
- `/register` - Registration page
- `/` - Dashboard (project overview)
- `/projects` - Project list
- `/projects/:projectId` - Project detail (tabs: Overview, Controllers, Devices)
- `/controllers/:controllerId` - Controller detail (tabs: Devices, Scenes, AI)

---

## 📄 Page Components

### 1. Login Page ✅

**Location:** [frontend/src/pages/Login.jsx](frontend/src/pages/Login.jsx)

**Features:**
- Email/password form
- JWT token storage
- Error handling
- Link to registration
- Form validation
- Loading states

**Implementation:**
```jsx
async function handleSubmit(e) {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    await login(email, password);
    navigate('/');
  } catch (err) {
    setError('Invalid email or password');
  } finally {
    setLoading(false);
  }
}
```

---

### 2. Dashboard ✅

**Location:** [frontend/src/pages/Dashboard.jsx](frontend/src/pages/Dashboard.jsx)

**Features:**
- Project statistics (total count)
- Recent projects list
- Quick action buttons
- Responsive grid layout
- Loading states
- Empty states

**Data Displayed:**
- Total projects
- Active controllers (future)
- Recent activity (future)
- System status (future)

---

### 3. Projects Page ✅

**Location:** [frontend/src/pages/Projects.jsx](frontend/src/pages/Projects.jsx)

**Features:**
- Project list (cards)
- Create new project
- Search/filter (planned)
- Pagination (planned)
- Click to view details

**Card Information:**
- Project name
- Customer name
- Location
- Controller count
- Creation date

---

### 4. Project Detail ✅

**Location:** [frontend/src/pages/ProjectDetail.jsx](frontend/src/pages/ProjectDetail.jsx)

**Features:**
- Tab navigation (Overview, Controllers, Devices)
- Breadcrumb navigation
- Project metadata display
- Controller list
- Add/edit/delete controllers
- Real-time status updates

**Tabs:**
1. **Overview** - Project info, stats
2. **Controllers** - Controller management
3. **Devices** - Redirects to controller detail

---

### 5. Controller Detail Tabs ✅

**Location:** [frontend/src/pages/ControllerDetailTabs.jsx](frontend/src/pages/ControllerDetailTabs.jsx)

**Features:**
- Tab navigation (Devices, Scenes, AI)
- Controller status indicator
- Breadcrumb navigation
- Connection key display

**Tabs:**
1. **Devices** ✅ - DeviceManagement component
2. **Scenes** ⏸️ - Placeholder (not implemented)
3. **AI Chat** ⏸️ - Placeholder (not implemented)

---

## 🧩 Reusable Components

### Layout Component ✅

**Location:** [frontend/src/components/Layout.jsx](frontend/src/components/Layout.jsx)

**Structure:**
```jsx
<div className="min-h-screen bg-gray-50">
  {/* Header */}
  <header className="bg-white shadow">
    <nav>
      <Link to="/">Dashboard</Link>
      <Link to="/projects">Projects</Link>
      <button onClick={logout}>Logout</button>
    </nav>
  </header>

  {/* Main content */}
  <main className="max-w-7xl mx-auto py-6 px-4">
    <Outlet />
  </main>
</div>
```

**Features:**
- Responsive navigation
- User info display
- Logout button
- Consistent padding/margins
- Outlet for nested routes

---

### DeviceManagement Component ✅

**Location:** [frontend/src/components/DeviceManagement.jsx](frontend/src/components/DeviceManagement.jsx)

**Features:**
- ✅ Device list (cards)
- ✅ Add device modal
- ✅ Edit device modal
- ✅ Delete confirmation
- ✅ Device type selection (Harvey DSP, AV Matrix, DMX, Generic TCP)
- ✅ Connection configuration (IP, port)
- ✅ Status indicators
- ✅ Hover-reveal action buttons
- ✅ Empty states

**Device Card:**
```jsx
<div className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
  <div className="flex justify-between items-start">
    <div>
      <h3 className="font-semibold">{device.name}</h3>
      <p className="text-sm text-gray-600">{device.type}</p>
      <p className="text-xs text-gray-500">{device.ip}:{device.port}</p>
    </div>
    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <button onClick={() => handleEdit(device)}>Edit</button>
      <button onClick={() => handleDelete(device)}>Delete</button>
    </div>
  </div>
</div>
```

---

### GuiPreview Component ⏸️

**Location:** [frontend/src/components/GuiPreview.jsx](frontend/src/components/GuiPreview.jsx)

**Status:** Placeholder only (not functional)

**Planned Features:**
- Render JSON GUI files visually
- Interactive elements (buttons, sliders)
- Zoom/pan controls
- Responsive preview
- Refresh on changes

**Current Implementation:**
```jsx
function GuiPreview() {
  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
      <p className="text-gray-500">GUI Preview - Coming Soon</p>
    </div>
  );
}
```

---

## ❌ Missing Components (Backend Ready)

### 1. AI Chat Interface ❌

**Backend:** ✅ Fully implemented ([src/routes/ai.js](src/routes/ai.js))

**Required Features:**
- Chat message list (user, assistant, system)
- Message input with send button
- Streaming response handler
- Markdown rendering
- Code syntax highlighting
- Copy to clipboard
- Message history
- Loading indicators

**Suggested Implementation:**
```jsx
function AiChatInterface({ controllerId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    setLoading(true);
    const response = await api.post(`/api/controllers/${controllerId}/ai/chat`, {
      prompt: input,
      provider: 'gemini'
    });
    setMessages([...messages,
      { role: 'user', content: input },
      { role: 'assistant', content: response.data.result.explanation }
    ]);
    setInput('');
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
            <div className="inline-block bg-white rounded-lg p-3 shadow">
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI to design a GUI..."
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <button onClick={sendMessage} disabled={loading}>
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### 2. Scene Management UI ❌

**Backend:** ✅ Fully implemented ([src/routes/scenes.js](src/routes/scenes.js))

**Required Features:**
- Scene list view
- Create scene modal
- Scene editor (step sequencer)
- Add/remove steps
- Configure delays
- Execute scene button
- Scene status indicator

**Suggested Structure:**
```jsx
function SceneManagement({ controllerId }) {
  return (
    <div>
      {/* Scene list */}
      <div className="grid grid-cols-3 gap-4">
        {scenes.map(scene => (
          <SceneCard key={scene.id} scene={scene} />
        ))}
      </div>

      {/* Add scene button */}
      <button onClick={() => setShowModal(true)}>
        + Create Scene
      </button>

      {/* Scene editor modal */}
      {showModal && <SceneEditor onSave={handleSave} />}
    </div>
  );
}
```

---

### 3. Device Controls Mapping UI ❌

**Backend:** ✅ Fully implemented ([src/routes/device-controls.js](src/routes/device-controls.js))

**Required Features:**
- Control list for device
- Add control form
- Logical name → hardware block mapping
- Parameter configuration
- Test control button
- Delete control

**Suggested Implementation:**
```jsx
function ControlsMapping({ deviceId }) {
  return (
    <div>
      <h3>Device Controls</h3>

      {/* Control list */}
      {controls.map(control => (
        <div key={control.id} className="border p-4 rounded">
          <div className="flex justify-between">
            <div>
              <span className="font-semibold">{control.logical_name}</span>
              <span className="text-gray-600">→ {control.hardware_block_id}</span>
            </div>
            <button onClick={() => testControl(control)}>Test</button>
          </div>
        </div>
      ))}

      {/* Add control */}
      <button onClick={() => setShowAddModal(true)}>
        + Add Control
      </button>
    </div>
  );
}
```

---

## 🚀 Build & Deployment

### Development

```bash
# Install dependencies
cd frontend
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Lint code
npm run lint
```

### Production Build

```bash
# Build for production
npm run build

# Output: frontend/dist/
# - index.html
# - assets/ (JS, CSS bundles)

# Preview production build
npm run preview
```

### Environment Variables

**Location:** `frontend/.env`

```bash
# API base URL
VITE_API_URL=https://backend-production-baec.up.railway.app

# Feature flags (future)
VITE_ENABLE_DARK_MODE=true
VITE_ENABLE_ANALYTICS=false
```

**Usage in code:**
```javascript
const apiUrl = import.meta.env.VITE_API_URL;
```

---

## 🎯 Performance Optimization

### Code Splitting

**React Router automatic code splitting:**
```javascript
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));

<Suspense fallback={<div>Loading...</div>}>
  <Dashboard />
</Suspense>
```

### Image Optimization

```javascript
// Use WebP format
<img src="logo.webp" alt="Logo" />

// Lazy loading
<img src="image.jpg" loading="lazy" alt="..." />
```

### Bundle Size

**Current (estimated):**
- React + React DOM: ~140KB
- React Router: ~20KB
- Axios: ~13KB
- Tailwind CSS: ~10KB (purged)
- **Total:** ~183KB (gzipped)

---

## 🐛 Known Issues

### Current Limitations

1. **No AI Chat Interface** - Core feature missing
2. **No Scene Management** - Users can't create scenes visually
3. **No Controls Mapping UI** - Requires API calls
4. **GuiPreview is placeholder** - Not functional
5. **No dark mode toggle** - CSS classes ready but no UI
6. **No offline support** - No service worker
7. **No E2E tests** - Only manual testing

---

## 🔮 Future Enhancements

### Short-Term (Sprint 7-8)
- [ ] Implement AI chat interface
- [ ] Add scene management UI
- [ ] Add controls mapping interface
- [ ] Make GUI preview interactive
- [ ] Add deploy/sync controls UI

### Medium-Term (Sprint 9-10)
- [ ] Dark mode toggle
- [ ] Drag-and-drop GUI editor
- [ ] Advanced search/filtering
- [ ] Bulk operations
- [ ] Keyboard shortcuts

### Long-Term (Post-Launch)
- [ ] Mobile app (React Native)
- [ ] Offline mode (PWA)
- [ ] Real-time collaboration
- [ ] Advanced analytics
- [ ] Custom themes

---

## 📚 Resources

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Router](https://reactrouter.com/)
- [Axios Documentation](https://axios-http.com/)

---

**Last Updated:** October 10, 2025
**Status:** Structure Complete (55%), Missing Key Features
**Next Priority:** AI Chat Interface Implementation
