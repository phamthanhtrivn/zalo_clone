import { EmojiType } from "@/constants/emoji.constant";
import { api } from "./api";

export const messageService = {
  // 1. Lấy tin nhắn cũ hơn (phục vụ scroll up)
  getMessagesFromConversation: async (
    conversationId: string,
    userId: string,
    cursor?: string | null,
    limit: number = 20, // Giữ chuẩn limit 20 từ develop
  ) => {
    const response = await api.get(`/messages/conversation/${conversationId}`, {
      params: { userId, cursor, limit },
    });
    return response.data; // Đồng bộ trả về .data
  },

  // 2. Lấy tin nhắn mới hơn (phục vụ scroll down khi đang ở giữa cuộc hội thoại)
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

  // 3. Lấy danh sách tin nhắn đã ghim
  getPinnedMessages: async (conversationId: string, userId: string) => {
    const response = await api.get(
      `/messages/conversation/${conversationId}/pinned`,
      {
        params: { userId },
      },
    );
    return response.data;
  },

  // 4. Lấy các tin nhắn xung quanh một tin nhắn cụ thể (phục vụ nhảy tới tin nhắn ghim)
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

  // 5. Thả cảm xúc
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

  // 6. Gỡ cảm xúc
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

  // 7. Thu hồi tin nhắn
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

  // 8. Ghim tin nhắn
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

  // 9. Gửi tin nhắn (Khôi phục bản nâng cao từ KhongVanTam: Hỗ trợ nhiều file & Reply)
  sendMessage: async (
    conversationId: string,
    senderId: string,
    repliedId?: string,
    content?: { text?: string; icon?: string },
    files?: any[] | null,
  ) => {
    if (files && files.length > 0) {
      const formData = new FormData();
      formData.append("conversationId", conversationId);
      formData.append("senderId", senderId);

      if (repliedId) {
        formData.append("repliedId", repliedId);
      }

      if (content) {
        formData.append("content", JSON.stringify(content));
      }

      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await api.post(`/messages`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    }

    const response = await api.post(`/messages`, {
      conversationId,
      senderId,
      repliedId,
      content,
    });
    return response.data;
  },

  // 10. Mobile-specific: upload files bằng React Native FormData (Khôi phục từ KhongVanTam)
  sendFormData: async (formData: FormData) => {
    const response = await api.post(`/messages`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // 11. Xóa tin nhắn ở phía người dùng hiện tại
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

  // 12. Gửi tín hiệu đã đọc tin nhắn
  readReceipt: async (userId: string, conversationId: string) => {
    const response = await api.patch(`/messages/read-receipt`, {
      userId,
      conversationId,
    });
    return response.data;
  },

  // 13. Lấy xem trước các file đa phương tiện trong hội thoại
  getMediasPreview: async (userId: string, conversationId: string) => {
    const response = await api.get(
      `/messages/conversation/${conversationId}/medias/preview`,
      {
        params: { userId },
      },
    );
    return response.data;
  },

  // 14. Lấy danh sách file theo loại (FILE | LINK) (Khôi phục từ KhongVanTam)
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

  // 15. Chuyển tiếp tin nhắn sang các hội thoại khác
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

  // 16. Cập nhật trạng thái cuộc gọi (Khôi phục từ HEAD)
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
