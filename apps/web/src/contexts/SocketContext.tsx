import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  updateConversation,
  updateRecallMessageInConversation,
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
  const apiUrl = import.meta.env.VITE_API_URL;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const socketRef = useRef<Socket | null>(null);

  const handleNewMessageSidebar = (data: any) => {
    dispatch(updateConversation(data));
  };

  const handleRecallMessageSidebar = (data: {
    conversationId: string;
    messageId: string;
  }) => {
    dispatch(updateRecallMessageInConversation(data));
  };

  useEffect(() => {
    // 🔥 chỉ connect khi có user
    if (!user?.userId) return;

    if (!socketRef.current) {
      socketRef.current = io(apiUrl, {
        auth: {
          userId: user.userId,
          // userId: currentUserId,
        },
      });
    }

    const socketInstance = socketRef.current;
    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      console.log("Connected:", socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("Disconnected");
      setIsConnected(false);
    });

    socketInstance.on("new_message_sidebar", handleNewMessageSidebar);
    socketInstance.on("message_recalled_sidebar", handleRecallMessageSidebar);

    return () => {
      socketInstance.off("new_message_sidebar", handleNewMessageSidebar);
      socketInstance.off(
        "message_recalled_sidebar",
        handleRecallMessageSidebar,
      );
    };
  }, [
    apiUrl,
    dispatch,

    user?.userId
  ]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
