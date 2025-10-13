import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext'; // Import ThemeProvider
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import ControllerDetailTabs from './pages/ControllerDetailTabs';
import Drivers from './pages/Drivers';
import DriverCreator from './pages/DriverCreator';
import DriverDetails from './pages/DriverDetails';
import DriverEdit from './pages/DriverEdit';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider> {/* Wrap AuthProvider with ThemeProvider */}
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes with layout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:projectId" element={<ProjectDetail />} />
              <Route path="controllers/:controllerId" element={<ControllerDetailTabs />} />
              <Route path="drivers" element={<Drivers />} />
              <Route path="drivers/create" element={<DriverCreator />} />
              <Route path="drivers/:id" element={<DriverDetails />} />
              <Route path="drivers/:id/edit" element={<DriverEdit />} />
            </Route>

            {/* Catch all - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
