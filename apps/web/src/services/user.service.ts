import { apiClient } from "./apiClient";

export const userService = {
  getListFriends: async () => {
    const response = await apiClient.get(`users/list-friends`);
    return response.data;
  },

  searchFriend: async (key: string, userId : string) => {
    const response = await apiClient.post("users/search-friend", {
      userId: userId,
      key,
    });
    return response.data;
  },
  cancelFriend: async (friendId: string,  userId : string) => {
    const response = await apiClient.post("users/cancel-friend", {
      userId: userId,
      friendId: friendId,
    });
    return response.data;
  },
  blockFriend: async (friendId: string, userId : string) => {
    const response = await apiClient.post("users/block-friend", {
      userId: userId,
      friendId: friendId,
    });
    return response.data;
  },
  receivedFriendRequests: async () => {
    const response = await apiClient.get(
      `users/received-friends-requests`,
    );
    return response.data;
  },

  sentFriendRequests: async () => {
    const response = await apiClient.get(
      `users/sent-friends-requests`,
    );
    return response.data;
  },

  suggestFriend: async () => {
    const response = await apiClient.post(`users/suggest-friend`);
    return response.data;
  },

  acceptFriend: async (friendId: string, userId : string) => {
    const response = await apiClient.post(`users/accept-friend`, {
      userId: userId,
      friendId: friendId,
    });
    return response.data;
  },

  rejectFriend: async (friendId: string, userId : string) => {
    const response = await apiClient.post(`users/reject-friend`, {
      userId: userId,
      friendId: friendId,
    });
    return response.data;
  },

  addFriend: async (friendId: string, userId : string) => {
    const response = await apiClient.post(`users/add-friend`, {
      userId: userId,
      friendId: friendId,
    });
    return response.data;
  },

  getProfile: async () => {
    const response = await apiClient.get(`/users/user-information`);
    return response.data;
  },

  updateProfile: async (data: any) => {
    const response = await apiClient.patch(
      `/users/update-information-user`,
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
    const response = await apiClient.get("/users/settings");
    return response.data;
  },

  updateSettings: async (settings: any) => {
    const response = await apiClient.patch("/users/settings", settings);
    return response.data;
  },
};
