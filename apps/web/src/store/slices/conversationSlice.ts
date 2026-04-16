import type { ConversationItemType, ConversationCategory } from "@/types/conversation-item.type";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type ConversationState = {
  conversations: ConversationItemType[];
};

const initialState: ConversationState = {
  conversations: [],
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
          ...action.payload
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
      for (const c of state.conversations) {
        if (c.lastMessage && action.payload.includes(c.lastMessage._id)) {
          c.lastMessage = {
            ...c.lastMessage,
            expired: true,
            content: {
              text: "Tin nhắn đã hết hạn",
            },
          };
        }
      }
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
  },
});

export const {
  setConversations,
  updateConversation,
  updateConversationSetting,
  setCategoryLocal,
  removeConversation,
  updateRecallMessageInConversation,
  removeExpiredMessages
} = conversationSlice.actions;

export default conversationSlice.reducer;