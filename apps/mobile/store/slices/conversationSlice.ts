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
  conversations: ConversationItemType[];
  replyingMessage: any | null;
  loading: boolean;
  error: string | null;
};

const initialState: ConversationState = {
  conversations: [],
  replyingMessage: null,
  loading: false,
  error: null,
};

// --- ASYNC THUNKS ---
export const fetchConversations = createAsyncThunk(
  "conversation/fetchConversations",
  async (_, { rejectWithValue }) => {
    try {
      const response: any = await conversationService.getMyConversations();
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
      state.conversations = action.payload;
    },

    // 2. Cập nhật Real-time
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
        // Cập nhật và đưa lên đầu danh sách
        const updated = {
          ...state.conversations[index],
          ...action.payload,
          // Nếu có lastMessage mới, cập nhật thêm lastMessageAt
          lastMessageAt:
            action.payload.lastMessageAt || new Date().toISOString(),
        };
        state.conversations.splice(index, 1);
        state.conversations.unshift(updated);
      } else {
        // Nếu hội thoại chưa có, thêm vào đầu
        state.conversations.unshift(action.payload as ConversationItemType);
      }
    },

    // 3. Cập nhật Cài đặt & Thông tin nhóm
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

      // Merge Group Settings
      if (action.payload.group !== undefined) {
        c.group = { ...(c.group || {}), ...action.payload.group };
      }
    },

    // 4. Tin nhắn hết hạn
    removeExpiredMessages(state, action: PayloadAction<string[]>) {
      state.conversations = state.conversations.map((c) => {
        if (c.lastMessage && action.payload.includes(c.lastMessage._id)) {
          return {
            ...c,
            lastMessage: {
              ...c.lastMessage,
              expired: true,
              content: {
                ...c.lastMessage.content,
                text: "Tin nhắn đã hết hạn",
              },
            },
            lastMessageAt: new Date().toISOString(),
          };
        }
        return c;
      });
    },

    // 5. Thu hồi tin nhắn
    updateRecallMessageInConversation(state, action) {
      const index = state.conversations.findIndex(
        (c) => c.conversationId === action.payload.conversationId,
      );
      if (index !== -1) {
        if (
          state.conversations[index].lastMessage?._id ===
          action.payload.messageId
        ) {
          state.conversations[index].lastMessage!.recalled = true;
        }
      }
    },

    // 6. Xóa hội thoại
    removeConversation(
      state,
      action: PayloadAction<string | { conversationId: string }>,
    ) {
      const id =
        typeof action.payload === "string"
          ? action.payload
          : action.payload.conversationId;
      state.conversations = state.conversations.filter(
        (c) => c.conversationId !== id,
      );
    },

    removeConversation(state, action: PayloadAction<string>) {
      state.conversations = state.conversations.filter(
        c => c.conversationId !== action.payload
      );
    },
    // conversationSlice.ts
    setUnreadCount(
      state,
      action: PayloadAction<{ conversationId: string; unreadCount: number }>,
    ) {
      const index = state.conversations.findIndex(
        (c) => c.conversationId === action.payload.conversationId
      );
      if (index !== -1) {
        // ✅ Tạo object mới để trigger re-render
        state.conversations[index] = {
          ...state.conversations[index],
          unreadCount: action.payload.unreadCount,
        };
      }
    },

    // 8. Quản lý Replying
    setReplyingMessage(state, action: PayloadAction<any | null>) {
      state.replyingMessage = action.payload;
    },
    clearReplyingMessage(state) {
      state.replyingMessage = null;
    },

    // 9. Thêm hội thoại mới lên đầu
    addConversationToTop: (state, action: PayloadAction<any>) => {
      const newConv = action.payload;
      const index = state.conversations.findIndex(
        (c) => c.conversationId === newConv.conversationId,
      );
      if (index !== -1) state.conversations.splice(index, 1);
      state.conversations = [newConv, ...state.conversations];
    },
  },

  // 10. Extra Reducers cho AsyncThunk
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.loading = false;
        state.conversations = action.payload || [];
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setConversations,
  updateConversation,
  updateConversationSetting,
  updateRecallMessageInConversation,
  removeConversation,
  removeExpiredMessages,
  setUnreadCount,
  setReplyingMessage,
  clearReplyingMessage,
  addConversationToTop,
} = conversationSlice.actions;

export default conversationSlice.reducer;
