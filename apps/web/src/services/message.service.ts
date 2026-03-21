import type { EmojiType } from "@/constants/emoji.constant";
import { apiClient } from "./apiClient";

export const messageService = {
  getMessagesFromConversation: async (
    conversationId: string,
    userId: string,
    cursor?: string | null,
    limit: number = 15,
  ) => {
    const response = await apiClient.get(
      `/api/messages/conversation/${conversationId}`,
      {
        params: {
          userId,
          cursor,
          limit,
        },
      },
    );
    return response.data;
  },
  reactionMessage: async (
    conversationId: string,
    userId: string,
    emojiType: EmojiType,
    messageId: string,
  ) => {
    const response = await apiClient.patch(`/api/messages/reaction`, {
      conversationId,
      userId,
      emojiType,
      messageId,
    });
    return response.data;
  },
  removeReaction: async (
    userId: string,
    messageId: string,
    conversationId: string,
  ) => {
    const response = await apiClient.patch(`/api/messages/remove-reaction`, {
      userId,
      messageId,
      conversationId,
    });
    return response.data;
  },
  recalledMessage: async (
    userId: string,
    messageId: string,
    conversationId: string,
  ) => {
    const response = await apiClient.patch(`/api/messages/recalled`, {
      userId,
      messageId,
      conversationId,
    });
    return response.data;
  },
  pinnedMessage: async (
    userId: string,
    messageId: string,
    conversationId: string,
  ) => {
    const response = await apiClient.patch(`/api/messages/pinned`, {
      userId,
      messageId,
      conversationId,
    });
    return response.data;
  },
};
