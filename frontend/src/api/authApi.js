import api from './axios';

export const login = async (email, password, role) => {
  const response = await api.post('/auth/login', { email, password, role });
  return response.data;
};

export const createSubscriptionOrder = async (studentCount, billingCycle, planType) => {
  const response = await api.post('/auth/create-subscription-order', { studentCount, billingCycle, planType });
  return response.data;
};

export const registerSchool = async (payload) => {
  const response = await api.post('/auth/register-school', payload);
  return response.data;
};
