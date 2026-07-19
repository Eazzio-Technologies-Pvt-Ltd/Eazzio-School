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

export const bulkImportUpdateTeachers = async (payload) => {
  const response = await api.post('/principal/teachers/bulk-import-update', payload);
  return response.data;
};

export const deleteTeacher = async (id) => {
  const response = await api.delete(`/principal/teachers/${id}`);
  return response.data;
};

export const updateTeacher = async (id, payload) => {
  const response = await api.put(`/principal/teachers/${id}`, payload);
  return response.data;
};

export const getTeacherDetails = async (id) => {
  const response = await api.get(`/principal/teachers/${id}`);
  return response.data;
};

// --- Courses ---
export const getCourses = async () => {
  const response = await api.get('/principal/courses');
  return response.data;
};

export const createCourse = async (payload) => {
  const response = await api.post('/principal/courses', payload);
  return response.data;
};

export const updateCourse = async (id, payload) => {
  const response = await api.put(`/principal/courses/${id}`, payload);
  return response.data;
};

export const deleteCourse = async (id) => {
  const response = await api.delete(`/principal/courses/${id}`);
  return response.data;
};

export const getCourseDetails = async (id) => {
  const response = await api.get(`/principal/courses/${id}`);
  return response.data;
};

export const assignCourseTeacher = async (courseId, teacherId) => {
  const response = await api.put(`/principal/courses/${courseId}/assign-teacher`, { teacherId });
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

export const updateStudent = async (id, payload) => {
  const response = await api.put(`/principal/students/${id}`, payload);
  return response.data;
};

export const getStudentDetails = async (id) => {
  const response = await api.get(`/principal/students/${id}`);
  return response.data;
};

export const bulkImportUpdateStudents = async (payload) => {
  const response = await api.post('/principal/students/bulk-import-update', payload);
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

export const getAttendanceDetail = async (courseId, date) => {
  const response = await api.get('/principal/attendance-detail', {
    params: { courseId, date }
  });
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

export const getInvoices = async () => {
  const response = await api.get('/principal/fees/invoices');
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

export const autoGenerateTimetable = async (payload) => {
  const response = await api.post('/principal/timetables/auto-generate', payload);
  return response.data;
};

export const deleteTimetable = async (id) => {
  const response = await api.delete(`/principal/timetables/${id}`);
  return response.data;
};

// --- Settings ---
export const getPrincipalSettings = async () => {
  const response = await api.get('/principal/settings');
  return response.data;
};

export const updatePrincipalProfile = async (payload) => {
  const response = await api.put('/principal/settings/profile', payload);
  return response.data;
};

export const updatePrincipalPassword = async (payload) => {
  const response = await api.put('/principal/settings/password', payload);
  return response.data;
};
