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

// --- TYPES ---
type ConversationState = {
  items: ConversationItemType[];
  replyingMessage: any | null;
  loading: boolean;
  error: string | null;
};

const initialState: ConversationState = {
  items: [],
  replyingMessage: null,
  loading: false,
  error: null,
};

// --- ASYNC THUNKS ---
export const fetchConversations = createAsyncThunk(
  "conversation/fetchConversations",
  async (_, { rejectWithValue }) => {
    try {
      const response = await conversationService.getMyConversations();
      if (response?.success) return response.data;
      return rejectWithValue(response?.message || "Lỗi tải dữ liệu");
    } catch (error: any) {
      return rejectWithValue(error.message || "Không thể kết nối đến server");
    }
  },
);

const conversationSlice = createSlice({
  name: "conversation",
  initialState,
  reducers: {
    // 1. Cập nhật toàn bộ danh sách
    setConversations(state, action: PayloadAction<ConversationItemType[]>) {
      state.items = action.payload;
    },

    // 2. Cập nhật Real-time từ Socket (Dùng cho tin nhắn mới/cuộc gọi)
    updateConversationFromSocket(state, action: PayloadAction<any>) {
      const { conversationId, lastMessage, unreadCount, lastMessageAt } =
        action.payload;
      const index = state.items.findIndex(
        (c) => c.conversationId === conversationId,
      );

      if (index !== -1) {
        // Cập nhật và đưa lên đầu danh sách
        const updated = {
          ...state.items[index],
          lastMessage: lastMessage ?? state.items[index].lastMessage,
          unreadCount:
            unreadCount !== undefined
              ? unreadCount
              : state.items[index].unreadCount,
          lastMessageAt: lastMessageAt ?? new Date().toISOString(),
        };
        state.items.splice(index, 1);
        state.items.unshift(updated);
      }
    },

    // 3. Cập nhật Cài đặt (Ghim, Ẩn, Tắt thông báo, Hẹn giờ xóa)
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
      const c = state.items.find(
        (i) => i.conversationId === action.payload.conversationId,
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
        c.group = {
          ...(c.group || {}),
          ...action.payload.group,
        };
      }
    },

    // 4. Xử lý tin nhắn hết hạn
    removeExpiredMessages(state, action: PayloadAction<string[]>) {
      for (const c of state.items) {
        if (c.lastMessage && action.payload.includes(c.lastMessage._id)) {
          c.lastMessage = {
            ...c.lastMessage,
            expired: true,
            content: {
              ...c.lastMessage.content,
              text: "Tin nhắn đã hết hạn",
            },
          };
        }
      }
    },

    // 5. Thu hồi tin nhắn cuối cùng (Sidebar)
    updateRecallMessageInConversation(
      state,
      action: PayloadAction<{ conversationId: string; messageId: string }>,
    ) {
      const { conversationId, messageId } = action.payload;
      const conversation = state.items.find(
        (c) => c.conversationId === conversationId,
      );
      if (conversation && conversation.lastMessage?._id === messageId) {
        conversation.lastMessage.recalled = true;
      }
    },

    // 6. Ẩn hội thoại local
    hideConversationLocal(state, action: PayloadAction<string>) {
      const c = state.items.find((i) => i.conversationId === action.payload);
      if (c) c.hidden = !c.hidden;
    },

    // 7. Xóa hội thoại khỏi danh sách
    removeConversation(
      state,
      action: PayloadAction<{ conversationId: string } | string>,
    ) {
      const id =
        typeof action.payload === "string"
          ? action.payload
          : action.payload.conversationId;
      state.items = state.items.filter((c) => c.conversationId !== id);
    },

    // 8. Quản lý tin nhắn chưa đọc
    resetUnreadCount(state, action: PayloadAction<string>) {
      const c = state.items.find((i) => i.conversationId === action.payload);
      if (c) c.unreadCount = 0;
    },

    setUnreadCount(
      state,
      action: PayloadAction<{ conversationId: string; unreadCount: number }>,
    ) {
      const c = state.items.find(
        (i) => i.conversationId === action.payload.conversationId,
      );
      if (c) c.unreadCount = action.payload.unreadCount;
    },

    // 9. Thêm hội thoại mới lên đầu
    addConversationToTop: (state, action: PayloadAction<any>) => {
      const newConv = action.payload;
      const index = state.items.findIndex(
        (c) => c.conversationId === newConv.conversationId,
      );
      if (index !== -1) {
        state.items.splice(index, 1);
      }
      state.items = [newConv, ...state.items];
    },

    // 10. Tính năng Reply
    setReplyingMessage(state, action: PayloadAction<any | null>) {
      state.replyingMessage = action.payload;
    },

    clearReplyingMessage(state) {
      state.replyingMessage = null;
    },

    setCategoryLocal(
      state,
      action: PayloadAction<{
        conversationId: string;
        category: ConversationCategory | null;
      }>,
    ) {
      const c = state.items.find(
        (i) => i.conversationId === action.payload.conversationId,
      );
      if (c) c.category = action.payload.category;
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
        state.items = action.payload || [];
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setConversations,
  updateConversationFromSocket,
  updateConversationSetting,
  updateRecallMessageInConversation,
  removeConversation,
  removeExpiredMessages,
  setUnreadCount,
  setReplyingMessage,
  clearReplyingMessage,
  hideConversationLocal,
  resetUnreadCount,
  addConversationToTop,
  setCategoryLocal,
} = conversationSlice.actions;

export default conversationSlice.reducer;
