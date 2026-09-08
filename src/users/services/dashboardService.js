import userApi from './api';
import { unwrapData } from './unwrap';

// These views answer with Django's ApiResponse envelope; `userApi` (authAxios)
// has already stripped the HTTP layer, so exactly one unwrap remains.
export const getUserDashboard = async () => {
  const response = await userApi.get('/api/v1/user/dashboard');
  return unwrapData(response);
};

export const getUserSessions = async () => {
  const response = await userApi.get('/api/v1/user/sessions');
  return unwrapData(response) || [];
};

export const getUserSimulations = async (query = {}) => {
  const response = await userApi.get('/api/v1/user/simulations', {
    params: query,
  });

  return unwrapData(response);
};

export const getUserSimulationById = async (assessmentId) => {
  const response = await userApi.get(`/api/v1/user/simulations/${assessmentId}`);
  return unwrapData(response);
};

export const getPublicAssessmentTasks = async (assessmentId) => {
  const response = await userApi.get(`/api/v1/public/assessments/${assessmentId}/tasks`);
  return unwrapData(response) || [];
};

export const startUserSimulation = async (assessmentId, taskId) => {
  const response = await userApi.post(
    `/api/v1/public/assessments/${assessmentId}/tasks/${taskId}/start`,
  );
  return unwrapData(response);
};

export const launchUserSimulation = async (assessmentId) => {
  const tasks = await getPublicAssessmentTasks(assessmentId);
  const firstTask = tasks[0];
  const taskId = firstTask?.id || firstTask?.task_id;

  if (!taskId) {
    throw new Error('No tasks available for this simulation.');
  }

  return startUserSimulation(assessmentId, taskId);
};
