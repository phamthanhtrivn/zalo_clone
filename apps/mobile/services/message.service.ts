import { EmojiType } from "@/utils/types/enums/emoji-type";
import { api } from "./api";

export const messageService = {
    getMessagesFromConversation: async (
        conversationId: string,
        userId: string,
        cursor?: string | null,
        limit: number = 15,
    ) => {
        const response = await api.get(
            `/messages/conversation/${conversationId}`,
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
    getNewerMessages: async (
        conversationId: string,
        userId: string,
        cursor?: string | null,
        limit: number = 15,
    ) => {
        const response = await api.get(
            `/messages/conversation/${conversationId}/newer`,
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
    getPinnedMessages: async (conversationId: string, userId: string) => {
        const response = await api.get(
            `/messages/conversation/${conversationId}/pinned`,
            {
                params: { userId },
            },
        );
        return response.data;
    },
    getMessagesAroundPinnedMessage: async (
        conversationId: string,
        userId: string,
        messageId: string,
        limit: number = 15,
    ) => {
        const response = await api.get(
            `/messages/conversation/${conversationId}/around`,
            {
                params: { userId, messageId, limit },
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
        const response = await api.patch(`/messages/reaction`, {
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
        const response = await api.patch(`/messages/remove-reaction`, {
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
        const response = await api.patch(`/messages/recalled`, {
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
        const response = await api.patch(`/messages/pinned`, {
            userId,
            messageId,
            conversationId,
        });
        return response.data;
    },
    sendMessage: async (
        conversationId: string,
        senderId: string,
        content?: { text?: string; icon?: string },
        file?: File | null,
    ) => {
        if (file) {
            const formData = new FormData();
            formData.append("conversationId", conversationId);
            formData.append("senderId", senderId);
            if (content?.text) {
                formData.append("content[text]", content.text);
            }
            if (content?.icon) {
                formData.append("content[icon]", content.icon);
            }
            formData.append("file", file);

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
            content,
        });
        return response.data;
    },
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
    readReceipt: async (userId: string, conversationId: string) => {
        const response = await api.patch(`/messages/read-receipt`, {
            userId,
            conversationId,
        });
        return response.data;
    },
    getMediasPreview: async (userId: string, conversationId: string) => {
        const response = await api.get(
            `/messages/conversation/${conversationId}/medias/preview`,
            {
                params: { userId },
            },
        );
        return response.data;
    },
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
};