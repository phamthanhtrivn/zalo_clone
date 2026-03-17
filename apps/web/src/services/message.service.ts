import { apiClient } from "./apiClient";

export const messageService = {
  getMessagesFromConversation: async (conversationId: string, userId: string, cursor?: string | null, limit: number = 15) => {
    const response = await apiClient.get(`/api/messages/conversation/${conversationId}`, {
      params: {
        userId,
        cursor,
        limit
      }
    })
    return response.data;
  }
};
