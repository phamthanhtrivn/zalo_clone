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
  loading: boolean;
  error: string | null;
};

const initialState: ConversationState = {
  items: [],
  loading: false,
  error: null,
};

// --- ASYNC THUNKS (Dùng để fetch dữ liệu khi mở App) ---
export const fetchConversations = createAsyncThunk(
  "conversation/fetchConversations",
  async (_, { rejectWithValue }) => {
    try {
      const response = await conversationService.getMyConversations();
      // Chú ý: response trả về từ Service đã qua Interceptor nên thường là object chứa .success
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
      } else {
        // Nếu hội thoại chưa có trong danh sách (người lạ nhắn tin), có thể gọi fetch lại hoặc push vào
        // Tạm thời để dispatch fetch lại bên SocketContext cho an toàn
      }
    },

    // 3. Cập nhật Cài đặt (Ghim, Ẩn, Tắt thông báo)
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
        group?: any;
      }>,
    ) {
      const c = state.items.find(
        (i) => i.conversationId === action.payload.conversationId,
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
      if (action.payload.group !== undefined) {
        c.group = {
          ...(c.group || {}),
          ...action.payload.group,
        };
      }
    },

    // 4. Thu hồi tin nhắn cuối cùng (Cập nhật text ở Sidebar)
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

    // 5. Xóa hội thoại khỏi danh sách
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

    // 6. Các action bổ trợ khác
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

    resetUnreadCount(state, action: PayloadAction<string>) {
      const c = state.items.find((i) => i.conversationId === action.payload);
      if (c) c.unreadCount = 0;
    },
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
  setCategoryLocal,
  resetUnreadCount,
  addConversationToTop,
} = conversationSlice.actions;

export default conversationSlice.reducer;
