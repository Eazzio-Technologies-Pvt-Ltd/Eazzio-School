import api from './axios';

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const createSubscriptionOrder = async (studentCount) => {
  const response = await api.post('/auth/create-subscription-order', { studentCount });
  return response.data;
};

export const registerSchool = async (payload) => {
  const response = await api.post('/auth/register-school', payload);
  return response.data;
};
