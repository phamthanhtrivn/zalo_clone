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
  },
});

export const { setConversations, updateConversation } =
  conversationSlice.actions;
export default conversationSlice.reducer;
