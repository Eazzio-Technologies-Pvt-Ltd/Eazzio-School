import api from './axios';

export const getSummary = async () => {
  const response = await api.get('/teacher/dashboard-summary');
  return response.data;
};

export const getCourseDetails = async () => {
  const response = await api.get('/teacher/class-details');
  return response.data;
};

export const getAllMyClasses = async () => {
  const response = await api.get('/teacher/my-classes');
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

export const getAttendanceHistory = async (date, courseId) => {
  const params = {};
  if (date) params.date = date;
  if (courseId) params.courseId = courseId;
  const response = await api.get('/teacher/attendance-history', { params });
  return response.data;
};

export const getAssignments = async (courseId) => {
  const params = courseId ? { courseId } : {};
  const response = await api.get('/teacher/assignments', { params });
  return response.data;
};

export const createAssignment = async (payload) => {
  const response = await api.post('/teacher/assignments', payload);
  return response.data;
};

export const deleteAssignment = async (id) => {
  const response = await api.delete(`/teacher/assignments/${id}`);
  return response.data;
};
