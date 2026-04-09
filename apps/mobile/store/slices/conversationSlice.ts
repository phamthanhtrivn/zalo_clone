import { conversationService } from "@/services/conversation.service";
import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

type ConversationLastMessage = {
  _id?: string;
  senderName?: string | null;
  content?: {
    text?: string;
    icon?: string;
    file?: unknown;
  };
  recalled?: boolean;
  type?: string;
};

export type ConversationItem = {
  conversationId: string;
  type: string;
  name: string;
  avatar?: string | null;
  unreadCount?: number;
  lastMessage?: ConversationLastMessage;
  lastMessageAt?: string;
};

type ConversationState = {
  items: ConversationItem[];
  loading: boolean;
  error: string | null;
};

const initialState: ConversationState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchConversations = createAsyncThunk<
  ConversationItem[],
  void,
  { rejectValue: string }
>("conversation/fetchConversations", async (_, { rejectWithValue }) => {
  try {
    const response = await conversationService.getMyConversations();

    if (!response?.success) {
      return rejectWithValue(response?.message || "Fetch conversations failed");
    }

    return (response.data ?? []) as ConversationItem[];
  } catch {
    return rejectWithValue("Không thể tải danh sách hội thoại");
  }
});

const conversationSlice = createSlice({
  name: "conversation",
  initialState,
  reducers: {
    setConversations(state, action: PayloadAction<ConversationItem[]>) {
      state.items = action.payload;
    },
    updateLastMessage(
      state,
      action: PayloadAction<{
        conversationId: string;
        lastMessage: ConversationLastMessage;
        lastMessageAt?: string;
      }>,
    ) {
      const { conversationId, lastMessage, lastMessageAt } = action.payload;
      const index = state.items.findIndex((c) => c.conversationId === conversationId);
      if (index === -1) return;

      state.items[index].lastMessage = lastMessage;
      state.items[index].lastMessageAt = lastMessageAt ?? new Date().toISOString();

      const updated = state.items.splice(index, 1)[0];
      state.items.unshift(updated);
    },
    updateUnreadCount(
      state,
      action: PayloadAction<{ conversationId: string; unreadCount: number }>,
    ) {
      const { conversationId, unreadCount } = action.payload;
      const conversation = state.items.find((c) => c.conversationId === conversationId);
      if (!conversation) return;
      conversation.unreadCount = unreadCount;
    },
    updateConversationFromSocket(
      state,
      action: PayloadAction<{
        conversationId: string;
        lastMessage?: ConversationLastMessage;
        lastMessageAt?: string;
        unreadCount?: number;
      }>,
    ) {
      const { conversationId, lastMessage, lastMessageAt, unreadCount } = action.payload;
      const index = state.items.findIndex((c) => c.conversationId === conversationId);
      if (index === -1) return;

      const nextConversation = {
        ...state.items[index],
        lastMessage: lastMessage ?? state.items[index].lastMessage,
        lastMessageAt: lastMessageAt ?? state.items[index].lastMessageAt,
        unreadCount:
          unreadCount === undefined ? state.items[index].unreadCount : unreadCount,
      };

      state.items.splice(index, 1);
      state.items.unshift(nextConversation);
    },
    removeConversation(state, action: PayloadAction<{ conversationId: string }>) {
      state.items = state.items.filter(
        (c) => c.conversationId !== action.payload.conversationId,
      );
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Không thể tải danh sách hội thoại";
      });
  },
});

export const {
  setConversations,
  updateLastMessage,
  updateUnreadCount,
  updateConversationFromSocket,
  removeConversation,
} = conversationSlice.actions;

export default conversationSlice.reducer;
