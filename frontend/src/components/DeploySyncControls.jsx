import { useState, useEffect } from 'react';
import api from '../utils/api';

function DeploySyncControls({ controllerId }) {
  const [status, setStatus] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchStatus();
    fetchVersions();
  }, [controllerId]);

  const fetchStatus = async () => {
    try {
      const response = await api.get(`/api/controllers/${controllerId}/gui/status`);
      if (response.data.success) {
        setStatus(response.data.status);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch status:', err);
      setError('Failed to load GUI status');
      setLoading(false);
    }
  };

  const fetchVersions = async () => {
    try {
      const response = await api.get(`/api/controllers/${controllerId}/gui/versions`);
      if (response.data.success) {
        setVersions(response.data.versions || []);
      }
    } catch (err) {
      console.error('Failed to fetch versions:', err);
    }
  };

  const handleDeploy = async () => {
    if (!window.confirm('Deploy draft files to deployed state? This will create a new version snapshot.')) {
      return;
    }

    setDeploying(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post(`/api/controllers/${controllerId}/gui/deploy`);
      if (response.data.success) {
        setSuccess('✅ Deployed successfully! Version ' + response.data.version);
        fetchStatus();
        fetchVersions();
      } else {
        setError(response.data.error || 'Deploy failed');
      }
    } catch (err) {
      console.error('Deploy error:', err);
      setError(err.response?.data?.error || 'Failed to deploy');
    } finally {
      setDeploying(false);
    }
  };

  const handleSync = async () => {
    if (!window.confirm('Sync deployed files to controller? This will update the live GUI.')) {
      return;
    }

    setSyncing(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post(`/api/controllers/${controllerId}/gui/sync`);
      if (response.data.success) {
        setSuccess('✅ Sync initiated! Waiting for controller confirmation...');
        // In a real implementation, you'd poll for sync status or use WebSocket
        setTimeout(fetchStatus, 2000);
      } else {
        setError(response.data.error || 'Sync failed');
      }
    } catch (err) {
      console.error('Sync error:', err);
      setError(err.response?.data?.error || 'Failed to sync');
    } finally {
      setSyncing(false);
    }
  };

  const handleDiscard = async () => {
    setDiscarding(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post(`/api/controllers/${controllerId}/gui/discard`);
      if (response.data.success) {
        setSuccess('✅ Draft changes discarded');
        fetchStatus();
      } else {
        setError(response.data.error || 'Discard failed');
      }
    } catch (err) {
      console.error('Discard error:', err);
      setError(err.response?.data?.error || 'Failed to discard');
    } finally {
      setDiscarding(false);
      setShowDiscardConfirm(false);
    }
  };

  const handleRollback = async (version) => {
    if (!window.confirm(`Rollback to version ${version}? This will replace current draft files.`)) {
      return;
    }

    try {
      const response = await api.post(`/api/controllers/${controllerId}/gui/rollback`, {
        version
      });
      if (response.data.success) {
        setSuccess(`✅ Rolled back to version ${version}`);
        fetchStatus();
      } else {
        setError(response.data.error || 'Rollback failed');
      }
    } catch (err) {
      console.error('Rollback error:', err);
      setError(err.response?.data?.error || 'Failed to rollback');
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const hasDraftChanges = status?.draftFileCount > 0;
  const hasDeployedFiles = status?.deployedFileCount > 0;

  return (
    <div className="space-y-4">
      {/* Status Cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* Draft Status */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-yellow-800">DRAFT</h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              hasDraftChanges ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-200 text-gray-600 dark:text-gray-400'
            }`}>
              {hasDraftChanges ? 'Modified' : 'Clean'}
            </span>
          </div>
          <p className="text-2xl font-bold text-yellow-900 mb-1">
            {status?.draftFileCount || 0}
          </p>
          <p className="text-xs text-yellow-700">Draft files</p>
        </div>

        {/* Deployed Status */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-blue-800">DEPLOYED</h3>
            <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs font-medium">
              v{status?.deployedVersion || 0}
            </span>
          </div>
          <p className="text-2xl font-bold text-blue-900 mb-1">
            {status?.deployedFileCount || 0}
          </p>
          <p className="text-xs text-blue-700">Deployed files</p>
        </div>

        {/* Live Status */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-green-800">LIVE</h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              status?.liveVersion ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600 dark:text-gray-400'
            }`}>
              {status?.liveVersion ? `v${status.liveVersion}` : 'Not synced'}
            </span>
          </div>
          <p className="text-2xl font-bold text-green-900 mb-1">
            {status?.liveVersion ? '✓' : '—'}
          </p>
          <p className="text-xs text-green-700">
            {status?.liveVersion ? 'Synced' : 'No sync yet'}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none p-6">
        <h3 className="text-lg font-semibold mb-4">Actions</h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Deploy Button */}
          <button
            onClick={handleDeploy}
            disabled={!hasDraftChanges || deploying}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              !hasDraftChanges || deploying
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-primary-600 dark:bg-primary-700 text-white hover:bg-primary-600 dark:bg-primary-700'
            }`}
          >
            {deploying ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Deploying...</span>
              </div>
            ) : (
              <div>
                <div className="font-semibold">Deploy</div>
                <div className="text-xs opacity-80">Draft → Deployed</div>
              </div>
            )}
          </button>

          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={!hasDeployedFiles || syncing}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              !hasDeployedFiles || syncing
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {syncing ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Syncing...</span>
              </div>
            ) : (
              <div>
                <div className="font-semibold">Sync to Controller</div>
                <div className="text-xs opacity-80">Deployed → Live</div>
              </div>
            )}
          </button>

          {/* Discard Button */}
          <button
            onClick={() => setShowDiscardConfirm(true)}
            disabled={!hasDraftChanges || discarding}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              !hasDraftChanges || discarding
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
            }`}
          >
            {discarding ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700"></div>
                <span>Discarding...</span>
              </div>
            ) : (
              <div>
                <div className="font-semibold">Discard Changes</div>
                <div className="text-xs opacity-80">Revert to deployed</div>
              </div>
            )}
          </button>

          {/* Version History Button */}
          <button
            onClick={() => setShowVersionHistory(!showVersionHistory)}
            className="px-6 py-3 rounded-lg font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 border border-gray-300 dark:border-gray-600 transition-colors"
          >
            <div>
              <div className="font-semibold">Version History</div>
              <div className="text-xs opacity-80">{versions.length} versions</div>
            </div>
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">⚠️ {error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Version History */}
      {showVersionHistory && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none p-6">
          <h3 className="text-lg font-semibold mb-4">Version History</h3>

          {versions.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No version history yet</p>
          ) : (
            <div className="space-y-2">
              {versions.map((v) => (
                <div
                  key={v.version}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <div className="font-medium">Version {v.version}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(v.created_at).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {v.file_count} files
                    </div>
                  </div>
                  <button
                    onClick={() => handleRollback(v.version)}
                    className="px-4 py-2 text-sm bg-primary-600 dark:bg-primary-700 text-white rounded hover:bg-primary-600 dark:bg-primary-700 transition-colors"
                  >
                    Rollback
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Discard Confirmation Modal */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Discard Draft Changes?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This will delete all draft files and revert to the deployed version. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDiscardConfirm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDiscard}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Diagram */}
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Workflow</h3>
        <div className="flex items-center justify-center gap-4 text-sm">
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 border-2 border-yellow-400 rounded-full flex items-center justify-center mb-2">
              <span className="text-2xl">✏️</span>
            </div>
            <div className="font-medium">DRAFT</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">AI modifies</div>
          </div>

          <div className="text-gray-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 border-2 border-blue-400 rounded-full flex items-center justify-center mb-2">
              <span className="text-2xl">📦</span>
            </div>
            <div className="font-medium">DEPLOYED</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Review & approve</div>
          </div>

          <div className="text-gray-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 border-2 border-green-400 rounded-full flex items-center justify-center mb-2">
              <span className="text-2xl">🚀</span>
            </div>
            <div className="font-medium">LIVE</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">On controller</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeploySyncControls;
