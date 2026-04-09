import { conversationService } from "@/services/conversation.service";
import type { ConversationItemType } from "@/types/conversation-item.type";
import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";

type ConversationsState = {
  conversations: ConversationItemType[];
  isLoading: boolean;
  error: string | null;
};

const initialState: ConversationsState = {
  conversations: [],
  isLoading: false,
  error: null,
};

export const fetchConversations = createAsyncThunk<
  ConversationItemType[],
  void,
  { rejectValue: string }
>("conversation/fetchConversations", async (_, { rejectWithValue }) => {
  try {
    const response = await conversationService.getConversationsFromUser();

    if (!response?.success) {
      return rejectWithValue(response?.message || "Fetch conversations failed");
    }

    return response.data ?? [];
  } catch (error) {
    return rejectWithValue("Không thể tải danh sách hội thoại");
  }
});

const conversationsSlice = createSlice({
  name: "conversation",
  initialState,
  reducers: {
    setConversations(state, action: PayloadAction<ConversationItemType[]>) {
      state.conversations = action.payload;
    },
    addConversationToTop(state, action: PayloadAction<ConversationItemType>) {
      const conversation = action.payload;
      const index = state.conversations.findIndex(
        (c) => c.conversationId === conversation.conversationId,
      );

      if (index !== -1) {
        state.conversations.splice(index, 1);
      }

      state.conversations.unshift(conversation);
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
    updateLastMessage(
      state,
      action: PayloadAction<{
        conversationId: string;
        lastMessage: ConversationItemType["lastMessage"];
        lastMessageAt?: string;
      }>,
    ) {
      const { conversationId, lastMessage, lastMessageAt } = action.payload;
      const index = state.conversations.findIndex(
        (c) => c.conversationId === conversationId,
      );

      if (index === -1) return;

      state.conversations[index].lastMessage = lastMessage;
      state.conversations[index].lastMessageAt =
        lastMessageAt ?? new Date().toISOString();

      const updated = state.conversations.splice(index, 1)[0];
      state.conversations.unshift(updated);
    },
    updateConversationFromSocket(
      state,
      action: PayloadAction<{
        conversationId: string;
        lastMessage: ConversationItemType["lastMessage"];
        lastMessageAt?: string;
        unreadCount?: number;
      }>,
    ) {
      const { conversationId, lastMessage, lastMessageAt, unreadCount } =
        action.payload;
      const index = state.conversations.findIndex(
        (c) => c.conversationId === conversationId,
      );

      if (index === -1) return;

      const nextConversation = {
        ...state.conversations[index],
        lastMessage,
        lastMessageAt: lastMessageAt ?? new Date().toISOString(),
        unreadCount:
          unreadCount === undefined
            ? state.conversations[index].unreadCount
            : unreadCount,
      };

      state.conversations.splice(index, 1);
      state.conversations.unshift(nextConversation);
    },
    resetUnreadCount(state, action: PayloadAction<{ conversationId: string }>) {
      const { conversationId } = action.payload;
      const conversation = state.conversations.find(
        (c) => c.conversationId === conversationId,
      );

      if (!conversation) return;

      conversation.unreadCount = 0;
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
    removeConversation(state, action: PayloadAction<{ conversationId: string }>) {
      const id = String(action.payload?.conversationId ?? "").trim();
      if (!id) return;
      state.conversations = state.conversations.filter(
        (c) => String(c.conversationId) !== id,
      );
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.conversations = action.payload;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Không thể tải danh sách hội thoại";
      });
  },
});

export const {
  setConversations,
  addConversationToTop,
  updateConversation,
  updateConversationFromSocket,
  updateLastMessage,
  resetUnreadCount,
  updateRecallMessageInConversation,
  removeConversation,
} = conversationsSlice.actions;

export default conversationsSlice.reducer;
