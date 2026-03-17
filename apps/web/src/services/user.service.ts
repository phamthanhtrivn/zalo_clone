import { apiClient } from "./apiClient";


const userId = "69a7cf6cdf7c64ce18685dc6";
export const userService = {
  getListFriends : async () => {
    const response = await apiClient.get(`users/list-friends/${userId}`);
    return response.data;
  },

  searchFriend : async ( key : string ) => {
    const reponse = await apiClient.post("users/search-friend", {userId : "69a7cf6cdf7c64ce18685dc6",key});
    return reponse.data;
  },

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
