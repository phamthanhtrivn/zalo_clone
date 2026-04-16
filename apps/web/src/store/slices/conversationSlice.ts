import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type {
  ConversationItemType,
  ConversationCategory,
} from "@/types/conversation-item.type";
import { conversationService } from "@/services/conversation.service";

type ConversationState = {
  conversations: ConversationItemType[];
  isLoading: boolean;
  error: string | null;
};

const initialState: ConversationState = {
  conversations: [],
  isLoading: false,
  error: null,
};

// --- ASYNC THUNKS ---
export const fetchConversations = createAsyncThunk(
  "conversation/fetchConversations",
  async (_, { rejectWithValue }) => {
    try {
      const response = await conversationService.getMyConversations();
      if (response.success) return response.data;
      return rejectWithValue(response.message);
    } catch (error: any) {
      return rejectWithValue(
        error.message || "Không thể tải danh sách hội thoại",
      );
    }
  },
);

const conversationSlice = createSlice({
  name: "conversation",
  initialState,
  reducers: {
    setConversations(state, action: PayloadAction<ConversationItemType[]>) {
      state.conversations = action.payload;
    },

    // Thêm hội thoại mới lên đầu danh sách (dùng khi bắt đầu chat với người mới)
    addConversationToTop(state, action: PayloadAction<ConversationItemType>) {
      const exists = state.conversations.find(
        (c) => c.conversationId === action.payload.conversationId,
      );
      if (!exists) {
        state.conversations.unshift(action.payload);
      }
    },

    // Cập nhật thông tin hội thoại và đưa lên đầu (dùng cho tin nhắn mới/socket)
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
      }
    },

    // Alias cho updateConversation để phục vụ logic Socket em đã viết
    updateConversationFromSocket(state, action: PayloadAction<any>) {
      const { conversationId, lastMessage, unreadCount, lastMessageAt } =
        action.payload;
      const index = state.conversations.findIndex(
        (c) => c.conversationId === conversationId,
      );

      if (index !== -1) {
        const updated = {
          ...state.conversations[index],
          lastMessage: lastMessage ?? state.conversations[index].lastMessage,
          unreadCount:
            unreadCount !== undefined
              ? unreadCount
              : state.conversations[index].unreadCount,
          lastMessageAt: lastMessageAt ?? new Date().toISOString(),
        };
        state.conversations.splice(index, 1);
        state.conversations.unshift(updated);
      }
    },

    // Cập nhật các cài đặt: Ghim, Ẩn, Tắt thông báo, Hẹn giờ xóa
    updateConversationSetting(
      state,
      action: PayloadAction<{
        conversationId: string;
        name?: string;
        avatar?: string;
        pinned?: boolean;
        hidden?: boolean;
        muted?: boolean;
        mutedUntil?: string | null;
        category?: ConversationCategory | null;
        expireDuration?: number;
        group?: any;
      }>,
    ) {
      const c = state.conversations.find(
        (c) => c.conversationId === action.payload.conversationId,
      );
      if (!c) return;

      if (action.payload.name !== undefined) c.name = action.payload.name;
      if (action.payload.avatar !== undefined) c.avatar = action.payload.avatar;

      if (action.payload.pinned !== undefined) c.pinned = action.payload.pinned;
      if (action.payload.hidden !== undefined) c.hidden = action.payload.hidden;
      if (action.payload.muted !== undefined) c.muted = action.payload.muted;
      if (action.payload.mutedUntil !== undefined)
        c.mutedUntil = action.payload.mutedUntil;
      if (action.payload.category !== undefined)
        c.category = action.payload.category;
      if (action.payload.expireDuration !== undefined)
        c.expireDuration = action.payload.expireDuration;
      if (action.payload.group !== undefined) {
        c.group = { ...c.group, ...action.payload.group };
      }
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

    removeConversation(
      state,
      action: PayloadAction<{ conversationId: string } | string>,
    ) {
      const id =
        typeof action.payload === "string"
          ? action.payload
          : action.payload.conversationId;
      state.conversations = state.conversations.filter(
        (c) => c.conversationId !== id,
      );
    },

    resetUnreadCount(state, action: PayloadAction<string>) {
      const c = state.conversations.find(
        (c) => c.conversationId === action.payload,
      );
      if (c) c.unreadCount = 0;
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
        state.error = action.payload as string;
      });
  },
});

export const {
  setConversations,
  addConversationToTop,
  updateConversation,
  updateConversationFromSocket,
  updateConversationSetting,
  setCategoryLocal,
  removeConversation,
  resetUnreadCount,
  updateRecallMessageInConversation,
} = conversationSlice.actions;

export default conversationSlice.reducer;
