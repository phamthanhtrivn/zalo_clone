import { api } from "./api";




export const userService = {
  getProfile: async (userId : string) => {
    const response = await api.get(`/users/user-information/${userId}`);
    return response.data;
  },

  updateProfile: async (data: any, userId : string) => {
    const response = await api.patch(
      `/users/update-information-user/${userId}`,
      data,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
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
