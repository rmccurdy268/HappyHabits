import axios from 'axios';
import { API_BASE_URL } from './config';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor (optional - for adding auth tokens, etc.)
api.interceptors.request.use(
  (config) => {
    // You can add auth tokens here if needed
    // const token = getAuthToken();
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor (optional - for handling errors globally)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors here
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', error.response.data);
    } else if (error.request) {
      // Request made but no response received
      console.error('Network Error:', error.request);
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// API functions
export const apiService = {
  // Test endpoint
  testConnection: async () => {
    const response = await api.get('/');
    return response.data;
  },

  // Get data from /api/data endpoint
  getData: async () => {
    const response = await api.get('/api/data');
    return response.data;
  },

  // Example POST request
  // postData: async (data) => {
  //   const response = await api.post('/api/data', data);
  //   return response.data;
  // },

  // Example PUT request
  // updateData: async (id, data) => {
  //   const response = await api.put(`/api/data/${id}`, data);
  //   return response.data;
  // },

  // Example DELETE request
  // deleteData: async (id) => {
  //   const response = await api.delete(`/api/data/${id}`);
  //   return response.data;
  // },
};

export default api;


