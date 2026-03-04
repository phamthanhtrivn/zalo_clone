import { apiClient } from "./apiClient";

export const userService = {
  getProfile: async () => {
    const response = await apiClient.get("/users/profile");
    return response.data;
  },

  updateProfile: async (data: any) => {
    const response = await apiClient.patch("/users/profile", data);
    return response.data;
  },

  getSettings: async () => {
    const response = await apiClient.get("/users/settings");
    return response.data;
  },

  updateSettings: async (settings: any) => {
    const response = await apiClient.patch("/users/settings", settings);
    return response.data;
  },
};
