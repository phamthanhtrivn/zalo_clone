import { api } from "./api";

// Gim cuộc hội thoại
export const pinConversation = async (userId: string, conversationId: string) => {
    try {
        const response = await api.patch('/conversation-settings/pin', {
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
        const response = await api.patch('/conversation-settings/unpin', {
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
        const response = await api.patch('/conversation-settings/hide', {
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
        const response = await api.patch('/conversation-settings/unhide', {
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
        const response = await api.patch('/conversation-settings/mute', {
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
        const response = await api.patch('/conversation-settings/unmute', {
            userId,
            conversationId,
        });
        return response.data;
    } catch (error) {
        console.error('Error unmuting conversation:', error);
        throw error;
    }
};

// Phân loại cuộc hội thoại

// Phân loại cuộc hội thoại
export const setCategory = async (
    userId: string,
    conversationId: string,
    category: 'customer' | 'family' | 'work' | 'friends' | 'later' | 'colleague'
) => {
    try {
        const response = await api.patch('/conversation-settings/category', {
            userId,
            conversationId,
            category,
        });
        return response.data;
    } catch (error) {
        console.error('Error setting category:', error);
        throw error;
    }
};

// Xóa cuộc hội thoại
export const deleteConversation = async (userId: string, conversationId: string) => {
    try {
        const response = await api.patch('/conversation-settings/delete', {
            userId,
            conversationId,
        });
        return response.data;
    } catch (error) {
        console.error('Error deleting conversation:', error);
        throw error;
    }

};
// tin nhắn tự xóa

export const expireMessage = async (userId: string, conversationId: string, duration: number) => {
    try {
        const response = await api.patch('/conversation-settings/expire', {
            userId,
            conversationId,
            duration,
        });
        return response.data;
    } catch (error) {
        console.error('Error expiring message:', error);
        throw error;
    }
};
