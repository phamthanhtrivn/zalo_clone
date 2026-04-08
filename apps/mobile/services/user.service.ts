import { api } from "./api";

<<<<<<< HEAD
export const userService = {
  getProfile: async () => {
    const response = await api.get("/users/profile");
=======



export const userService = {
  getProfile: async () => {
    const response = await api.get(`/users/user-information`);
>>>>>>> origin/main
    return response.data;
  },

  updateProfile: async (data: any) => {
<<<<<<< HEAD
    const response = await api.patch("/users/profile", data);
=======
    const response = await api.patch(
      `/users/update-information-user`,
      data,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
>>>>>>> origin/main
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
