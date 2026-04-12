
import type { ConversationItemType } from "@/types/conversation-item.type";
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

      state.conversations = action.payload
    },

    togglePinConversation(state, action: PayloadAction<string>) {
      const c = state.conversations.find(
        (c) => c.conversationId === action.payload
      )
      if (c) c.pinned = !c.pinned
    },

    hideConversationLocal(state, action: PayloadAction<string>) {
      const c = state.conversations.find(
        (c) => c.conversationId === action.payload
      )
      if (c) c.hidden = !c.hidden
    },

    toggleMuteConversation(state, action: PayloadAction<string>) {
      const c = state.conversations.find(
        (c) => c.conversationId === action.payload
      )
      if (c) c.muted = !c.muted
    },
    setCategoryLocal(
      state,
      action: PayloadAction<{
        conversationId: string;
        category: ConversationCategory;
      }>
    ) {
      const c = state.conversations.find(
        (c) => c.conversationId === action.payload.conversationId
      );
      if (c) {
        c.category = action.payload.category;
      }
    },
    removeConversation: (state, action) => {
      state.conversations = state.conversations.filter(
        (c) => c.conversationId !== action.payload
      );
    },


    state.conversations = action.payload;
  },
  updateConversation(state, action: PayloadAction<ConversationItemType>) {
    const index = state.conversations.findIndex(
      (c) => c.conversationId === action.payload.conversationId,
    );

    if (index !== -1) {
      state.conversations[index] = action.payload;

      const updated = state.conversations.splice(index, 1)[0];
      state.conversations.unshift(updated);
    } else {
      state.conversations.unshift(action.payload);
    }
  },
  updateRecallMessageInConversation(
    state,
    action: PayloadAction<{ conversationId: string; messageId: string }>,
  ) {
    const { conversationId, messageId } = action.payload;

    const conversation = state.conversations.find(
      (c) => c.conversationId === conversationId,
    );

    if (conversation && conversation.lastMessage?._id === messageId) {
      conversation.lastMessage.recalled = true;
    }
  },

}
})

export const { setConversations, togglePinConversation, hideConversationLocal, toggleMuteConversation, setCategoryLocal, removeConversation, updateConversation, updateRecallMessageInConversation } =
  conversationSlice.actions;

export default conversationSlice.reducer

