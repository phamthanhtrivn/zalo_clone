import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  removeConversation,
  removeExpiredMessages,
  setUnreadCount,
  updateConversation,
  updateConversationSetting,
  updateRecallMessageInConversation,
  updateUnreadStateInMessages,
} from "@/store/slices/conversationSlice";
import { updateReadReceipt } from "@/store/slices/messageSlice";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  markAsRead: (data: { userId: string; conversationId: string }) => Promise<any>;
  markAsUnread: (data: { userId: string; conversationId: string }) => Promise<any>;
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

  const handleMarkAsRead = useCallback(async (data: { userId: string; conversationId: string }) => {
    if (!socketRef.current) return;

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

  const handleMarkAsUnread = useCallback(async (data: { userId: string; conversationId: string }) => {
    if (!socketRef.current) return;

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
    if (!user?.userId) return;

    // create socket 1 lần
    if (!socketRef.current) {
      socketRef.current = io(apiUrl, {
        auth: {
          userId: user.userId,
        },
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
      console.log("SOCKET UPDATE", data);
      dispatch(updateConversation(data));
    };

    const handleRecallMessageSidebar = (data: {
      conversationId: string;
      messageId: string;
    }) => {
      dispatch(updateRecallMessageInConversation(data));
    };

    const handleMessagesExpired = (data: { conversationId: string, messageIds: string[] }) => {
      dispatch(removeExpiredMessages(data.messageIds));
    };
    const handleConversationUpdate = (data: any) => {
      const patch: any = { conversationId: data.conversationId };

      if ("pinned" in data) patch.pinned = data.pinned;
      if ("hidden" in data) patch.hidden = data.hidden;
      if ("mutedUntil" in data) {
        patch.muted = data.mutedUntil != null &&
          new Date(data.mutedUntil).getTime() > Date.now();
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
    const handleUnreadUpdate = (data: {
      conversationId: string;
      userId: string;
      lastReadMessageId: string | null;
    }) => {
      dispatch(updateUnreadStateInMessages(data));
    };
    const handleMessageRead = (data: {
      conversationId: string;
      messageId: string;
      userId: string;
      type: "read" | "unread";
    }) => {
      dispatch(updateReadReceipt(data));
    };
    const handleMarkAsReadSuccess = (data: {
      conversationId: string;
      unreadCount: number;
    }) => {
      console.log('✅ mark_as_read:success', data);
      dispatch(
        setUnreadCount({
          conversationId: data.conversationId,
          unreadCount: data.unreadCount,
        })
      );
    };
    const handleMarkAsReadBroadcast = (data: {
      conversationId: string;
      unreadCount: number;
    }) => {
      console.log('📢 mark_as_read:broadcast (from other tabs)', data);
      dispatch(
        setUnreadCount({
          conversationId: data.conversationId,
          unreadCount: data.unreadCount,
        })
      );
    };
    // ✅ THÊM: Handler cho mark_as_unread:success callback
    const handleMarkAsUnreadSuccess = (data: {
      conversationId: string;
      unreadCount: number;
    }) => {
      console.log('✅ mark_as_unread:success', data);
      dispatch(
        setUnreadCount({
          conversationId: data.conversationId,
          unreadCount: data.unreadCount,
        })
      );
    };
    const handleMarkAsUnreadBroadcast = (data: {
      conversationId: string;
      unreadCount: number;
    }) => {
      console.log('📢 mark_as_unread:broadcast (from other tabs)', data);
      dispatch(
        setUnreadCount({
          conversationId: data.conversationId,
          unreadCount: data.unreadCount,
        })
      );
    };
    // ✅ THÊM: Error handlers
    const handleMarkAsReadError = (data: {
      conversationId: string;
      message: string;
    }) => {
      console.error('❌ mark_as_read:error', data);
    };

    const handleMarkAsUnreadError = (data: {
      conversationId: string;
      message: string;
    }) => {
      console.error('❌ mark_as_unread:error', data);
    };
    socketInstance.on("message_read", handleMessageRead);

    // socketInstance.on("messages_unread_updated", handleUnreadUpdate);

    socketInstance.on("connect", onConnect);
    socketInstance.on("disconnect", onDisconnect);
    socketInstance.on('mark_as_read:success', handleMarkAsReadSuccess);
    socketInstance.on('mark_as_unread:success', handleMarkAsUnreadSuccess);
    socketInstance.on('mark_as_read:error', handleMarkAsReadError);
    socketInstance.on('mark_as_unread:error', handleMarkAsUnreadError);
    socketInstance.on('mark_as_read:broadcast', handleMarkAsReadBroadcast);
    socketInstance.on('mark_as_unread:broadcast', handleMarkAsUnreadBroadcast);

    socketInstance.on("new_message_sidebar", handleNewMessageSidebar);
    socketInstance.on("message_recalled_sidebar", handleRecallMessageSidebar);
    socketInstance.on('messages_expired', handleMessagesExpired);

    socketInstance.on(
      "conversation_setting:update",
      handleConversationUpdate,
    );

    socketInstance.on(
      "conversation_setting:delete",
      handleConversationDelete,
    );

    // cleanup
    return () => {
      socketInstance.off("connect", onConnect);
      socketInstance.off("disconnect", onDisconnect);
      socketInstance.off('mark_as_read:success', handleMarkAsReadSuccess);
      socketInstance.off('mark_as_unread:success', handleMarkAsUnreadSuccess);
      socketInstance.off('mark_as_read:error', handleMarkAsReadError);
      socketInstance.off('mark_as_unread:error', handleMarkAsUnreadError);
      socketInstance.off('mark_as_read:broadcast', handleMarkAsReadBroadcast);
      socketInstance.off('mark_as_unread:broadcast', handleMarkAsUnreadBroadcast);

      socketInstance.off("new_message_sidebar", handleNewMessageSidebar);
      socketInstance.off("message_recalled_sidebar", handleRecallMessageSidebar);

      socketInstance.off(
        "conversation_setting:update",
        handleConversationUpdate,
      );
      socketInstance.off(
        "conversation_setting:delete",
        handleConversationDelete,
      );
      socketInstance.off('messages_expired', handleMessagesExpired);
      socketInstance.off("message_read", handleMessageRead);
      socketInstance.off("messages_unread_updated", handleUnreadUpdate);
    };
  }, [apiUrl, user?.userId, dispatch]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, markAsRead: handleMarkAsRead, markAsUnread: handleMarkAsUnread }}>
      {children}
    </SocketContext.Provider>
  );
};
