import { useState, useEffect } from 'react';
import api from '../utils/api';

function SceneManagement({ controllerId }) {
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingScene, setEditingScene] = useState(null);
  const [executing, setExecuting] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchScenes();
  }, [controllerId]);

  const fetchScenes = async () => {
    try {
      const response = await api.get(`/api/controllers/${controllerId}/scenes`);
      if (response.data.success) {
        setScenes(response.data.scenes || []);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch scenes:', err);
      setError('Failed to load scenes');
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingScene({
      name: '',
      description: '',
      steps: []
    });
    setShowEditor(true);
  };

  const handleEdit = (scene) => {
    setEditingScene({ ...scene });
    setShowEditor(true);
  };

  const handleDelete = async (sceneId) => {
    if (!window.confirm('Delete this scene? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.delete(`/api/controllers/${controllerId}/scenes/${sceneId}`);
      if (response.data.success) {
        setSuccess('✅ Scene deleted successfully');
        fetchScenes();
      } else {
        setError(response.data.error || 'Failed to delete scene');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.response?.data?.error || 'Failed to delete scene');
    }
  };

  const handleSave = async (sceneData) => {
    try {
      let response;
      if (editingScene.id) {
        // Update existing scene
        response = await api.put(
          `/api/controllers/${controllerId}/scenes/${editingScene.id}`,
          sceneData
        );
      } else {
        // Create new scene
        response = await api.post(
          `/api/controllers/${controllerId}/scenes`,
          sceneData
        );
      }

      if (response.data.success) {
        setSuccess(`✅ Scene ${editingScene.id ? 'updated' : 'created'} successfully`);
        setShowEditor(false);
        setEditingScene(null);
        fetchScenes();
      } else {
        setError(response.data.error || 'Failed to save scene');
      }
    } catch (err) {
      console.error('Save error:', err);
      setError(err.response?.data?.error || 'Failed to save scene');
    }
  };

  const handleExecute = async (sceneId, sceneName) => {
    if (!window.confirm(`Execute scene "${sceneName}"?`)) {
      return;
    }

    setExecuting(sceneId);
    setError('');
    setSuccess('');

    try {
      const response = await api.post(
        `/api/controllers/${controllerId}/scenes/${sceneId}/execute`
      );
      if (response.data.success) {
        setSuccess(`✅ Scene "${sceneName}" executed successfully`);
      } else {
        setError(response.data.error || 'Failed to execute scene');
      }
    } catch (err) {
      console.error('Execute error:', err);
      setError(err.response?.data?.error || 'Failed to execute scene');
    } finally {
      setExecuting(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Scenes</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Automation sequences for your AV equipment
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-primary-600 dark:bg-primary-700 text-white rounded-lg hover:bg-primary-600 dark:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Scene
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

      {/* Scene Grid */}
      {scenes.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none p-12 text-center">
          <div className="text-6xl mb-4">🎬</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No scenes yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create automation sequences to control multiple devices with a single action
          </p>
          <button
            onClick={handleCreate}
            className="px-6 py-3 bg-primary-600 dark:bg-primary-700 text-white rounded-lg hover:bg-primary-600 dark:bg-primary-700 transition-colors"
          >
            Create Your First Scene
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenes.map((scene) => (
            <div
              key={scene.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none hover:shadow-lg dark:shadow-none transition-shadow dark:shadow-none p-6 group"
            >
              {/* Scene Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    {scene.name}
                  </h3>
                  {scene.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">{scene.description}</p>
                  )}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(scene)}
                    className="text-blue-500 hover:text-blue-700"
                    title="Edit"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(scene.id)}
                    className="text-red-500 hover:text-red-700"
                    title="Delete"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Steps Summary */}
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                  STEPS ({scene.steps?.length || 0})
                </div>
                {scene.steps && scene.steps.length > 0 ? (
                  <div className="space-y-1">
                    {scene.steps.slice(0, 3).map((step, index) => (
                      <div key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                        <span className="text-gray-400 font-mono text-xs">{index + 1}.</span>
                        <span className="flex-1">
                          {step.action === 'set_control' ? (
                            <span>Set <span className="font-medium">{step.control_id}</span> to {step.value}</span>
                          ) : step.action === 'delay' ? (
                            <span>Wait {step.delay_ms}ms</span>
                          ) : (
                            <span>{step.action}</span>
                          )}
                        </span>
                      </div>
                    ))}
                    {scene.steps.length > 3 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 pl-5">
                        +{scene.steps.length - 3} more...
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">No steps defined</p>
                )}
              </div>

              {/* Execute Button */}
              <button
                onClick={() => handleExecute(scene.id, scene.name)}
                disabled={executing === scene.id || !scene.steps || scene.steps.length === 0}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                  executing === scene.id
                    ? 'bg-gray-200 text-gray-500 dark:text-gray-400 cursor-wait'
                    : !scene.steps || scene.steps.length === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {executing === scene.id ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                    <span>Executing...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Execute Scene</span>
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Scene Editor Modal */}
      {showEditor && editingScene && (
        <SceneEditor
          scene={editingScene}
          controllerId={controllerId}
          onSave={handleSave}
          onCancel={() => {
            setShowEditor(false);
            setEditingScene(null);
          }}
        />
      )}
    </div>
  );
}

// Scene Editor Component
function SceneEditor({ scene, controllerId, onSave, onCancel }) {
  const [name, setName] = useState(scene.name || '');
  const [description, setDescription] = useState(scene.description || '');
  const [steps, setSteps] = useState(scene.steps || []);
  const [devices, setDevices] = useState([]);
  const [controls, setControls] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await api.get(`/api/controllers/${controllerId}/devices`);
      if (response.data.success) {
        const deviceList = response.data.devices || [];
        setDevices(deviceList);

        // Fetch controls for each device
        const controlsMap = {};
        for (const device of deviceList) {
          const controlsRes = await api.get(`/api/devices/${device.id}/controls`);
          if (controlsRes.data.success) {
            controlsMap[device.id] = controlsRes.data.controls || [];
          }
        }
        setControls(controlsMap);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch devices:', err);
      setLoading(false);
    }
  };

  const addStep = () => {
    setSteps([...steps, {
      action: 'set_control',
      control_id: '',
      value: '',
      delay_ms: 0
    }]);
  };

  const removeStep = (index) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index, field, value) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  const moveStep = (index, direction) => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === steps.length - 1)
    ) {
      return;
    }

    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    setSteps(newSteps);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      alert('Please enter a scene name');
      return;
    }

    if (steps.length === 0) {
      alert('Please add at least one step');
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim(),
      steps: steps.map((step, index) => ({
        ...step,
        order: index + 1
      }))
    });
  };

  // Get all available controls for dropdown
  const getAllControls = () => {
    const allControls = [];
    devices.forEach(device => {
      const deviceControls = controls[device.id] || [];
      deviceControls.forEach(control => {
        allControls.push({
          id: control.logical_name,
          label: `${device.name} - ${control.logical_name}`,
          device: device.name
        });
      });
    });
    return allControls;
  };

  const availableControls = getAllControls();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
          <h2 className="text-2xl font-bold">
            {scene.id ? 'Edit Scene' : 'Create New Scene'}
          </h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Scene Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Presentation Mode"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Lower projector, turn on displays, set audio to presentation level"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Steps */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Steps ({steps.length})
              </label>
              <button
                onClick={addStep}
                className="px-3 py-1 text-sm bg-primary-600 dark:bg-primary-700 text-white rounded hover:bg-primary-600 dark:bg-primary-700"
              >
                + Add Step
              </button>
            </div>

            {steps.length === 0 ? (
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">No steps yet. Add your first step to begin.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div key={index} className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start gap-3">
                      {/* Step Number & Move Buttons */}
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm font-bold text-gray-600 dark:text-gray-400 w-6 h-6 flex items-center justify-center bg-white dark:bg-gray-800 rounded">
                          {index + 1}
                        </span>
                        <button
                          onClick={() => moveStep(index, 'up')}
                          disabled={index === 0}
                          className="text-gray-400 hover:text-gray-600 dark:text-gray-400 disabled:opacity-30"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => moveStep(index, 'down')}
                          disabled={index === steps.length - 1}
                          className="text-gray-400 hover:text-gray-600 dark:text-gray-400 disabled:opacity-30"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>

                      {/* Step Configuration */}
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Control
                          </label>
                          <select
                            value={step.control_id}
                            onChange={(e) => updateStep(index, 'control_id', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Select control...</option>
                            {availableControls.map((control) => (
                              <option key={control.id} value={control.id}>
                                {control.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Value
                          </label>
                          <input
                            type="text"
                            value={step.value}
                            onChange={(e) => updateStep(index, 'value', e.target.value)}
                            placeholder="e.g., 75 or on"
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Delay After (ms)
                          </label>
                          <input
                            type="number"
                            value={step.delay_ms || 0}
                            onChange={(e) => updateStep(index, 'delay_ms', parseInt(e.target.value) || 0)}
                            min="0"
                            step="100"
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => removeStep(index)}
                        className="text-red-500 hover:text-red-700 mt-6"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-primary-600 dark:bg-primary-700 text-white rounded-lg hover:bg-primary-600 dark:bg-primary-700"
          >
            {scene.id ? 'Update Scene' : 'Create Scene'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SceneManagement;
