import { api } from "./api";

export const userService = {
  getProfile: async () => {
    const response = await api.get("/users/profile");
    return response.data;
  },

  updateProfile: async (data: any) => {
    const response = await api.patch("/users/profile", data);
    return response.data;
  },

  getSettings: async () => {
    const response = await api.get("/users/settings");
    return response.data;
  },

  updateSettings: async (settings: any) => {
    const response = await api.patch("/users/settings", settings);
    return response.data;
  },
};
