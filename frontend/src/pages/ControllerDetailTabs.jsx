import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { controllersAPI } from '../utils/api';
import DeviceManagement from '../components/DeviceManagement';

const ControllerDetailTabs = () => {
  const { controllerId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('devices');
  const [controller, setController] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (controllerId) {
      fetchController();
    }
  }, [controllerId]);

  const fetchController = async () => {
    try {
      setLoading(true);
      const response = await controllersAPI.getOne(controllerId);
      setController(response.data.controller);
    } catch (error) {
      console.error('Failed to fetch controller:', error);
      if (error.response?.status === 404) {
        // Controller not found
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!controller) {
    return (
      <div className="p-8 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-full">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none p-12 text-center border dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Controller not found</h3>
          <p className="text-gray-600 dark:text-gray-400 mt-2">The controller you're looking for doesn't exist</p>
          <Link to="/projects" className="mt-4 inline-block text-primary-600 hover:text-primary-700 dark:text-primary-300 dark:hover:text-primary-200">
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'devices', label: 'Devices', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
    { id: 'scenes', label: 'Scenes', icon: 'M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z' },
    { id: 'ai', label: 'AI Chat', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  ];

  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-full">
      {/* Header */}
      <div className="mb-6">
        <Link
          to={`/projects/${controller.project_id}`}
          className="text-primary-600 hover:text-primary-700 dark:text-primary-300 dark:hover:text-primary-200 flex items-center mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Project
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{controller.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                controller.status === 'online'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                <span className={`w-2 h-2 rounded-full mr-2 ${
                  controller.status === 'online' ? 'bg-green-600' : 'bg-gray-600'
                }`}></span>
                {controller.status}
              </span>
              {controller.ip_address && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  IP: {controller.ip_address}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-primary-600 text-primary-600 dark:border-primary-300 dark:text-primary-300'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
                }
              `}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'devices' && (
          <DeviceManagement controllerId={controllerId} />
        )}

        {activeTab === 'scenes' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none p-12 text-center border dark:border-gray-700">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">Scene Management</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Scene management coming soon. Create automation sequences for your devices.
            </p>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none p-12 text-center border dark:border-gray-700">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">AI-Powered GUI Design</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              AI chat interface coming soon. Design touch panel interfaces with natural language.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControllerDetailTabs;
