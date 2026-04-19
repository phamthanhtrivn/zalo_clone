import type {
  ConversationItemType,
  ConversationCategory,
} from "@/types/conversation-item.type";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type ConversationState = {
  conversations: ConversationItemType[];
  replyingMessage: any | null;
};

const initialState: ConversationState = {
  conversations: [],
  replyingMessage: null,
};

const conversationSlice = createSlice({
  name: "conversation",
  initialState,
  reducers: {
    setConversations(state, action: PayloadAction<ConversationItemType[]>) {
      state.conversations = action.payload;
    },

    updateConversation(
      state,
      action: PayloadAction<Partial<ConversationItemType> & { conversationId: string }>
    ) {
      const index = state.conversations.findIndex(
        (c) => c.conversationId === action.payload.conversationId
      );
      if (index !== -1) {
        const updated = {
          ...state.conversations[index],
          ...action.payload,

        };
        state.conversations.splice(index, 1);
        state.conversations.unshift(updated);
      }
    },

    updateConversationSetting(
      state,
      action: PayloadAction<{
        conversationId: string;
        pinned?: boolean;
        hidden?: boolean;
        muted?: boolean;
        mutedUntil?: string | null;
        category?: ConversationCategory | null;
        expireDuration?: number;
        unreadCount?: number;
      }>
    ) {
      const c = state.conversations.find(
        (c) => c.conversationId === action.payload.conversationId
      );
      if (!c) return;

      if (action.payload.pinned !== undefined) c.pinned = action.payload.pinned;
      if (action.payload.hidden !== undefined) c.hidden = action.payload.hidden;
      if (action.payload.muted !== undefined) c.muted = action.payload.muted;
      if (action.payload.mutedUntil !== undefined) c.mutedUntil = action.payload.mutedUntil;
      if (action.payload.category !== undefined) c.category = action.payload.category;
      if (action.payload.expireDuration !== undefined) c.expireDuration = action.payload.expireDuration;
      if (action.payload.unreadCount !== undefined) // ✅ THÊM
        c.unreadCount = action.payload.unreadCount;
    },

    setCategoryLocal(
      state,
      action: PayloadAction<{
        conversationId: string;
        category: ConversationCategory | null;
      }>
    ) {
      const c = state.conversations.find(
        (c) => c.conversationId === action.payload.conversationId
      );
      if (c) c.category = action.payload.category;
    },

    removeConversation(state, action: PayloadAction<string>) {
      state.conversations = state.conversations.filter(
        (c) => c.conversationId !== action.payload
      );

    },
    removeExpiredMessages(state, action: PayloadAction<string[]>) {
      state.conversations = state.conversations.map((c) => {
        if (c.lastMessage && action.payload.includes(c.lastMessage._id)) {
          return {
            ...c,
            lastMessage: {
              ...c.lastMessage,
              expired: true,
              content: {
                ...c.lastMessage.content,
                text: "Tin nhắn đã hết hạn",
              },
            },
            lastMessageAt: new Date().toISOString(),
          };
        }
        return c;
      });
    },
    updateRecallMessageInConversation(
      state,
      action: PayloadAction<{ conversationId: string; messageId: string }>
    ) {
      const { conversationId, messageId } = action.payload;
      const conversation = state.conversations.find(
        (c) => c.conversationId === conversationId
      );
      if (conversation && conversation.lastMessage?._id === messageId) {
        conversation.lastMessage.recalled = true;
        conversation.lastMessage.content.text = "Tin nhắn đã bị thu hồi";
      }
    },

    setUnreadCount(
      state,
      action: PayloadAction<{ conversationId: string; unreadCount: number }>
    ) {
      const c = state.conversations.find(
        (c) => c.conversationId === action.payload.conversationId
      );
      if (c) {
        c.unreadCount = action.payload.unreadCount;
      }
    },
    // conversationSlice.ts
    updateUnreadStateInMessages(
      state,
      action: PayloadAction<{
        conversationId: string;
        userId: string;
        lastReadMessageId: string | null;
      }>
    ) {
      const { conversationId, userId, lastReadMessageId } = action.payload;

      const conversation = state.conversations.find(
        (c) => c.conversationId === conversationId
      );

      if (!conversation) return;

      // Cập nhật unreadCount cho conversation
      if (conversation.messages) {
        const newUnreadCount = conversation.messages.filter((msg) => {
          if (msg.senderId._id === userId) return false; // Không tính tin nhắn của chính user
          if (!lastReadMessageId) return true;
          return msg._id > lastReadMessageId;
        }).length;

        conversation.unreadCount = newUnreadCount;
      }
    },
    setReplyingMessage(state, action: PayloadAction<any | null>) {
      state.replyingMessage = action.payload;
    },

    clearReplyingMessage(state) {
      state.replyingMessage = null;
    },
  },
});

export const {
  setConversations,
  updateConversation,
  updateConversationSetting,
  setCategoryLocal,
  removeConversation,
  updateRecallMessageInConversation,
  removeExpiredMessages,
  setUnreadCount,
  updateUnreadStateInMessages,
  clearReplyingMessage,
  setReplyingMessage
} = conversationSlice.actions;

export default conversationSlice.reducer;
