import { api } from "./api";

export const userService = {
  getProfile: async () => {
    const response = await api.get(`/users/user-information`);
    return response.data;
  },

  updateProfile: async (data: any) => {
    const response = await api.patch(`/users/update-information-user`, data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
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

  getFriends: async () => {
    const res = await api.get("/users/list-friends");
    return res;
  },

  addFriend: async (targetUserId: string, requesterId: string) => {
    const response = await api.post("/users/add-friend", { targetUserId, requesterId });
    return response.data;
  },

  acceptFriend: async (targetUserId: string, requesterId: string) => {
    const response = await api.post("/users/accept-friend", { targetUserId, requesterId });
    return response.data;
  },

  checkFriendStatus: async (targetUserId: string) => {
    const response = await api.get(`/users/friend-status/${targetUserId}`);
    return response.data;
  },
};
