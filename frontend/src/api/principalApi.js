import api from './axios';

export const getSummary = async () => {
  const response = await api.get('/principal/dashboard-summary');
  return response.data;
};

export const getAIInsights = async () => {
  const response = await api.get('/principal/ai-insights');
  return response.data;
};

// --- Teachers ---
export const getTeachers = async () => {
  const response = await api.get('/principal/teachers');
  return response.data;
};

export const registerTeacher = async (payload) => {
  const response = await api.post('/principal/teachers', payload);
  return response.data;
};

// --- Classes ---
export const getClasses = async () => {
  const response = await api.get('/principal/classes');
  return response.data;
};

export const createClass = async (payload) => {
  const response = await api.post('/principal/classes', payload);
  return response.data;
};

export const assignClassTeacher = async (classId, teacherId) => {
  const response = await api.put(`/principal/classes/${classId}/assign-teacher`, { teacherId });
  return response.data;
};

// --- Students ---
export const getStudents = async () => {
  const response = await api.get('/principal/students');
  return response.data;
};

export const registerStudent = async (payload) => {
  const response = await api.post('/principal/students', payload);
  return response.data;
};

export const deleteStudent = async (id) => {
  const response = await api.delete(`/principal/students/${id}`);
  return response.data;
};

// --- Attendance & Fees ---
export const getAttendanceSummary = async () => {
  const response = await api.get('/principal/attendance-summary');
  return response.data;
};

export const getFeeCollection = async () => {
  const response = await api.get('/principal/fee-collection');
  return response.data;
};

// --- Fee Management ---
export const getFeeStructures = async () => {
  const response = await api.get('/principal/fees/structure');
  return response.data;
};

export const createFeeStructure = async (payload) => {
  const response = await api.post('/principal/fees/structure', payload);
  return response.data;
};

export const generateInvoices = async (payload) => {
  const response = await api.post('/principal/fees/generate-invoices', payload);
  return response.data;
};

export const getInvoices = async () => {
  const response = await api.get('/principal/fees/invoices');
  return response.data;
};

export const payInvoice = async (invoiceId, payload) => {
  const response = await api.post(`/principal/fees/invoices/${invoiceId}/pay`, payload);
  return response.data;
};

// --- Timetable ---
export const getTimetables = async (params = {}) => {
  const response = await api.get('/principal/timetables', { params });
  return response.data;
};

export const createTimetable = async (payload) => {
  const response = await api.post('/principal/timetables', payload);
  return response.data;
};

export const deleteTimetable = async (id) => {
  const response = await api.delete(`/principal/timetables/${id}`);
  return response.data;
};
