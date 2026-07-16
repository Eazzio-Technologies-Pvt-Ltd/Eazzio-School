import api from './axios';

export const getDashboardSummary = async () => {
  const response = await api.get('/student/dashboard-summary');
  return response.data;
};

export const getProfile = async () => {
  const response = await api.get('/student/profile');
  return response.data;
};

export const getAttendance = async () => {
  const response = await api.get('/student/attendance');
  return response.data;
};

export const getFees = async () => {
  const response = await api.get('/student/fees');
  return response.data;
};

export const getNotices = async () => {
  const response = await api.get('/student/notices');
  return response.data;
};

export const getRoutine = async () => {
  const response = await api.get('/student/routine');
  return response.data;
};
