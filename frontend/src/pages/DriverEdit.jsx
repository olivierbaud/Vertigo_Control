import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function DriverEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'draft',
    driver_code: '',
    connection_config: '{}',
    notes: ''
  });

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

      // Populate form data
      setFormData({
        name: data.driver.name || '',
        description: data.driver.description || '',
        status: data.driver.status || 'draft',
        driver_code: data.driver.driver_code || '',
        connection_config: JSON.stringify(data.driver.connection_config || {}, null, 2),
        notes: data.driver.notes || ''
      });
    } catch (error) {
      console.error('Error fetching driver:', error);
      alert('Failed to load driver');
      navigate('/drivers');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate JSON fields
    try {
      JSON.parse(formData.connection_config);
    } catch (error) {
      alert('Invalid JSON in connection configuration');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('token');

      const payload = {
        name: formData.name,
        description: formData.description,
        status: formData.status,
        driver_code: formData.driver_code,
        connection_config: JSON.parse(formData.connection_config),
        notes: formData.notes
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/drivers/${id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update driver');
      }

      alert('Driver updated successfully');
      navigate(`/drivers/${id}`);
    } catch (error) {
      console.error('Error updating driver:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
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
        <button
          onClick={() => navigate('/drivers')}
          className="text-blue-600 dark:text-blue-400 hover:underline mt-4"
        >
          Back to Drivers
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/drivers/${id}`)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Edit Driver
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {driver.name}
            </p>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Basic Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Driver Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="draft">Draft</option>
                <option value="testing">Testing</option>
                <option value="validated">Validated</option>
                <option value="production">Production</option>
                <option value="deprecated">Deprecated</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Internal notes about this driver..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Connection Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Connection Configuration
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Connection Config (JSON)
            </label>
            <textarea
              name="connection_config"
              value={formData.connection_config}
              onChange={handleChange}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Must be valid JSON
            </p>
          </div>
        </div>

        {/* Driver Code */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Driver Code
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Python Code
            </label>
            <textarea
              name="driver_code"
              value={formData.driver_code}
              onChange={handleChange}
              rows={20}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Modify the driver code carefully. Validate after making changes.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <button
            type="button"
            onClick={() => navigate(`/drivers/${id}`)}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
                     rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                     dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
