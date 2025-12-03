import axios from "axios";
import { API_BASE_URL } from "./config";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 seconds
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - add auth token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle token refresh on 401
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If 401 and haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem("refreshToken");
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;
          await AsyncStorage.setItem("accessToken", accessToken);
          await AsyncStorage.setItem("refreshToken", newRefreshToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens
        await AsyncStorage.multiRemove(["accessToken", "refreshToken", "user"]);
        return Promise.reject(refreshError);
      }
    }

    // Handle common errors
    if (error.response) {
      // Server responded with error status
      console.error("API Error:", error.response.data);
    } else if (error.request) {
      // Request made but no response received
      console.error("Network Error:", error.request);
    } else {
      // Something else happened
      console.error("Error:", error.message);
    }
    return Promise.reject(error);
  }
);

// API functions
export const apiService = {
  // Auth endpoints
  register: async (
    username,
    password,
    email,
    phone,
    preferred_contact_method
  ) => {
    const response = await api.post("/api/users", {
      username,
      password,
      email,
      phone,
      preferred_contact_method,
    });
    return response.data;
  },

  login: async (email, password) => {
    const response = await api.post("/login", {
      email,
      password,
    });
    return response.data;
  },

  logout: async (refreshToken) => {
    try {
      const response = await api.post("/logout", { refreshToken });
      return response.data;
    } catch (error) {
      // Even if logout fails on server, we'll clear local storage
      return { success: true };
    }
  },

  refreshToken: async (refreshToken) => {
    const response = await api.post("/refresh", { refreshToken });
    return response.data;
  },

  // Test endpoint
  testConnection: async () => {
    const response = await api.get("/");
    return response.data;
  },

  // User endpoints
  getCurrentUser: async () => {
    // Token is automatically sent via Authorization header by axios interceptor
    const response = await api.get("/api/users/me");
    return response.data;
  },

  getUser: async (userId) => {
    const response = await api.get(`/api/users/${userId}`);
    return response.data;
  },

  updateUser: async (userId, userData) => {
    const response = await api.patch(`/api/users/${userId}`, userData);
    return response.data;
  },

  // Habit Template endpoints
  getTemplates: async () => {
    const response = await api.get("/api/habit-templates");
    return response.data;
  },

  getTemplate: async (templateId) => {
    const response = await api.get(`/api/habit-templates/${templateId}`);
    return response.data;
  },

  // Category endpoints
  getCategories: async () => {
    console.log("getCategories called, making request to /api/categories/me");
    // Get user-specific categories (global + user's custom)
    const response = await api.get("/api/categories/me");
    console.log("getCategories response:", response.data);
    return response.data;
  },

  createCategory: async (name, userId) => {
    const response = await api.post("/api/categories", {
      name,
      user_id: userId,
    });
    return response.data;
  },

  // Habit endpoints
  getUserHabits: async (userId) => {
    const response = await api.get(`/api/users/${userId}/habits`);
    return response.data;
  },

  createHabit: async (userId, habitData) => {
    const response = await api.post(`/api/users/${userId}/habits`, habitData);
    return response.data;
  },

  updateHabit: async (habitId, habitData) => {
    const response = await api.patch(`/api/user-habits/${habitId}`, habitData);
    return response.data;
  },

  archiveHabit: async (habitId) => {
    const response = await api.patch(`/api/user-habits/${habitId}/archive`);
    return response.data;
  },

  // Habit Log endpoints
  getHabitLogs: async (habitId) => {
    const response = await api.get(`/api/user-habits/${habitId}/logs`);
    return response.data;
  },

  getTodayHabitLogs: async (habitId, date = null) => {
    const url = date
      ? `/api/user-habits/${habitId}/logs/today?date=${date}`
      : `/api/user-habits/${habitId}/logs/today`;
    const response = await api.get(url);
    return response.data;
  },

  createHabitLog: async (habitId, logData) => {
    const response = await api.post(
      `/api/user-habits/${habitId}/logs`,
      logData
    );
    return response.data;
  },

  updateHabitLog: async (logId, logData) => {
    const response = await api.patch(`/api/habit-logs/${logId}`, logData);
    return response.data;
  },

  deleteHabitLog: async (logId) => {
    const response = await api.delete(`/api/habit-logs/${logId}`);
    return response.data;
  },

  getUserLogsForDateRange: async (userId, startDate, endDate) => {
    const response = await api.get(
      `/api/users/${userId}/logs/range?start_date=${startDate}&end_date=${endDate}`
    );
    return response.data;
  },
};

export default api;
