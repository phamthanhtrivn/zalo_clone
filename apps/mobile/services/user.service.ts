import { api } from "./api";

export const userService = {
  getProfile: async (userId?: string) => {
    const response = await api.get(`/users/user-information/${userId}`);
    return response.data;
  },

  updateProfile: async (data: any) => {
    const response = await api.patch(
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

   getListFriends: async () => {
    const response = await api.get(`/users/list-friends`);
    return response.data;
  },
  searchFriendByPhone : async (userId : string, phone : string) => {
    const response = await api.post("/users/search-friend-phone", {userId, phone});
    return response.data;
  },


  searchFriend: async (key: string, userId : string) => {
    const response = await api.post("/users/search-friend", {
      userId: userId,
      key,
    });
    return response.data;
  },
  cancelFriend: async (friendId: string,  userId : string) => {
    const response = await api.post("/users/cancel-friend", {
      userId: userId,
      friendId: friendId,
    });
    return response.data;
  },
  blockFriend: async (friendId: string, userId : string) => {
    const response = await api.post("/users/block-friend", {
      userId: userId,
      friendId: friendId,
    });
    return response.data;
  },
  
  receivedFriendRequests: async () => {
    const response = await api.get(
      `/users/received-friends-requests`,
    );
    return response.data;
  },

  sentFriendRequests: async () => {
    const response = await api.get(
      `/users/sent-friends-requests`,
    );
    return response.data;
  },

  suggestFriend: async () => {
    const response = await api.post(`/users/suggest-friend`);
    return response.data;
  },

  acceptFriend: async (friendId: string, userId : string) => {
    const response = await api.post(`/users/accept-friend`, {
      userId: userId,
      friendId: friendId,
    });
    return response.data;
  },

  rejectFriend: async (friendId: string, userId : string) => {
    const response = await api.post(`/users/reject-friend`, {
      userId: userId,
      friendId: friendId,
    });
    return response.data;
  },

  addFriend: async (friendId: string, userId : string) => {
    const response = await api.post(`/users/add-friend`, {
      userId: userId,
      friendId: friendId,
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
