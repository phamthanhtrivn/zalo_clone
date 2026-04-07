import { apiClient } from "./apiClient";

export const userService = {
  getProfile: async () => {
    const response = await apiClient.get("/api/users/profile");
    return response.data;
  },

  updateProfile: async (data: any) => {
    const response = await apiClient.patch("/api/users/profile", data);
    return response.data;
  },

  getSettings: async () => {
    const response = await apiClient.get("/api/users/settings");
    return response.data;
  },

  updateSettings: async (settings: any) => {
    const response = await apiClient.patch("/api/users/settings", settings);
    return response.data;
  },
};
