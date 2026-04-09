import { EmojiType } from "@/constants/emoji.constant";
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
        return response;
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
        return response;
    },
    getPinnedMessages: async (conversationId: string, userId: string) => {
        const response = await api.get(
            `/messages/conversation/${conversationId}/pinned`,
            {
                params: { userId },
            },
        );
        return response;
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
        return response;
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
        return response;
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
        return response;
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
        return response;
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
        return response;
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
            return response;
        }

        const response = await api.post(`/messages`, {
            conversationId,
            senderId,
            content,
        });
        return response;
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
        return response;
    },
    readReceipt: async (userId: string, conversationId: string) => {
        const response = await api.patch(`/messages/read-receipt`, {
            userId,
            conversationId,
        });
        return response;
    },
    getMediasPreview: async (userId: string, conversationId: string) => {
        const response = await api.get(
            `/messages/conversation/${conversationId}/medias/preview`,
            {
                params: { userId },
            },
        );
        return response;
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
        return response;
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
        return response;
    },
};