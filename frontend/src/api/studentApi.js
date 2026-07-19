import api from './axios';

export const getDashboardSummary = async () => {
  const response = await api.get('/student/dashboard-summary');
  return response.data;
};

export const getProfile = async () => {
  const response = await api.get('/student/profile');
  return response.data;
};

export const updateProfile = async (payload) => {
  const response = await api.put('/student/profile', payload);
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

export const changePassword = async (currentPassword, newPassword) => {
  const response = await api.put('/student/change-password', { currentPassword, newPassword });
  return response.data;
};

export const createOrder = async (invoiceId) => {
  const response = await api.post('/student/fees/create-order', { invoiceId });
  return response.data;
};

export const verifyPayment = async (payload) => {
  const response = await api.post('/student/fees/verify-payment', payload);
  return response.data;
};

export const getReceipt = async (paymentId) => {
  const response = await api.get(`/student/fees/receipt/${paymentId}`);
  return response.data;
};

export const getResults = async () => {
  const response = await api.get('/student/results');
  return response.data;
};
