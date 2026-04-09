import { apiClient } from "./apiClient";

export const conversationService = {
  getConversationsFromUserId: async (userId: string) => {
    const response = await apiClient.get(`/api/conversations/user/${userId}`);
    return response.data;
  },
};
