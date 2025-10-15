import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

export default function DriverDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  useEffect(() => {
    fetchDriver();
  }, [id]);

  const fetchDriver = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/drivers/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch driver');

      const data = await response.json();
      setDriver(data.driver);
    } catch (error) {
      console.error('Error fetching driver:', error);
      alert('Failed to load driver details');
      navigate('/drivers');
    } finally {
      setLoading(false);
    }
  };

  const validateDriver = async () => {
    try {
      setValidating(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/drivers/${id}/validate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to validate driver');

      const data = await response.json();
      setValidationResult(data);

      if (data.valid) {
        alert('Driver validation successful!');
        fetchDriver(); // Refresh driver data
      } else {
        alert(`Validation failed with ${data.errors.length} error(s)`);
      }
    } catch (error) {
      console.error('Error validating driver:', error);
      alert('Failed to validate driver');
    } finally {
      setValidating(false);
    }
  };

  const deleteDriver = async () => {
    if (!confirm(`Are you sure you want to delete "${driver.name}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/drivers/${id}`,
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
      navigate('/drivers');
    } catch (error) {
      alert(`Error: ${error.message}`);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Driver not found</p>
        <Link to="/drivers" className="text-blue-600 dark:text-blue-400 hover:underline mt-4 inline-block">
          Back to Drivers
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/drivers')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {driver.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {driver.device_type}
            </p>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(driver.status)}`}>
            {driver.status}
          </span>
          {driver.is_validated && (
            <span className="inline-flex items-center text-green-600 dark:text-green-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="ml-1 text-sm">Validated</span>
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={validateDriver}
            disabled={validating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                     dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {validating ? 'Validating...' : 'Validate'}
          </button>
          <Link
            to={`/drivers/${id}/edit`}
            className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200
                     rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Edit
          </Link>
          <button
            onClick={deleteDriver}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700
                     dark:bg-red-500 dark:hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Validation Results */}
      {validationResult && (
        <div className={`p-4 rounded-lg border ${
          validationResult.valid
            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
            : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
        }`}>
          <h3 className={`font-semibold mb-2 ${
            validationResult.valid
              ? 'text-green-800 dark:text-green-300'
              : 'text-red-800 dark:text-red-300'
          }`}>
            {validationResult.valid ? 'Validation Passed' : 'Validation Failed'}
          </h3>
          {validationResult.errors.length > 0 && (
            <div className="space-y-1">
              <p className="font-medium text-red-700 dark:text-red-400">Errors:</p>
              <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400">
                {validationResult.errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          {validationResult.warnings.length > 0 && (
            <div className="space-y-1 mt-3">
              <p className="font-medium text-yellow-700 dark:text-yellow-400">Warnings:</p>
              <ul className="list-disc list-inside text-sm text-yellow-600 dark:text-yellow-400">
                {validationResult.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Driver Info Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Basic Information
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Device Type</dt>
              <dd className="text-sm text-gray-900 dark:text-white mt-1">{driver.device_type}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Manufacturer</dt>
              <dd className="text-sm text-gray-900 dark:text-white mt-1">{driver.manufacturer || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Model</dt>
              <dd className="text-sm text-gray-900 dark:text-white mt-1">{driver.model || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Protocol Type</dt>
              <dd className="text-sm text-gray-900 dark:text-white mt-1 uppercase">{driver.protocol_type}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Version</dt>
              <dd className="text-sm text-gray-900 dark:text-white mt-1">{driver.version || '1.0.0'}</dd>
            </div>
          </dl>
        </div>

        {/* AI Generation Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            AI Generation
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">AI Provider</dt>
              <dd className="text-sm text-gray-900 dark:text-white mt-1 capitalize">
                {driver.ai_provider || 'N/A'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">AI Model</dt>
              <dd className="text-sm text-gray-900 dark:text-white mt-1">{driver.ai_model || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Tokens Used</dt>
              <dd className="text-sm text-gray-900 dark:text-white mt-1">
                {driver.ai_tokens_used?.toLocaleString() || 0}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Cost (USD)</dt>
              <dd className="text-sm text-gray-900 dark:text-white mt-1">
                ${typeof driver.ai_cost_usd === 'number' ? driver.ai_cost_usd.toFixed(4) : (typeof driver.ai_cost_usd === 'string' ? parseFloat(driver.ai_cost_usd).toFixed(4) : '0.0000')}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Created At</dt>
              <dd className="text-sm text-gray-900 dark:text-white mt-1">
                {new Date(driver.created_at).toLocaleString()}
              </dd>
            </div>
            {driver.updated_at && driver.updated_at !== driver.created_at && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Updated At</dt>
                <dd className="text-sm text-gray-900 dark:text-white mt-1">
                  {new Date(driver.updated_at).toLocaleString()}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Description */}
      {driver.description && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Description
          </h2>
          <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
            {driver.description}
          </p>
        </div>
      )}

      {/* Protocol Notes */}
      {driver.protocol_notes && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Protocol Notes
          </h2>
          <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
            {driver.protocol_notes}
          </p>
        </div>
      )}

      {/* Connection Config */}
      {driver.connection_config && Object.keys(driver.connection_config).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Connection Configuration
          </h2>
          <pre className="text-sm bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto text-gray-800 dark:text-gray-200">
            {JSON.stringify(driver.connection_config, null, 2)}
          </pre>
        </div>
      )}

      {/* Commands */}
      {driver.commands && driver.commands.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Available Commands
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {driver.commands.map((cmd, idx) => (
              <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">{cmd.name}</h3>
                {cmd.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{cmd.description}</p>
                )}
                {cmd.parameters && cmd.parameters.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Parameters:</p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 list-disc list-inside">
                      {cmd.parameters.map((param, pidx) => (
                        <li key={pidx}>{param}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Driver Code */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Driver Code
        </h2>
        <pre className="text-sm bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto text-gray-800 dark:text-gray-200 max-h-96 overflow-y-auto">
          <code>{driver.driver_code}</code>
        </pre>
      </div>
    </div>
  );
}
