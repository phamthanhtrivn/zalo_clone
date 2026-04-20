import { apiClient } from "./apiClient";

export const conversationService = {
  getConversationsFromUserId: async (userId: string) => {
    const response = await apiClient.get(`/api/conversations/user/${userId}`);
    return response.data;
  },
  search: async (
    userId: string,
    keyword: string,
    scope: "all" | "contacts" | "messages" | "files" | "groups" = "all",
    limit = 8,
  ) => {
    const response = await apiClient.get("/api/conversations/search", {
      params: {
        userId,
        keyword,
        scope,
        limit,
      },
    });
    return response.data;
  },
};
