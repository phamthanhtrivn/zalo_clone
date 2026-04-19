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
  setUnreadCount,
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
    if (!user?.userId) return;

    if (!socketRef.current) {
      socketRef.current = io(apiUrl, {
        transports: ["websocket"],
        auth: { userId: user.userId },
      });
    }

    const socketInstance = socketRef.current;
    setSocket(socketInstance);

    const onConnect = () => {
      console.log("Connected:", socketInstance.id);
      setIsConnected(true);
      socketInstance.emit("join", user.userId);
    };

    const onDisconnect = () => {
      console.log("Disconnected");
      setIsConnected(false);
    };

    const handleNewMessageSidebar = (data: any) => {
      console.log('sidebar data:', JSON.stringify(data)); // thêm dòng này
      dispatch(updateConversation(data));
    };

    const handleRecallMessageSidebar = (data: any) => {
      dispatch(updateRecallMessageInConversation(data));
    };
    const handleMessagesExpired = (data: { conversationId: string, messageIds: string[] }) => {
      dispatch(removeExpiredMessages(data.messageIds));

    };
    const handleConversationUpdate = (data: any) => {
      if (data.unreadCount !== undefined && Object.keys(data).length === 2) {
        console.log('Skip unreadCount broadcast from server');
        return;
      }
      const patch: Parameters<typeof updateConversationSetting>[0] = {
        conversationId: data.conversationId,
      };

      if ("pinned" in data) patch.pinned = data.pinned;
      if ("hidden" in data) patch.hidden = data.hidden;
      if ("mutedUntil" in data) {
        const isMuted = data.mutedUntil != null &&
          new Date(data.mutedUntil).getTime() > Date.now();
        patch.muted = isMuted;
        patch.mutedUntil = data.mutedUntil;
      }
      if ("category" in data) patch.category = data.category;
      if ("expireDuration" in data) patch.expireDuration = data.expireDuration;

      dispatch(updateConversationSetting(patch));
    };

    const handleConversationDelete = (data: any) => {
      dispatch(removeConversation(data.conversationId));
    };

    socketInstance.on("connect", onConnect);
    socketInstance.on("disconnect", onDisconnect);
    socketInstance.on("new_message_sidebar", handleNewMessageSidebar);
    socketInstance.on("message_recalled_sidebar", handleRecallMessageSidebar);
    socketInstance.on("conversation_setting:update", handleConversationUpdate);
    socketInstance.on("conversation_setting:delete", handleConversationDelete);
    socketInstance.on('messages_expired', handleMessagesExpired);

    return () => {
      socketInstance.off("connect", onConnect);
      socketInstance.off("disconnect", onDisconnect);
      socketInstance.off("new_message_sidebar", handleNewMessageSidebar);
      socketInstance.off("message_recalled_sidebar", handleRecallMessageSidebar);
      socketInstance.off("conversation_setting:update", handleConversationUpdate);
      socketInstance.off("conversation_setting:delete", handleConversationDelete);
      socketInstance.off('messages_expired', handleMessagesExpired);

    };
  }, [apiUrl, user?.userId, dispatch]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};