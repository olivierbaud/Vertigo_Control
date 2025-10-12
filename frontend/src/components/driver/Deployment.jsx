import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function Deployment({ driverData, onDeployComplete }) {
  const [controllers, setControllers] = useState([]);
  const [selectedController, setSelectedController] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    fetchControllers();
  }, []);

  const fetchControllers = async () => {
    try {
      // Fetch all projects and their controllers
      const projectsResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/api/projects`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!projectsResponse.ok) throw new Error('Failed to fetch projects');

      const projectsData = await projectsResponse.json();

      // Fetch controllers for each project
      const allControllers = [];
      for (const project of projectsData.projects) {
        const controllersResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/api/projects/${project.id}/controllers`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (controllersResponse.ok) {
          const controllersData = await controllersResponse.json();
          controllersData.controllers.forEach(ctrl => {
            allControllers.push({
              ...ctrl,
              projectName: project.name
            });
          });
        }
      }

      setControllers(allControllers);
    } catch (error) {
      console.error('Error fetching controllers:', error);
    }
  };

  const handleDeploy = async () => {
    if (!selectedController) {
      alert('Please select a controller');
      return;
    }

    if (!driverData.driverId) {
      alert('No driver ID found. Please generate the driver first.');
      return;
    }

    setDeploying(true);
    setDeploymentStatus({ status: 'deploying', message: 'Deploying driver to controller...' });

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/drivers/${driverData.driverId}/deploy`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            controllerId: selectedController
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Deployment failed');
      }

      const result = await response.json();

      setDeploymentStatus({
        status: 'success',
        message: 'Driver deployed successfully!',
        syncId: result.syncId
      });

      setTimeout(() => {
        onDeployComplete();
      }, 2000);

    } catch (error) {
      setDeploymentStatus({
        status: 'error',
        message: error.message
      });
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Deploy Driver to Controller
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Select a controller to deploy your driver. The driver will be synced via WebSocket.
        </p>
      </div>

      {/* Driver Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20
                      border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Driver Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-600 dark:text-gray-400 mb-1">Name</div>
            <div className="font-semibold text-gray-900 dark:text-white">{driverData.name || 'Unknown'}</div>
          </div>
          <div>
            <div className="text-gray-600 dark:text-gray-400 mb-1">Protocol</div>
            <div className="font-semibold text-gray-900 dark:text-white uppercase">{driverData.protocolType}</div>
          </div>
          <div>
            <div className="text-gray-600 dark:text-gray-400 mb-1">Commands</div>
            <div className="font-semibold text-gray-900 dark:text-white">{driverData.commands?.length || 0}</div>
          </div>
          <div>
            <div className="text-gray-600 dark:text-gray-400 mb-1">Version</div>
            <div className="font-semibold text-gray-900 dark:text-white">1.0.0</div>
          </div>
        </div>
      </div>

      {/* Controller Selection */}
      {!deploymentStatus && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Select Controller
          </label>

          {controllers.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No controllers found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Create a controller in a project first before deploying drivers.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {controllers.map((controller) => (
                <button
                  key={controller.id}
                  onClick={() => setSelectedController(controller.id)}
                  className={`
                    p-4 border-2 rounded-lg text-left transition-all
                    ${selectedController === controller.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700'
                    }
                  `}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {controller.name}
                    </div>
                    {selectedController === controller.id && (
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {controller.projectName}
                  </div>
                  <div className={`
                    text-xs px-2 py-1 rounded inline-block
                    ${controller.status === 'online'
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }
                  `}>
                    {controller.status || 'offline'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Deployment Status */}
      {deploymentStatus && (
        <div className={`
          rounded-lg p-6 border-2
          ${deploymentStatus.status === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
            : deploymentStatus.status === 'error'
            ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
          }
        `}>
          <div className="flex items-center gap-4">
            {deploymentStatus.status === 'deploying' && (
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            )}
            {deploymentStatus.status === 'success' && (
              <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {deploymentStatus.status === 'error' && (
              <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            <div>
              <h3 className={`text-lg font-semibold
                ${deploymentStatus.status === 'success' ? 'text-green-900 dark:text-green-100' :
                  deploymentStatus.status === 'error' ? 'text-red-900 dark:text-red-100' :
                  'text-blue-900 dark:text-blue-100'
                }`}>
                {deploymentStatus.status === 'deploying' ? 'Deploying...' :
                 deploymentStatus.status === 'success' ? 'Deployment Successful!' :
                 'Deployment Failed'}
              </h3>
              <p className={`text-sm
                ${deploymentStatus.status === 'success' ? 'text-green-800 dark:text-green-200' :
                  deploymentStatus.status === 'error' ? 'text-red-800 dark:text-red-200' :
                  'text-blue-800 dark:text-blue-200'
                }`}>
                {deploymentStatus.message}
              </p>
              {deploymentStatus.syncId && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Sync ID: {deploymentStatus.syncId}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deploy Button */}
      {!deploymentStatus && controllers.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleDeploy}
            disabled={deploying || !selectedController}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg
                       hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all font-medium flex items-center gap-2"
          >
            {deploying ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Deploying...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Deploy to Controller
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
