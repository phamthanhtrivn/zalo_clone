import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAppDispatch, useAppSelector } from "@/store";
import { updateConversation } from "@/store/slices/conversationSlice";

const CURRENT_USER_ID = "699d2b94f9075fe800282901";

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

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(apiUrl);
    }

    const socketInstance = socketRef.current;
    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      console.log("Connected to WebSocket server");
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("Disconnected from WebSocket server");
      setIsConnected(false);
    });

    // Global listener for sidebar updates
    socketInstance.on("new_message_sidebar", handleNewMessageSidebar);

    socketInstance.on(
      "message_recalled_sidebar",
      (data: { conversationId: string; messageId: string }) => {
        // dispatch(
        //   updateLastMessage({
        //     conversationId: data.conversationId,
        //     lastMessage: {
        //       senderName: "", // The UI handles recalled messages differently
        //       content: { text: "Tin nhắn đã được thu hồi" },
        //       recalled: true,
        //       createdAt: new Date().toISOString(),
        //     },
        //   }),
        // );
      },
    );

    setSocket(socketInstance);

    return () => {
      socketInstance.off("new_message_sidebar", handleNewMessageSidebar);
      socketInstance.off("message_recalled_sidebar");
    };
  }, [apiUrl, dispatch]);

  useEffect(() => {
    // if (socket && user?._id) {
    if (socket && CURRENT_USER_ID) {
      // socket.emit("join_user_room", user._id);
      socket.emit("join_user_room", CURRENT_USER_ID);
    }
  }, [socket, user?._id]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
