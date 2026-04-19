import React, {
  createContext,
  useCallback,
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
  markAsRead: (data: { userId: string; conversationId: string }) => Promise<any>;
  markAsUnread: (data: { userId: string; conversationId: string }) => Promise<any>;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  markAsRead: async () => ({}),
  markAsUnread: async () => ({}),
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


  const handleNewMessageSidebar = (data: any) => {
    dispatch(updateConversation(data));
  };

  const handleRecallMessageSidebar = (data: {
    conversationId: string;
    messageId: string;
  }) => {
    dispatch(updateRecallMessageInConversation(data));
  };
  const markAsRead = useCallback(async (data: { userId: string; conversationId: string }) => {
    if (!socketRef.current) return Promise.reject(new Error('Socket not connected'));

    return new Promise((resolve, reject) => {
      socketRef.current?.emit('mark_as_read', data, (response: any) => {
        if (response?.success) {
          resolve(response);
        } else {
          reject(response);
        }
      });
    });
  }, []);

  // ✅ Thêm markAsUnread
  const markAsUnread = useCallback(async (data: { userId: string; conversationId: string }) => {
    if (!socketRef.current) return Promise.reject(new Error('Socket not connected'));

    return new Promise((resolve, reject) => {
      socketRef.current?.emit('mark_as_unread', data, (response: any) => {
        if (response?.success) {
          resolve(response);
        } else {
          reject(response);
        }
      });
    });
  }, []);
  useEffect(() => {
    if (!user?.userId || !apiUrl) return;

    if (!socketRef.current) {
      socketRef.current = io(apiUrl, {
        auth: {
          userId: user.userId,
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

    const handleNewMessageSidebar = (data: any) => {
      dispatch(updateConversation(data));
    };

    const handleRecallMessageSidebar = (data: any) => {
      dispatch(updateRecallMessageInConversation(data));
    };
    const handleMessagesExpired = (data: { conversationId: string, messageIds: string[] }) => {
      dispatch(removeExpiredMessages(data.messageIds));

    };
    // ✅ Lắng nghe mark_as_read:success
    const handleMarkAsReadSuccess = (data: { conversationId: string; unreadCount: number }) => {
      console.log('✅ mark_as_read:success', data);
      dispatch(setUnreadCount({
        conversationId: data.conversationId,
        unreadCount: data.unreadCount,
      }));
    };

    // ✅ Lắng nghe mark_as_unread:success
    const handleMarkAsUnreadSuccess = (data: { conversationId: string; unreadCount: number }) => {
      console.log('✅ mark_as_unread:success', data);
      dispatch(setUnreadCount({
        conversationId: data.conversationId,
        unreadCount: data.unreadCount,
      }));
    };

    // ✅ Lắng nghe broadcast từ các tab khác
    const handleMarkAsReadBroadcast = (data: { conversationId: string; unreadCount: number }) => {
      console.log('📢 mark_as_read:broadcast', data);
      dispatch(setUnreadCount({
        conversationId: data.conversationId,
        unreadCount: data.unreadCount,
      }));
    };

    const handleMarkAsUnreadBroadcast = (data: { conversationId: string; unreadCount: number }) => {
      console.log('📢 mark_as_unread:broadcast', data);
      dispatch(setUnreadCount({
        conversationId: data.conversationId,
        unreadCount: data.unreadCount,
      }));
    };


    const handleConversationUpdate = (data: any) => {
      console.log('📢 conversation:update received:', data);

      const patch: any = { conversationId: data.conversationId };

      if ("pinned" in data) patch.pinned = data.pinned;
      if ("hidden" in data) patch.hidden = data.hidden;
      if ("mutedUntil" in data) {
        patch.muted = data.mutedUntil != null && new Date(data.mutedUntil).getTime() > Date.now();
        patch.mutedUntil = data.mutedUntil;
      }
      if ("category" in data) patch.category = data.category;
      if ("expireDuration" in data) patch.expireDuration = data.expireDuration;
      if ("unreadCount" in data) {
        console.log('📢 unreadCount from broadcast:', data.unreadCount);
        patch.unreadCount = data.unreadCount;
      }

      dispatch(updateConversationSetting(patch));
    };

    const handleConversationDelete = (data: any) => {
      dispatch(removeConversation(data.conversationId));
    };
    socketInstance.on("mark_as_read:success", (data) => {
      console.log('🔴 [SOCKET] mark_as_read:success received:', data);
      handleMarkAsReadSuccess(data);
    });

    socketInstance.on("mark_as_unread:success", (data) => {
      console.log('🔴 [SOCKET] mark_as_unread:success received:', data);
      handleMarkAsUnreadSuccess(data);
    });

    socketInstance.on("mark_as_read:broadcast", (data) => {
      console.log('🔴 [SOCKET] mark_as_read:broadcast received:', data);
      handleMarkAsReadBroadcast(data);
    });

    socketInstance.on("mark_as_unread:broadcast", (data) => {
      console.log('🔴 [SOCKET] mark_as_unread:broadcast received:', data);
      handleMarkAsUnreadBroadcast(data);
    });
    // ✅ Backend emit 'conversation:update' khi mark_as_read/unread cho các member khác
    socketInstance.on("conversation:update", (data: { conversationId: string; unreadCount: number }) => {
      console.log('📢 [SOCKET] conversation:update received:', data);
      if (data.unreadCount !== undefined) {
        dispatch(setUnreadCount({
          conversationId: data.conversationId,
          unreadCount: data.unreadCount,
        }));
      }
    });
    socketInstance.on("new_message_sidebar", handleNewMessageSidebar);
    socketInstance.on("message_recalled_sidebar", handleRecallMessageSidebar);
    socketInstance.on("conversation_setting:update", handleConversationUpdate);
    socketInstance.on("conversation_setting:delete", handleConversationDelete);
    socketInstance.on('messages_expired', handleMessagesExpired);

    return () => {
      socketInstance.off("mark_as_read:success", handleMarkAsReadSuccess);
      socketInstance.off("mark_as_unread:success", handleMarkAsUnreadSuccess);
      socketInstance.off("mark_as_read:broadcast", handleMarkAsReadBroadcast);
      socketInstance.off("mark_as_unread:broadcast", handleMarkAsUnreadBroadcast);
      socketInstance.off("conversation:update");
      socketInstance.off("new_message_sidebar", handleNewMessageSidebar);
      socketInstance.off("message_recalled_sidebar", handleRecallMessageSidebar);
      socketInstance.off("conversation_setting:update", handleConversationUpdate);
      socketInstance.off("conversation_setting:delete", handleConversationDelete);
      socketInstance.off('messages_expired', handleMessagesExpired);
    };
  }, [apiUrl, user?.userId, dispatch]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, markAsRead, markAsUnread }}>
      {children}
    </SocketContext.Provider>
  );

};
