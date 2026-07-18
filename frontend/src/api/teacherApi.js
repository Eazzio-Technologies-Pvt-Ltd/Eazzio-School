import api from './axios';

export const getSummary = async () => {
  const response = await api.get('/teacher/dashboard-summary');
  return response.data;
};

export const getCourseDetails = async () => {
  const response = await api.get('/teacher/course-details');
  return response.data;
};

export const saveAttendance = async (payload) => {
  const response = await api.post('/teacher/attendance', payload);
  return response.data;
};

export const registerStudent = async (payload) => {
  const response = await api.post('/teacher/students', payload);
  return response.data;
};

export const getRoutine = async () => {
  const response = await api.get('/teacher/routine');
  return response.data;
};

export const getAttendanceHistory = async (date) => {
  const params = date ? { date } : {};
  const response = await api.get('/teacher/attendance-history', { params });
  return response.data;
};

export const getCourseFees = async () => {
  const response = await api.get('/teacher/course-fees');
  return response.data;
};
