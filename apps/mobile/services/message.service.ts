import { api } from "./api";

export const messageService = {
  getMessagesFromConversation: async (
    conversationId: string,
    userId: string,
    cursor?: string | null,
    limit: number = 30,
  ) => {
    const id = String(conversationId ?? "").trim();
    const uid = String(userId ?? "").trim();
    const res = await api.get(`/messages/conversation/${id}`, {
      params: {
        userId: uid,
        cursor,
        limit,
      },
    });
    return res?.data ?? res;
  },
  sendMessage: async (
    conversationId: string,
    senderId: string,
    content: { text?: string; icon?: string },
  ) => {
    const id = String(conversationId ?? "").trim();
    const sid = String(senderId ?? "").trim();
    const res = await api.post(`/messages`, {
      conversationId: id,
      senderId: sid,
      content,
    });
    return res?.data ?? res;
  },
};
