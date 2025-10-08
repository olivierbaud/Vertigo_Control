import axios from 'axios';

// API base URL - will be configured via environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create axios instance with default config
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
};

// Projects API
export const projectsAPI = {
  getAll: () => api.get('/projects'),
  getOne: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  getControllers: (id) => api.get(`/projects/${id}/controllers`),
  createController: (id, data) => api.post(`/projects/${id}/controllers`, data),
};

// Controllers API
export const controllersAPI = {
  getOne: (id) => api.get(`/controllers/${id}`),
  update: (id, data) => api.put(`/controllers/${id}`, data),
  delete: (id) => api.delete(`/controllers/${id}`),
  getDevices: (id) => api.get(`/controllers/${id}/devices`),
  createDevice: (id, data) => api.post(`/controllers/${id}/devices`, data),
  getScenes: (id) => api.get(`/controllers/${id}/scenes`),
  createScene: (id, data) => api.post(`/controllers/${id}/scenes`, data),
};

// Devices API
export const devicesAPI = {
  getOne: (id) => api.get(`/devices/${id}`),
  update: (id, data) => api.put(`/devices/${id}`, data),
  delete: (id) => api.delete(`/devices/${id}`),
  getControls: (id) => api.get(`/devices/${id}/controls`),
  createControl: (id, data) => api.post(`/devices/${id}/controls`, data),
};

// Device Controls API
export const deviceControlsAPI = {
  getOne: (id) => api.get(`/device-controls/${id}`),
  update: (id, data) => api.put(`/device-controls/${id}`, data),
  delete: (id) => api.delete(`/device-controls/${id}`),
};

// Scenes API
export const scenesAPI = {
  getOne: (id) => api.get(`/scenes/${id}`),
  update: (id, data) => api.put(`/scenes/${id}`, data),
  delete: (id) => api.delete(`/scenes/${id}`),
  execute: (id) => api.post(`/scenes/${id}/execute`),
};

// GUI API (NEW)
export const guiAPI = {
  getStatus: (controllerId) => api.get(`/controllers/${controllerId}/gui/status`),
  getDraftFiles: (controllerId) => api.get(`/controllers/${controllerId}/gui/files/draft`),
  deploy: (controllerId, commitMessage) => 
    api.post(`/controllers/${controllerId}/gui/deploy`, { commit_message: commitMessage }),
  sync: (controllerId) => api.post(`/controllers/${controllerId}/gui/sync`),
  getSyncStatus: (controllerId, syncId) => 
    api.get(`/controllers/${controllerId}/gui/sync/${syncId}`),
  getSyncHistory: (controllerId) => api.get(`/controllers/${controllerId}/gui/sync/history`),
  discard: (controllerId) => api.post(`/controllers/${controllerId}/gui/discard`),
  rollback: (controllerId, targetVersion) => 
    api.post(`/controllers/${controllerId}/gui/rollback`, { target_version: targetVersion }),
};

// AI API (NEW)
export const aiAPI = {
  chat: async (controllerId, message, provider, onChunk) => {
    const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ controller_id: controllerId, message, provider }),
    });

    if (!response.ok) {
      throw new Error('AI request failed');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          onChunk(data);
        } catch {
          console.error('Failed to parse chunk:', line);
        }
      }
    }
  },
  getProviders: () => api.get('/ai/providers'),
  saveApiKey: (provider, apiKey) => api.post('/ai/keys', { provider, api_key: apiKey }),
  getUsage: () => api.get('/ai/usage'),
  validate: (guiFiles, controllerId) => 
    api.post('/ai/validate', { gui_files: guiFiles, controller_id: controllerId }),
};

// Images API
export const imagesAPI = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export default api;
