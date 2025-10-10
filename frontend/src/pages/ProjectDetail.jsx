import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { projectsAPI, controllersAPI } from '../utils/api';

const ProjectDetail = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [project, setProject] = useState(null);
  const [controllers, setControllers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddControllerModal, setShowAddControllerModal] = useState(false);
  const [showConnectionKeyModal, setShowConnectionKeyModal] = useState(false);
  const [newControllerKey, setNewControllerKey] = useState(null);
  const [controllerFormData, setControllerFormData] = useState({
    name: '',
  });

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const [projectRes, controllersRes] = await Promise.all([
        projectsAPI.getOne(projectId),
        projectsAPI.getControllers(projectId),
      ]);
      setProject(projectRes.data.project);
      setControllers(controllersRes.data.controllers);
    } catch (error) {
      console.error('Failed to fetch project data:', error);
      // If project not found, redirect to projects page
      if (error.response?.status === 404) {
        navigate('/projects');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddController = async (e) => {
    e.preventDefault();
    try {
      const response = await projectsAPI.createController(projectId, controllerFormData);
      const controller = response.data.controller;

      // Close the add modal and show the connection key modal
      setShowAddControllerModal(false);
      setControllerFormData({ name: '' });
      setNewControllerKey(controller);
      setShowConnectionKeyModal(true);

      // Refresh the controller list
      fetchProjectData();
    } catch (error) {
      console.error('Failed to create controller:', error);
      alert('Failed to create controller');
    }
  };

  const handleCopyConnectionKey = () => {
    if (newControllerKey?.connection_key) {
      navigator.clipboard.writeText(newControllerKey.connection_key);
      alert('Connection key copied to clipboard!');
    }
  };

  const handleCloseConnectionKeyModal = () => {
    setShowConnectionKeyModal(false);
    setNewControllerKey(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">Project not found</h3>
          <Link to="/projects" className="mt-4 text-primary-600 hover:text-primary-700">
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'M4 6h16M4 12h16M4 18h16' },
    { id: 'controllers', label: 'Controllers', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
    { id: 'devices', label: 'Devices', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link to="/projects" className="text-primary-600 hover:text-primary-700 flex items-center mb-4">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Projects
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            {project.customer_name && (
              <p className="text-gray-600 mt-2">Customer: {project.customer_name}</p>
            )}
            {project.location && (
              <p className="text-gray-500 text-sm">Location: {project.location}</p>
            )}
          </div>
          {activeTab === 'controllers' && (
            <button
              onClick={() => setShowAddControllerModal(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Controller
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.label}
              {tab.id === 'controllers' && (
                <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs font-medium">
                  {controllers.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Information</h2>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Project Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{project.name}</dd>
                </div>
                {project.customer_name && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Customer</dt>
                    <dd className="mt-1 text-sm text-gray-900">{project.customer_name}</dd>
                  </div>
                )}
                {project.location && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Location</dt>
                    <dd className="mt-1 text-sm text-gray-900">{project.location}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(project.created_at).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Controllers</p>
                    <p className="text-2xl font-semibold text-gray-900">{controllers.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Online</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {controllers.filter(c => c.status === 'online').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Offline</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {controllers.filter(c => c.status === 'offline').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Controllers Tab */}
        {activeTab === 'controllers' && (
          <div>
            {controllers.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No controllers yet</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Add a controller to start managing devices and automation
                </p>
                <button
                  onClick={() => setShowAddControllerModal(true)}
                  className="mt-6 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add First Controller
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {controllers.map((controller) => (
                  <Link
                    key={controller.id}
                    to={`/controllers/${controller.id}`}
                    className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-primary-100 rounded-lg">
                        <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                        </svg>
                      </div>
                      <div className="flex items-center">
                        <span className={`
                          inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${controller.status === 'online'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                          }
                        `}>
                          <span className={`
                            w-2 h-2 mr-1 rounded-full
                            ${controller.status === 'online' ? 'bg-green-400' : 'bg-gray-400'}
                          `}></span>
                          {controller.status}
                        </span>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{controller.name}</h3>
                    {controller.ip_address && (
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">IP:</span> {controller.ip_address}
                      </p>
                    )}
                    <div className="pt-4 border-t border-gray-200 mt-4">
                      <p className="text-xs text-gray-500">
                        {controller.last_seen
                          ? `Last seen ${new Date(controller.last_seen).toLocaleString()}`
                          : 'Never connected'
                        }
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Devices Tab */}
        {activeTab === 'devices' && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Device management</h3>
            <p className="mt-2 text-sm text-gray-500">
              Devices are managed per controller. Select a controller to manage its devices.
            </p>
          </div>
        )}
      </div>

      {/* Add Controller Modal */}
      {showAddControllerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Add Controller</h2>
              <button
                onClick={() => setShowAddControllerModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddController} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Controller Name *
                </label>
                <input
                  type="text"
                  required
                  value={controllerFormData.name}
                  onChange={(e) => setControllerFormData({ ...controllerFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Main Building Controller"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-blue-800">
                    After creating the controller, you'll receive a connection key to provision the NUC device.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddControllerModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Add Controller
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Connection Key Modal */}
      {showConnectionKeyModal && newControllerKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg mr-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Controller Created!</h2>
              </div>
              <button
                onClick={handleCloseConnectionKeyModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Controller <span className="font-semibold">{newControllerKey.name}</span> has been created successfully.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Important: Save this connection key!</p>
                    <p>You'll need this key to provision your NUC controller. This key will not be shown again.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Connection Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={newControllerKey.connection_key}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleCopyConnectionKey}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center"
                  >
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Next Steps:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Copy the connection key</li>
                      <li>SSH into your NUC controller</li>
                      <li>Run the provisioning command with this key</li>
                      <li>The controller will connect automatically</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseConnectionKeyModal}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
