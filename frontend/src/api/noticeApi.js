import api from './axios';

export const getNotices = async (params) => {
  const response = await api.get('/notices', { params });
  return response.data;
};

export const createNotice = async (formData) => {
  const response = await api.post('/notices', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const updateNotice = async (id, formData) => {
  const response = await api.put(`/notices/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const deleteNotice = async (id) => {
  const response = await api.delete(`/notices/${id}`);
  return response.data;
};
