import type {
  ConversationCategory,
  ConversationItemType,
} from "@/types/conversation-item.type";
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
      action: PayloadAction<
        Partial<ConversationItemType> & { conversationId: string }
      >,
    ) {
      const index = state.conversations.findIndex(
        (c) => c.conversationId === action.payload.conversationId,
      );
      if (index !== -1) {
        const updated = { ...state.conversations[index], ...action.payload };
        state.conversations.splice(index, 1);
        state.conversations.unshift(updated);
      } else {
        state.conversations.unshift(action.payload as ConversationItemType);
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
      }>,
    ) {
      const c = state.conversations.find(
        (c) => c.conversationId === action.payload.conversationId,
      );
      if (!c) return;

      if (action.payload.pinned !== undefined) c.pinned = action.payload.pinned;
      if (action.payload.hidden !== undefined) c.hidden = action.payload.hidden;
      if (action.payload.muted !== undefined) c.muted = action.payload.muted;
      if (action.payload.mutedUntil !== undefined)
        c.mutedUntil = action.payload.mutedUntil;
      if (action.payload.category !== undefined)
        c.category = action.payload.category;
      if (action.payload.expireDuration !== undefined)
        c.expireDuration = action.payload.expireDuration;
    },

    updateRecallMessageInConversation(state, action) {
      const { conversationId, messageId } = action.payload;
      const conversation = state.conversations.find(
        (c) => c.conversationId === conversationId,
      );
      if (conversation && conversation.lastMessage?._id === messageId) {
        conversation.lastMessage.recalled = true;
      }
    },

    hideConversationLocal(state, action: PayloadAction<string>) {
      const c = state.conversations.find(
        (c) => c.conversationId === action.payload,
      );
      if (c) c.hidden = !c.hidden;
    },

    setCategoryLocal(
      state,
      action: PayloadAction<{
        conversationId: string;
        category: ConversationCategory | null;
      }>,
    ) {
      const c = state.conversations.find(
        (c) => c.conversationId === action.payload.conversationId,
      );
      if (c) c.category = action.payload.category;
    },

    removeConversation(state, action: PayloadAction<string>) {
      state.conversations = state.conversations.filter(
        (c) => c.conversationId !== action.payload,
      );
    },
  },
});

export const {
  setConversations,
  updateConversation,
  updateConversationSetting,
  updateRecallMessageInConversation,
  hideConversationLocal,
  setCategoryLocal,
  removeConversation,
} = conversationSlice.actions;

export default conversationSlice.reducer;
