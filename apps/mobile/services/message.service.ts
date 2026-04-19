import { EmojiType } from "@/constants/emoji.constant";
import { api } from "./api";

export const messageService = {
  // Lấy tin nhắn cũ hơn (phục vụ scroll up)
  getMessagesFromConversation: async (
    conversationId: string,
    userId: string,
    cursor?: string | null,
    limit: number = 20,
  ) => {
    const res = await api.get(`/messages/conversation/${conversationId}`, {
      params: { userId, cursor, limit },
    });
    return res;
  },

  // Lấy tin nhắn mới hơn (phục vụ scroll down khi đang ở giữa cuộc hội thoại)
  getNewerMessages: async (
    conversationId: string,
    userId: string,
    cursor?: string | null,
    limit: number = 20,
  ) => {
    const res = await api.get(
      `/messages/conversation/${conversationId}/newer`,
      {
        params: { userId, cursor, limit },
      },
    );
    return res;
  },

  // Lấy danh sách tin nhắn đã ghim
  getPinnedMessages: async (conversationId: string, userId: string) => {
    const res = await api.get(
      `/messages/conversation/${conversationId}/pinned`,
      {
        params: { userId },
      },
    );
    return res;
  },

  // Lấy các tin nhắn xung quanh một tin nhắn cụ thể (phục vụ nhảy tới tin nhắn ghim)
  getMessagesAroundPinnedMessage: async (
    conversationId: string,
    userId: string,
    messageId: string,
    limit: number = 20,
  ) => {
    const res = await api.get(
      `/messages/conversation/${conversationId}/around`,
      {
        params: { userId, messageId, limit },
      },
    );
    return res;
  },

  // Thả cảm xúc
  reactionMessage: async (
    conversationId: string,
    userId: string,
    emojiType: EmojiType,
    messageId: string,
  ) => {
    const res = await api.patch(`/messages/reaction`, {
      conversationId,
      userId,
      emojiType,
      messageId,
    });
    return res;
  },

  // Gỡ cảm xúc
  removeReaction: async (
    userId: string,
    messageId: string,
    conversationId: string,
  ) => {
    const res = await api.patch(`/messages/remove-reaction`, {
      userId,
      messageId,
      conversationId,
    });
    return res;
  },

  // Thu hồi tin nhắn
  recalledMessage: async (
    userId: string,
    messageId: string,
    conversationId: string,
  ) => {
    const res = await api.patch(`/messages/recalled`, {
      userId,
      messageId,
      conversationId,
    });
    return res;
  },

  // Ghim tin nhắn
  pinnedMessage: async (
    userId: string,
    messageId: string,
    conversationId: string,
  ) => {
    const res = await api.patch(`/messages/pinned`, {
      userId,
      messageId,
      conversationId,
    });
    return res;
  },

  // Gửi tin nhắn (Hỗ trợ cả Text và File/Ảnh qua FormData)
  sendMessage: async (
    conversationId: string,
    senderId: string,
    content?: { text?: string; icon?: string },
    file?: any | null, // Kiểu any để tương thích với cấu trúc File của React Native
  ) => {
    if (file) {
      const formData = new FormData();
      formData.append("conversationId", conversationId);
      formData.append("senderId", senderId);
      if (content?.text) formData.append("content[text]", content.text);
      if (content?.icon) formData.append("content[icon]", content.icon);

      // Chú ý: React Native yêu cầu object đặc biệt cho File trong FormData
      formData.append("file", file);

      const res = await api.post(`/messages`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res;
    }

    const res = await api.post(`/messages`, {
      conversationId,
      senderId,
      content,
    });
    return res;
  },

  // Xóa tin nhắn ở phía người dùng hiện tại
  deleteMessageForMe: async (
    userId: string,
    messageId: string,
    conversationId: string,
  ) => {
    const res = await api.patch(`/messages/delete-for-me`, {
      userId,
      messageId,
      conversationId,
    });
    return res;
  },

  // Gửi tín hiệu đã đọc tin nhắn
  readReceipt: async (userId: string, conversationId: string) => {
    const res = await api.patch(`/messages/read-receipt`, {
      userId,
      conversationId,
    });
    return res;
  },

  // Lấy xem trước các file đa phương tiện trong hội thoại
  getMediasPreview: async (userId: string, conversationId: string) => {
    const res = await api.get(
      `/messages/conversation/${conversationId}/medias/preview`,
      {
        params: { userId },
      },
    );
    return res;
  },

  // Chuyển tiếp tin nhắn sang các hội thoại khác
  forwardMessagesToConversations: async (
    userId: string,
    messageIds: string[],
    targetConversationIds: string[],
  ) => {
    const res = await api.post(`/messages/forward`, {
      userId,
      messageIds,
      targetConversationIds,
    });
    return res;
  },

  async updateCallStatus(
    messageId: string,
    status: string,
    conversationId: string,
  ) {
    const res = await api.patch(
      `/messages/conversation/${conversationId}/call-status`,
      {
        messageId,
        status,
      },
    );
    return res;
  },
};
