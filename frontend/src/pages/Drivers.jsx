import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();
  const { token } = useAuth();

  useEffect(() => {
    fetchDrivers();
  }, [filter]);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/drivers?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch drivers');

      const data = await response.json();
      setDrivers(data.drivers);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      testing: 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      validated: 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      production: 'bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-300',
      deprecated: 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-300'
    };

    return badges[status] || badges.draft;
  };

  const getProtocolIcon = (protocol) => {
    const icons = {
      tcp: '🔌',
      udp: '📡',
      serial: '🔗',
      http: '🌐',
      websocket: '⚡',
      mqtt: '📨'
    };

    return icons[protocol] || '🔧';
  };

  const deleteDriver = async (driverId, driverName) => {
    if (!confirm(`Are you sure you want to delete "${driverName}"?`)) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/drivers/${driverId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete driver');
      }

      alert('Driver deleted successfully');
      fetchDrivers();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Device Drivers
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            AI-generated device drivers for your controllers
          </p>
        </div>

        <button
          onClick={() => navigate('/drivers/create')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                     dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors
                     flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Driver with AI
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {['all', 'draft', 'testing', 'validated', 'production'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm transition-colors
                ${filter === tab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Drivers List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : drivers.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No drivers found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by creating a new driver with AI assistance.
          </p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/drivers/create')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Driver
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {drivers.map((driver) => (
            <div
              key={driver.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700
                         hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-sm hover:shadow-md"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getProtocolIcon(driver.protocol_type)}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {driver.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {driver.device_type}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mb-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(driver.status)}`}>
                    {driver.status}
                  </span>
                  {driver.is_validated && (
                    <span className="ml-2 inline-flex items-center text-green-600 dark:text-green-400">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Protocol:</span>
                    <span className="uppercase">{driver.protocol_type}</span>
                  </div>
                  {driver.manufacturer && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Manufacturer:</span>
                      <span>{driver.manufacturer}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Deployments:</span>
                    <span>{driver.deployment_count || 0}</span>
                  </div>
                  {driver.ai_provider && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Generated with:</span>
                      <span className="capitalize">{driver.ai_provider}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {driver.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {driver.description}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Link
                    to={`/drivers/${driver.id}`}
                    className="flex-1 px-3 py-2 text-sm text-center text-blue-600 dark:text-blue-400
                               hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                  >
                    View Details
                  </Link>
                  <Link
                    to={`/drivers/${driver.id}/edit`}
                    className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400
                               hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => deleteDriver(driver.id, driver.name)}
                    className="px-3 py-2 text-sm text-red-600 dark:text-red-400
                               hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
