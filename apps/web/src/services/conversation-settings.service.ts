import { apiClient } from "./apiClient";

// Gim cuộc hội thoại
export const pinConversation = async (userId: string, conversationId: string) => {
    try {
        const response = await apiClient.patch('/api/conversation-settings/pin', {
            userId,
            conversationId,
        });
        return response.data;
    } catch (error) {
        console.error('Error pinning conversation:', error);
        throw error;
    }
};
// Bỏ gim cuộc hội thoại
export const unpinConversation = async (userId: string, conversationId: string) => {
    try {
        const response = await apiClient.patch('/api/conversation-settings/unpin', {
            userId,
            conversationId,
        });
        return response.data;
    } catch (error) {
        console.error('Error unpinning conversation:', error);
        throw error;
    }
};
// Ẩn cuộc hội thoại
export const hideConversation = async (userId: string, conversationId: string) => {
    try {
        const response = await apiClient.patch('/api/conversation-settings/hide', {
            userId,
            conversationId,
        });
        return response.data;
    } catch (error) {
        console.error('Error hiding conversation:', error);
        throw error;
    }
};
// Bỏ ẩn cuộc hội thoại
export const unhideConversation = async (userId: string, conversationId: string) => {
    try {
        const response = await apiClient.patch('/api/conversation-settings/unhide', {
            userId,
            conversationId,
        });
        return response.data;
    } catch (error) {
        console.error('Error unhiding conversation:', error);
        throw error;
    }
};
// Tắt thông báo cuộc hội thoại
export const muteConversation = async (userId: string, conversationId: string, duration: number) => {
    try {
        const response = await apiClient.patch('/api/conversation-settings/mute', {
            userId,
            conversationId,
            duration
        });
        return response.data;
    } catch (error) {
        console.error('Error muting conversation:', error);
        throw error;
    }
};
// Bât thông báo cuộc hội thoại
export const unmuteConversation = async (userId: string, conversationId: string) => {
    try {
        const response = await apiClient.patch('/api/conversation-settings/unmute', {
            userId,
            conversationId,
        });
        return response.data;
    } catch (error) {
        console.error('Error unmuting conversation:', error);
        throw error;
    };
}