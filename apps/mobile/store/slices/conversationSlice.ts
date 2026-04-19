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
  items: ConversationItemType[]; // Thống nhất dùng "items"
  replyingMessage: any | null;   // Khôi phục tính năng Reply
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
      const { conversationId, lastMessage, unreadCount, lastMessageAt } = action.payload;
      const index = state.items.findIndex((c) => c.conversationId === conversationId);

      if (index !== -1) {
        // Cập nhật và đưa lên đầu danh sách (Logic từ HEAD + Unshift)
        const updated = {
          ...state.items[index],
          lastMessage: lastMessage ?? state.items[index].lastMessage,
          unreadCount: unreadCount !== undefined ? unreadCount : state.items[index].unreadCount,
          lastMessageAt: lastMessageAt ?? new Date().toISOString(),
        };
        state.items.splice(index, 1);
        state.items.unshift(updated);
      }
    },

    // 3. Cập nhật Cài đặt (Ghim, Ẩn, Mute, Hẹn giờ xóa)
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
      }>
    ) {
      const c = state.items.find((i) => i.conversationId === action.payload.conversationId);
      if (!c) return;

      const p = action.payload;
      if (p.name !== undefined) c.name = p.name;
      if (p.avatar !== undefined) c.avatar = p.avatar;
      if (p.pinned !== undefined) c.pinned = p.pinned;
      if (p.hidden !== undefined) c.hidden = p.hidden;
      if (p.muted !== undefined) c.muted = p.muted;
      if (p.mutedUntil !== undefined) c.mutedUntil = p.mutedUntil;
      if (p.category !== undefined) c.category = p.category;
      if (p.expireDuration !== undefined) c.expireDuration = p.expireDuration;
      if (p.group !== undefined) c.group = { ...(c.group || {}), ...p.group };
    },

    // 4. Xử lý tin nhắn hết hạn (Khôi phục từ KhongVanTam)
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

    // 5. Thu hồi tin nhắn
    updateRecallMessageInConversation(state, action: PayloadAction<{ conversationId: string; messageId: string }>) {
      const { conversationId, messageId } = action.payload;
      const conversation = state.items.find((c) => c.conversationId === conversationId);
      if (conversation && conversation.lastMessage?._id === messageId) {
        conversation.lastMessage.recalled = true;
      }
    },

    // 6. Action bổ trợ Local (Khôi phục từ KhongVanTam)
    hideConversationLocal(state, action: PayloadAction<string>) {
      const c = state.items.find((i) => i.conversationId === action.payload);
      if (c) c.hidden = !c.hidden;
    },

    resetUnreadCount(state, action: PayloadAction<string>) {
      const c = state.items.find((i) => i.conversationId === action.payload);
      if (c) c.unreadCount = 0;
    },

    setUnreadCount(state, action: PayloadAction<{ conversationId: string; unreadCount: number }>) {
      const c = state.items.find((i) => i.conversationId === action.payload.conversationId);
      if (c) c.unreadCount = action.payload.unreadCount;
    },

    // 7. Thêm hội thoại mới lên đầu
    addConversationToTop: (state, action: PayloadAction<any>) => {
      const newConv = action.payload;
      const index = state.items.findIndex((c) => c.conversationId === newConv.conversationId);
      if (index !== -1) state.items.splice(index, 1);
      state.items = [newConv, ...state.items];
    },

    removeConversation(state, action: PayloadAction<{ conversationId: string } | string>) {
      const id = typeof action.payload === "string" ? action.payload : action.payload.conversationId;
      state.items = state.items.filter((c) => c.conversationId !== id);
    },

    // 8. Tính năng Reply (Khôi phục từ KhongVanTam)
    setReplyingMessage(state, action: PayloadAction<any | null>) {
      state.replyingMessage = action.payload;
    },

    clearReplyingMessage(state) {
      state.replyingMessage = null;
    },

    setCategoryLocal(state, action: PayloadAction<{ conversationId: string; category: ConversationCategory | null }>) {
      const c = state.items.find((i) => i.conversationId === action.payload.conversationId);
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