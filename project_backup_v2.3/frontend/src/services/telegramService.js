import api from './api.js';

export const telegramService = {
  // Bots
  getBots: async () => {
    const response = await api.get('/telegram/bots');
    return response.data;
  },

  createBot: async (data) => {
    const response = await api.post('/telegram/bots', data);
    return response.data;
  },

  updateBot: async (id, data) => {
    const response = await api.put(`/telegram/bots/${id}`, data);
    return response.data;
  },

  deleteBot: async (id) => {
    const response = await api.delete(`/telegram/bots/${id}`);
    return response.data;
  },

  // Recipients
  getRecipients: async () => {
    const response = await api.get('/telegram/recipients');
    return response.data;
  },

  createRecipient: async (data) => {
    const response = await api.post('/telegram/recipients', data);
    return response.data;
  },

  updateRecipient: async (id, data) => {
    const response = await api.put(`/telegram/recipients/${id}`, data);
    return response.data;
  },

  deleteRecipient: async (id) => {
    const response = await api.delete(`/telegram/recipients/${id}`);
    return response.data;
  }
};
