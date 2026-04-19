import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { config } from "@/constants/config";
import {
  fetchConversations, // Khôi phục import từ nhánh Tùng để dùng làm fallback
  removeConversation,
  updateConversationFromSocket,
  updateConversationSetting,
  updateRecallMessageInConversation,
  addConversationToTop,
  removeExpiredMessages,
} from "@/store/slices/conversationSlice";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const userId = user?.userId;
    const apiUrl = config.apiUrl;

    if (!userId || !apiUrl) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setIsConnected(false);
      return;
    }

    if (!socketRef.current) {
      socketRef.current = io(apiUrl, {
        transports: ["websocket"],
        auth: { userId },
      });
    }

    const socketInstance = socketRef.current;
    setSocket(socketInstance);

    // --- CÁC HÀM XỬ LÝ SỰ KIỆN (HANDLERS) ---

    // 1. Cập nhật Sidebar khi có tin nhắn mới
    const handleNewMessageSidebar = (data: any) => {
      if (!data?.conversationId) return;

      const lastMessage = data?.lastMessage
        ? data.lastMessage
        : {
            _id: data?._id,
            senderName:
              data?.senderId?._id === userId
                ? "Bạn"
                : data?.senderId?.profile?.name || "Người dùng",
            content: data?.content ?? {},
            recalled: Boolean(data?.recalled),
            type: data?.type,
          };

      dispatch(
        updateConversationFromSocket({
          conversationId: data.conversationId,
          lastMessage,
          unreadCount: data.unreadCount,
          lastMessageAt:
            data.lastMessageAt || data.createdAt || new Date().toISOString(),
        }),
      );
    };

    // 2. Thu hồi tin nhắn
    const handleRecallMessageSidebar = (data: {
      conversationId: string;
      messageId: string;
    }) => {
      dispatch(updateRecallMessageInConversation(data));
    };

    // 3. Tin nhắn hết hạn (Giữ lại từ develop)
    const handleMessagesExpired = (data: {
      conversationId: string;
      messageIds: string[];
    }) => {
      dispatch(removeExpiredMessages(data.messageIds));
    };

    // 4. Cập nhật cài đặt hội thoại
    const handleConversationUpdate = (data: any) => {
      // Guard logic từ develop: tránh loop unreadCount
      if (data.unreadCount !== undefined && Object.keys(data).length === 2)
        return;

      const patch: any = { conversationId: data.conversationId };
      if ("pinned" in data) patch.pinned = data.pinned;
      if ("hidden" in data) patch.hidden = data.hidden;
      if ("mutedUntil" in data) {
        patch.muted =
          data.mutedUntil != null &&
          new Date(data.mutedUntil).getTime() > Date.now();
        patch.mutedUntil = data.mutedUntil;
      }
      if ("category" in data) patch.category = data.category;
      if ("expireDuration" in data) patch.expireDuration = data.expireDuration;

      dispatch(updateConversationSetting(patch));
    };

    // 5. Hội thoại mới (Hợp nhất logic Join Room của Tùng)
    const handleNewConversation = (conversation: any) => {
      if (!conversation?.conversationId) return;
      // Sử dụng socketRef để đảm bảo an toàn instance
      socketRef.current?.emit("join_room", conversation.conversationId);
      dispatch(addConversationToTop(conversation));
    };

    // 6. Xử lý xóa/rời nhóm (Khôi phục logic chặt chẽ của Tùng)
    const handleRemoveFromConversation = (data: {
      conversationId?: string;
    }) => {
      if (!data?.conversationId) return;
      dispatch(removeConversation(data.conversationId));
      // Fallback: Đồng bộ lại danh sách nếu cần (Optional)
      // dispatch(fetchConversations(userId));
    };

    const handleGroupDisbanded = (payload: any) => {
      const convId = payload?.conversationId || payload?.id;
      if (convId) dispatch(removeConversation(convId));
    };

    const handleGroupSettingsUpdate = (data: any) => {
      dispatch(
        updateConversationSetting({
          conversationId: data.conversationId,
          group: data.group,
        }),
      );
    };

    // --- ĐĂNG KÝ SỰ KIỆN ---
    socketInstance.on("connect", () => setIsConnected(true));
    socketInstance.on("disconnect", () => setIsConnected(false));
    socketInstance.on("new_message_sidebar", handleNewMessageSidebar);
    socketInstance.on("message_recalled_sidebar", handleRecallMessageSidebar);
    socketInstance.on("messages_expired", handleMessagesExpired);
    socketInstance.on("conversation_setting:update", handleConversationUpdate);
    socketInstance.on("conversation_setting:delete", (data) =>
      dispatch(removeConversation(data.conversationId)),
    );
    socketInstance.on(
      "removed_from_conversation",
      handleRemoveFromConversation,
    );
    socketInstance.on("new_conversation", handleNewConversation);
    socketInstance.on("group_disbanded", handleGroupDisbanded);
    socketInstance.on("group_settings_updated", handleGroupSettingsUpdate);
    socketInstance.on("group_updated", (data: any) => {
      dispatch(
        updateConversationSetting({
          conversationId: data.conversationId,
          name: data.name,
          avatar: data.avatar,
          group: data.group,
        }),
      );
    });

    // --- HỦY ĐĂNG KÝ (CLEANUP) ---
    return () => {
      socketInstance.off("connect");
      socketInstance.off("disconnect");
      socketInstance.off("new_message_sidebar", handleNewMessageSidebar);
      socketInstance.off(
        "message_recalled_sidebar",
        handleRecallMessageSidebar,
      );
      socketInstance.off("messages_expired", handleMessagesExpired);
      socketInstance.off(
        "conversation_setting:update",
        handleConversationUpdate,
      );
      socketInstance.off("conversation_setting:delete");
      socketInstance.off(
        "removed_from_conversation",
        handleRemoveFromConversation,
      );
      socketInstance.off("new_conversation", handleNewConversation);
      socketInstance.off("group_disbanded", handleGroupDisbanded);
      socketInstance.off("group_settings_updated", handleGroupSettingsUpdate);
      socketInstance.off("group_updated");
    };
  }, [dispatch, user?.userId]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
