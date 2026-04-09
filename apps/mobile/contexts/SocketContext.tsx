import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { config } from "@/constants/config";
import {
  fetchConversations,
  removeConversation,
  updateConversationFromSocket,
} from "@/store/slices/conversationSlice";

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
};

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
    if (!userId || !config.apiUrl) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setIsConnected(false);
      return;
    }

    if (!socketRef.current) {
      socketRef.current = io(config.apiUrl, {
        transports: ["websocket"],
        auth: { userId },
      });
    }

    const socketInstance = socketRef.current;
    setSocket(socketInstance);

    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleNewMessageSidebar = (data: any) => {
      if (!data?.conversationId) return;

      const lastMessage = data?.lastMessage
        ? data.lastMessage
        : {
            _id: data?._id,
            senderName:
              data?.senderId?._id === userId ? "Bạn" : data?.senderId?.profile?.name,
            content: data?.content ?? {},
            recalled: Boolean(data?.recalled),
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

    const handleNewConversation = () => {
      dispatch(fetchConversations());
    };

    const handleRemovedFromConversation = (data: { conversationId?: string }) => {
      if (!data?.conversationId) return;
      dispatch(removeConversation({ conversationId: data.conversationId }));
    };

    socketInstance.on("connect", handleConnect);
    socketInstance.on("disconnect", handleDisconnect);
    socketInstance.on("new_message_sidebar", handleNewMessageSidebar);
    socketInstance.on("new_conversation", handleNewConversation);
    socketInstance.on("removed_from_conversation", handleRemovedFromConversation);

    return () => {
      socketInstance.off("connect", handleConnect);
      socketInstance.off("disconnect", handleDisconnect);
      socketInstance.off("new_message_sidebar", handleNewMessageSidebar);
      socketInstance.off("new_conversation", handleNewConversation);
      socketInstance.off("removed_from_conversation", handleRemovedFromConversation);
    };
  }, [dispatch, user?.userId]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

