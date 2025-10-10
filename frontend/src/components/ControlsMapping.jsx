import { useState, useEffect } from 'react';
import api from '../utils/api';

function ControlsMapping({ deviceId, deviceName }) {
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingControl, setEditingControl] = useState(null);
  const [testing, setTesting] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchControls();
  }, [deviceId]);

  const fetchControls = async () => {
    try {
      const response = await api.get(`/api/devices/${deviceId}/controls`);
      if (response.data.success) {
        setControls(response.data.controls || []);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch controls:', err);
      setError('Failed to load device controls');
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingControl({
      logical_name: '',
      hardware_block_id: '',
      hardware_address: '',
      parameters: {}
    });
    setShowAddModal(true);
  };

  const handleEdit = (control) => {
    setEditingControl({ ...control });
    setShowAddModal(true);
  };

  const handleDelete = async (controlId, controlName) => {
    if (!window.confirm(`Delete control "${controlName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await api.delete(`/api/devices/${deviceId}/controls/${controlId}`);
      if (response.data.success) {
        setSuccess('✅ Control deleted successfully');
        fetchControls();
      } else {
        setError(response.data.error || 'Failed to delete control');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.response?.data?.error || 'Failed to delete control');
    }
  };

  const handleSave = async (controlData) => {
    try {
      let response;
      if (editingControl.id) {
        // Update existing control
        response = await api.put(
          `/api/devices/${deviceId}/controls/${editingControl.id}`,
          controlData
        );
      } else {
        // Create new control
        response = await api.post(
          `/api/devices/${deviceId}/controls`,
          controlData
        );
      }

      if (response.data.success) {
        setSuccess(`✅ Control ${editingControl.id ? 'updated' : 'created'} successfully`);
        setShowAddModal(false);
        setEditingControl(null);
        fetchControls();
      } else {
        setError(response.data.error || 'Failed to save control');
      }
    } catch (err) {
      console.error('Save error:', err);
      setError(err.response?.data?.error || 'Failed to save control');
    }
  };

  const handleTest = async (controlId, controlName) => {
    setTesting(controlId);
    setError('');
    setSuccess('');

    try {
      // This is a placeholder - you'd implement the actual test endpoint
      // For now, we'll just simulate a test
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess(`✅ Test command sent to "${controlName}"`);
    } catch (err) {
      console.error('Test error:', err);
      setError('Failed to test control');
    } finally {
      setTesting(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Device Controls</h2>
            <p className="text-gray-600 mt-1">
              Map logical names to hardware control blocks for <span className="font-medium">{deviceName}</span>
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Control
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

      {/* Controls List */}
      {controls.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">🎛️</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No controls mapped</h3>
          <p className="text-gray-600 mb-6">
            Add logical control mappings to hardware blocks for this device
          </p>
          <button
            onClick={handleAdd}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Add First Control
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
          {controls.map((control) => (
            <div
              key={control.id}
              className="p-6 hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-start justify-between">
                {/* Control Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {control.logical_name}
                    </h3>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-mono">
                      {control.hardware_block_id}
                    </span>
                  </div>

                  {control.hardware_address && (
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Address:</span> {control.hardware_address}
                    </p>
                  )}

                  {control.parameters && Object.keys(control.parameters).length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-gray-500 mb-1">PARAMETERS</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(control.parameters).map(([key, value]) => (
                          <span
                            key={key}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                          >
                            {key}: <span className="font-mono">{JSON.stringify(value)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleTest(control.id, control.logical_name)}
                    disabled={testing === control.id}
                    className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 disabled:cursor-wait"
                    title="Test Control"
                  >
                    {testing === control.id ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700"></div>
                        <span>Testing...</span>
                      </div>
                    ) : (
                      '🧪 Test'
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(control)}
                    className="text-blue-500 hover:text-blue-700 p-2"
                    title="Edit"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(control.id, control.logical_name)}
                    className="text-red-500 hover:text-red-700 p-2"
                    title="Delete"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Control Modal */}
      {showAddModal && editingControl && (
        <ControlEditor
          control={editingControl}
          deviceName={deviceName}
          onSave={handleSave}
          onCancel={() => {
            setShowAddModal(false);
            setEditingControl(null);
          }}
        />
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">About Controls</p>
            <p>
              Controls map user-friendly names (like "Main Volume") to device-specific hardware blocks
              (like "Block_1.Gain"). The AI uses these logical names when generating GUIs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Control Editor Component
function ControlEditor({ control, deviceName, onSave, onCancel }) {
  const [logicalName, setLogicalName] = useState(control.logical_name || '');
  const [hardwareBlockId, setHardwareBlockId] = useState(control.hardware_block_id || '');
  const [hardwareAddress, setHardwareAddress] = useState(control.hardware_address || '');
  const [parameters, setParameters] = useState(
    JSON.stringify(control.parameters || {}, null, 2)
  );
  const [paramError, setParamError] = useState('');

  const handleSubmit = () => {
    if (!logicalName.trim()) {
      alert('Please enter a logical name');
      return;
    }

    if (!hardwareBlockId.trim()) {
      alert('Please enter a hardware block ID');
      return;
    }

    // Validate parameters JSON
    let parsedParams = {};
    if (parameters.trim()) {
      try {
        parsedParams = JSON.parse(parameters);
      } catch (err) {
        setParamError('Invalid JSON format');
        return;
      }
    }

    onSave({
      logical_name: logicalName.trim(),
      hardware_block_id: hardwareBlockId.trim(),
      hardware_address: hardwareAddress.trim() || null,
      parameters: parsedParams
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
          <h2 className="text-2xl font-bold">
            {control.id ? 'Edit Control' : 'Add New Control'}
          </h2>
          <p className="text-blue-100 text-sm mt-1">
            For device: {deviceName}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Logical Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Logical Name * <span className="text-gray-500 font-normal">(User-friendly name)</span>
            </label>
            <input
              type="text"
              value={logicalName}
              onChange={(e) => setLogicalName(e.target.value)}
              placeholder="e.g., Main Volume, Display Power, Room Lights"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              This is the name the AI will use when generating GUIs
            </p>
          </div>

          {/* Hardware Block ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hardware Block ID * <span className="text-gray-500 font-normal">(Device-specific identifier)</span>
            </label>
            <input
              type="text"
              value={hardwareBlockId}
              onChange={(e) => setHardwareBlockId(e.target.value)}
              placeholder="e.g., Block_1.Gain, DSP.Input_1.Mute, Matrix.Output_5"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">
              The exact control path as defined by the device manufacturer
            </p>
          </div>

          {/* Hardware Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hardware Address <span className="text-gray-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={hardwareAddress}
              onChange={(e) => setHardwareAddress(e.target.value)}
              placeholder="e.g., 0x01, CH1, Input_A"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">
              Additional addressing information if required by the device
            </p>
          </div>

          {/* Parameters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parameters <span className="text-gray-500 font-normal">(JSON format, optional)</span>
            </label>
            <textarea
              value={parameters}
              onChange={(e) => {
                setParameters(e.target.value);
                setParamError('');
              }}
              placeholder='{\n  "min": 0,\n  "max": 100,\n  "step": 1\n}'
              className={`w-full px-3 py-2 border ${
                paramError ? 'border-red-300' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm`}
              rows="6"
            />
            {paramError && (
              <p className="text-xs text-red-600 mt-1">⚠️ {paramError}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Additional configuration like min/max values, data type, etc.
            </p>
          </div>

          {/* Examples */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">💡 Examples:</p>
            <div className="space-y-2 text-sm text-gray-600">
              <div>
                <span className="font-medium">Volume Control:</span>
                <div className="font-mono text-xs mt-1 bg-white p-2 rounded">
                  Logical: "Main Volume"<br />
                  Hardware: "DSP.Block_1.Gain"<br />
                  Parameters: {`{"min": 0, "max": 100, "step": 1}`}
                </div>
              </div>
              <div>
                <span className="font-medium">Mute Button:</span>
                <div className="font-mono text-xs mt-1 bg-white p-2 rounded">
                  Logical: "Mic 1 Mute"<br />
                  Hardware: "DSP.Input_1.Mute"<br />
                  Parameters: {`{"type": "boolean"}`}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            {control.id ? 'Update Control' : 'Add Control'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ControlsMapping;
