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
    const response = await api.get(`/messages/conversation/${conversationId}`, {
      params: { userId, cursor, limit },
    });
    return response.data;
  },

  // Lấy tin nhắn mới hơn (phục vụ scroll down khi đang ở giữa cuộc hội thoại)
  getNewerMessages: async (
    conversationId: string,
    userId: string,
    cursor?: string | null,
    limit: number = 20,
  ) => {
    const response = await api.get(
      `/messages/conversation/${conversationId}/newer`,
      {
        params: { userId, cursor, limit },
      },
    );
    return response.data;
  },

  // Lấy danh sách tin nhắn đã ghim
  getPinnedMessages: async (conversationId: string, userId: string) => {
    const response = await api.get(
      `/messages/conversation/${conversationId}/pinned`,
      {
        params: { userId },
      },
    );
    return response.data;
  },

  // Lấy các tin nhắn xung quanh một tin nhắn cụ thể (phục vụ nhảy tới tin nhắn ghim)
  getMessagesAroundPinnedMessage: async (
    conversationId: string,
    userId: string,
    messageId: string,
    limit: number = 20,
  ) => {
    const response = await api.get(
      `/messages/conversation/${conversationId}/around`,
      {
        params: { userId, messageId, limit },
      },
    );
    return response.data;
  },

  // Thả cảm xúc
  reactionMessage: async (
    conversationId: string,
    userId: string,
    emojiType: EmojiType,
    messageId: string,
  ) => {
    const response = await api.patch(`/messages/reaction`, {
      conversationId,
      userId,
      emojiType,
      messageId,
    });
    return response.data;
  },

  // Gỡ cảm xúc
  removeReaction: async (
    userId: string,
    messageId: string,
    conversationId: string,
  ) => {
    const response = await api.patch(`/messages/remove-reaction`, {
      userId,
      messageId,
      conversationId,
    });
    return response.data;
  },

  // Thu hồi tin nhắn
  recalledMessage: async (
    userId: string,
    messageId: string,
    conversationId: string,
  ) => {
    const response = await api.patch(`/messages/recalled`, {
      userId,
      messageId,
      conversationId,
    });
    return response.data;
  },

  // Ghim tin nhắn
  pinnedMessage: async (
    userId: string,
    messageId: string,
    conversationId: string,
  ) => {
    const response = await api.patch(`/messages/pinned`, {
      userId,
      messageId,
      conversationId,
    });
    return response.data;
  },

  /**
   * Gửi tin nhắn
   * Hỗ trợ nhiều file, Trả lời tin nhắn (repliedId) và FormData cho React Native
   */
  sendMessage: async (
    conversationId: string,
    senderId: string,
    repliedId?: string,
    content?: { text?: string; icon?: string },
    files?: any[] | null,
  ) => {
    // Trường hợp gửi kèm file (Dùng FormData)
    if (files && files.length > 0) {
      const formData = new FormData();
      formData.append("conversationId", conversationId);
      formData.append("senderId", senderId);

      if (repliedId) {
        formData.append("repliedId", repliedId);
      }

      if (content) {
        // Backend yêu cầu stringify content khi dùng multipart
        formData.append("content", JSON.stringify(content));
      }

      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await api.post(`/messages`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    }

    // Trường hợp gửi text/sticker thông thường
    const response = await api.post(`/messages`, {
      conversationId,
      senderId,
      repliedId,
      content,
    });
    return response.data;
  },

  // Upload file chuyên dụng cho React Native (Object: {uri, name, type})
  sendFormData: async (formData: FormData) => {
    const response = await api.post(`/messages`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Xóa tin nhắn ở phía người dùng hiện tại
  deleteMessageForMe: async (
    userId: string,
    messageId: string,
    conversationId: string,
  ) => {
    const response = await api.patch(`/messages/delete-for-me`, {
      userId,
      messageId,
      conversationId,
    });
    return response.data;
  },

  // Gửi tín hiệu đã đọc tin nhắn
  readReceipt: async (userId: string, conversationId: string) => {
    const response = await api.patch(`/messages/read-receipt`, {
      userId,
      conversationId,
    });
    return response.data;
  },

  // Lấy xem trước các file đa phương tiện trong hội thoại
  getMediasPreview: async (userId: string, conversationId: string) => {
    const response = await api.get(
      `/messages/conversation/${conversationId}/medias/preview`,
      {
        params: { userId },
      },
    );
    return response.data;
  },

  // Lấy danh sách file theo loại (FILE | LINK)
  getMediasFileType: async (
    conversationId: string,
    userId: string,
    type: "FILE" | "LINK",
  ) => {
    const response = await api.get(
      `/messages/conversation/${conversationId}/medias`,
      {
        params: { userId, type },
      },
    );
    return response.data;
  },

  // Chuyển tiếp tin nhắn sang các hội thoại khác
  forwardMessagesToConversations: async (
    userId: string,
    messageIds: string[],
    targetConversationIds: string[],
  ) => {
    const response = await api.post(`/messages/forward`, {
      userId,
      messageIds,
      targetConversationIds,
    });
    return response.data;
  },

  // Cập nhật trạng thái cuộc gọi (Logic quan trọng từ HEAD)
  async updateCallStatus(
    messageId: string,
    status: string,
    conversationId: string,
  ) {
    const response = await api.patch(
      `/messages/conversation/${conversationId}/call-status`,
      {
        messageId,
        status,
      },
    );
    return response.data;
  },
};
