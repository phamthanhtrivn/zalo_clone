import { api } from "./api";

export const conversationService = {
  getConversationsFromUserId: async (userId: string) => {
    const response = await api.get(`/conversations/user/${userId}`);
    return response.data;
  },
};
