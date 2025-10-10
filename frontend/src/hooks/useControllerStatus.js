import { useEffect, useState, useCallback } from 'react';
import { projectsAPI } from '../utils/api';

/**
 * Hook to poll controller status and keep it updated
 * Since we don't have direct WebSocket connection from frontend to backend for status updates,
 * we'll use polling as a simple solution
 */
export const useControllerStatus = (projectId, pollInterval = 10000) => {
  const [controllers, setControllers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchControllers = useCallback(async () => {
    if (!projectId) return;

    try {
      const response = await projectsAPI.getControllers(projectId);
      setControllers(response.data.controllers);
    } catch (error) {
      console.error('Failed to fetch controller status:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Initial fetch
  useEffect(() => {
    fetchControllers();
  }, [fetchControllers]);

  // Set up polling
  useEffect(() => {
    if (!projectId) return;

    const intervalId = setInterval(() => {
      fetchControllers();
    }, pollInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [projectId, pollInterval, fetchControllers]);

  return { controllers, loading, refresh: fetchControllers };
};

/**
 * Hook to monitor a single controller's status
 */
export const useSingleControllerStatus = (controllerId, pollInterval = 10000) => {
  const [controller, setController] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchController = useCallback(async () => {
    if (!controllerId) return;

    try {
      const { controllersAPI } = await import('../utils/api');
      const response = await controllersAPI.getOne(controllerId);
      setController(response.data.controller);
    } catch (error) {
      console.error('Failed to fetch controller status:', error);
    } finally {
      setLoading(false);
    }
  }, [controllerId]);

  // Initial fetch
  useEffect(() => {
    fetchController();
  }, [fetchController]);

  // Set up polling
  useEffect(() => {
    if (!controllerId) return;

    const intervalId = setInterval(() => {
      fetchController();
    }, pollInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [controllerId, pollInterval, fetchController]);

  return { controller, loading, refresh: fetchController };
};
