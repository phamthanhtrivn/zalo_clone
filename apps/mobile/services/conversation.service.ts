import { api } from "./api";

export const conversationService = {
  getConversationsFromUserId: async (userId: string) => {
    const response = await api.get(`/conversations/user/${userId}`);
    console.log('📊 API Response sample:', JSON.stringify(response.data?.[0], null, 2));
    console.log('📊 unreadCount values:', response.data?.map((c: any) => ({
      name: c.name,
      unreadCount: c.unreadCount
    })));
    return response;
  },
};
