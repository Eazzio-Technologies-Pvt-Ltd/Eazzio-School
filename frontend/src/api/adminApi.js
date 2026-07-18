import api from './axios';

export const getSummary = async () => {
  const response = await api.get('/admin/dashboard-summary');
  return response.data;
};

export const getAIInsights = async () => {
  const response = await api.get('/admin/ai-insights');
  return response.data;
};

// --- Teachers ---
export const getTeachers = async () => {
  const response = await api.get('/admin/teachers');
  return response.data;
};

export const registerTeacher = async (payload) => {
  const response = await api.post('/admin/teachers', payload);
  return response.data;
};

// --- Courses ---
export const getCourses = async () => {
  const response = await api.get('/admin/courses');
  return response.data;
};

export const createCourse = async (payload) => {
  const response = await api.post('/admin/courses', payload);
  return response.data;
};

export const assignCourseTeacher = async (courseId, teacherId) => {
  const response = await api.put(`/principal/courses/${courseId}/assign-teacher`, { teacherId });
  return response.data;
};

// --- Students ---
export const getStudents = async () => {
  const response = await api.get('/admin/students');
  return response.data;
};

export const registerStudent = async (payload) => {
  const response = await api.post('/admin/students', payload);
  return response.data;
};

export const deleteStudent = async (id) => {
  const response = await api.delete(`/principal/students/${id}`);
  return response.data;
};

// --- Attendance & Fees ---
export const getAttendanceSummary = async () => {
  const response = await api.get('/admin/attendance-summary');
  return response.data;
};

export const getFeeCollection = async () => {
  const response = await api.get('/admin/fee-collection');
  return response.data;
};

// --- Fee Management ---
export const getFeeStructures = async () => {
  const response = await api.get('/admin/fees/structure');
  return response.data;
};

export const createFeeStructure = async (payload) => {
  const response = await api.post('/admin/fees/structure', payload);
  return response.data;
};

export const generateInvoices = async (payload) => {
  const response = await api.post('/admin/fees/generate-invoices', payload);
  return response.data;
};

export const getInvoices = async () => {
  const response = await api.get('/admin/fees/invoices');
  return response.data;
};

export const payInvoice = async (invoiceId, payload) => {
  const response = await api.post(`/principal/fees/invoices/${invoiceId}/pay`, payload);
  return response.data;
};

// --- Timetable ---
export const getTimetables = async (params = {}) => {
  const response = await api.get('/admin/timetables', { params });
  return response.data;
};

export const createTimetable = async (payload) => {
  const response = await api.post('/admin/timetables', payload);
  return response.data;
};

export const deleteTimetable = async (id) => {
  const response = await api.delete(`/principal/timetables/${id}`);
  return response.data;
};
