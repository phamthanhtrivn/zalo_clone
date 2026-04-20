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
  updateConversation,
  updateConversationSetting,
  updateRecallMessageInConversation,
  removeConversation,
  removeExpiredMessages,
  updateConversationFromSocket,
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
  const apiUrl = config.apiUrl;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const userId = user?.userId;

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
        auth: {
          userId: userId,
        },
      });
    }

    const socketInstance = socketRef.current;
    setSocket(socketInstance);

    // --- CÁC HANDLER SỰ KIỆN ---

    // 1. Kết nối / Ngắt kết nối
    socketInstance.on("connect", () => {
      console.log("Socket Connected:", socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("Socket Disconnected");
      setIsConnected(false);
    });

    // 2. Tin nhắn mới & Thu hồi 
    const handleNewMessageSidebar = (data: any) => {

      dispatch(updateConversation(data));
    };

    const handleRecallMessageSidebar = (data: any) => {
      dispatch(updateRecallMessageInConversation(data));
    };

    // 3. Tin nhắn hết hạn 
    const handleMessagesExpired = (data: {
      conversationId: string;
      messageIds: string[];
    }) => {
      dispatch(removeExpiredMessages(data.messageIds));
    };

    // 4. Cập nhật cài đặt cá nhân (Ghim, Ẩn, Tắt thông báo)
    const handleConversationUpdate = (data: any) => {
      if (data.unreadCount !== undefined && Object.keys(data).length === 2) {
        return; 
      }
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

    // 5. Quản lý hội thoại & Nhóm 
    const handleNewConversation = (conversation: any) => {
      if (!conversation?.conversationId) return;

      socketInstance.emit("join_room", conversation.conversationId);

      dispatch(updateConversation(conversation));
    };

    const handleRemoveConversation = (data: { conversationId: string }) => {
      dispatch(removeConversation(data.conversationId));
    };

    const handleGroupSettingsUpdate = (data: any) => {
      dispatch(
        updateConversationSetting({
          conversationId: data.conversationId,
          group: data.group, 
        }),
      );
    };

    const handleGroupUpdate = (data: any) => {
      dispatch(
        updateConversationSetting({
          conversationId: data.conversationId,
          name: data.name,
          avatar: data.avatar,
          group: data.group,
        }),
      );
    };

    socketInstance.on("new_message_sidebar", handleNewMessageSidebar);
    socketInstance.on("message_recalled_sidebar", handleRecallMessageSidebar);
    socketInstance.on("messages_expired", handleMessagesExpired);
    socketInstance.on("conversation_setting:update", handleConversationUpdate);

    socketInstance.on("conversation_setting:delete", handleRemoveConversation);
    socketInstance.on("removed_from_conversation", handleRemoveConversation);
    socketInstance.on("group_disbanded", handleRemoveConversation);

    socketInstance.on("new_conversation", handleNewConversation);
    socketInstance.on("group_settings_updated", handleGroupSettingsUpdate);
    socketInstance.on("group_updated", handleGroupUpdate);

    return () => {
      socketInstance.off("connect");
      socketInstance.off("disconnect");
      socketInstance.off("new_message_sidebar");
      socketInstance.off("message_recalled_sidebar");
      socketInstance.off("messages_expired");
      socketInstance.off("conversation_setting:update");
      socketInstance.off("conversation_setting:delete");
      socketInstance.off("removed_from_conversation");
      socketInstance.off("group_disbanded");
      socketInstance.off("new_conversation");
      socketInstance.off("group_settings_updated");
      socketInstance.off("group_updated");
    };
  }, [apiUrl, user?.userId, dispatch]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
