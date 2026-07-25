import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: { Authorization: `Bearer ${token}` }
  };
};

export const getFeedbacks = async () => {
  const res = await axios.get(`${API_URL}/feedback`, getAuthHeaders());
  return res.data;
};

export const createFeedback = async (data) => {
  const res = await axios.post(`${API_URL}/feedback`, data, getAuthHeaders());
  return res.data;
};
