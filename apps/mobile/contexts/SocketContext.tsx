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
  addConversationToTop,
} from "@/store/slices/conversationSlice";
import { logout2 } from "@/store/auth/authThunk";
import { ToastAndroid } from "react-native";
import { getDeviceId } from "@/utils/device.util";
import * as SecureStore from "expo-secure-store";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  markAsRead: (data: {
    userId: string;
    conversationId: string;
  }) => Promise<any>;
  markAsUnread: (data: {
    userId: string;
    conversationId: string;
  }) => Promise<any>;
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
  const [socketAuth, setSocketAuth] = useState<{
    token: string;
    deviceId: string;
  } | null>(null);
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const socketRef = useRef<Socket | null>(null);

  // Tự động đăng xuất khi bị cưỡng ép
  const handleForceLogout = (data: { message: string }) => {
    dispatch(logout2());
    ToastAndroid.show(
      data.message ||
        "Phiên đăng nhập đã hết hạn hoặc bạn bị đăng xuất từ nơi khác.",
      ToastAndroid.LONG,
    );

    socketRef.current?.disconnect();
  };

  const markAsRead = useCallback(
    async (data: { userId: string; conversationId: string }) => {
      if (!socketRef.current)
        return Promise.reject(new Error("Socket not connected"));

      return new Promise((resolve, reject) => {
        socketRef.current?.emit("mark_as_read", data, (response: any) => {
          if (response?.success) {
            resolve(response);
          } else {
            reject(response);
          }
        });
      });
    },
    [],
  );

  const markAsUnread = useCallback(
    async (data: { userId: string; conversationId: string }) => {
      if (!socketRef.current)
        return Promise.reject(new Error("Socket not connected"));

      return new Promise((resolve, reject) => {
        socketRef.current?.emit("mark_as_unread", data, (response: any) => {
          if (response?.success) {
            resolve(response);
          } else {
            reject(response);
          }
        });
      });
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;

    if (!user?.userId || !apiUrl) {
      setSocketAuth(null);
      return () => {
        isMounted = false;
      };
    }

    const loadSocketAuth = async () => {
      const token = await SecureStore.getItemAsync("access_token");
      const deviceId = await getDeviceId();

      if (!isMounted) return;

      if (!token || !deviceId) {
        setSocketAuth(null);
        return;
      }

      setSocketAuth({ token, deviceId });
    };

    void loadSocketAuth();

    return () => {
      isMounted = false;
    };
  }, [apiUrl, user?.userId]);

  useEffect(() => {
    if (!user?.userId || !apiUrl || !socketAuth) {
      socketRef.current?.disconnect();
      setSocket(null);
      setIsConnected(false);
      return;
    }

    if (!socketRef.current) {
      socketRef.current = io(apiUrl, {
        autoConnect: false,
        auth: socketAuth,
      });
    }

    const socketInstance = socketRef.current;
    socketInstance.auth = socketAuth;

    if (!socketInstance.connected) {
      socketInstance.connect();
    }

    setSocket(socketInstance);

    const onConnect = () => {
      console.log("Connected:", socketInstance.id);
      setIsConnected(true);
    };

    const onDisconnect = () => {
      console.log("Disconnected");
      setIsConnected(false);
    };

    const handleNewMessageSidebar = (data: any) => {
      dispatch(updateConversation(data));
    };

    const handleRecallMessageSidebar = (data: {
      conversationId: string;
      messageId: string;
    }) => {
      dispatch(updateRecallMessageInConversation(data));
    };

    const handleMessagesExpired = (data: {
      conversationId: string;
      messageIds: string[];
    }) => {
      dispatch(removeExpiredMessages(data.messageIds));
    };

    const handleMarkAsReadSuccess = (data: {
      conversationId: string;
      unreadCount: number;
    }) => {
      dispatch(
        setUnreadCount({
          conversationId: data.conversationId,
          unreadCount: data.unreadCount,
        }),
      );
    };

    const handleMarkAsUnreadSuccess = (data: {
      conversationId: string;
      unreadCount: number;
    }) => {
      dispatch(
        setUnreadCount({
          conversationId: data.conversationId,
          unreadCount: data.unreadCount,
        }),
      );
    };

    const handleMarkAsReadBroadcast = (data: {
      conversationId: string;
      unreadCount: number;
    }) => {
      dispatch(
        setUnreadCount({
          conversationId: data.conversationId,
          unreadCount: data.unreadCount,
        }),
      );
    };

    const handleMarkAsUnreadBroadcast = (data: {
      conversationId: string;
      unreadCount: number;
    }) => {
      dispatch(
        setUnreadCount({
          conversationId: data.conversationId,
          unreadCount: data.unreadCount,
        }),
      );
    };

    const handleConversationUnreadCountUpdate = (data: {
      conversationId: string;
      unreadCount: number;
    }) => {
      if (data.unreadCount !== undefined) {
        dispatch(
          setUnreadCount({
            conversationId: data.conversationId,
            unreadCount: data.unreadCount,
          }),
        );
      }
    };

    const handleConversationUpdate = (data: any) => {
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
      if ("unreadCount" in data) patch.unreadCount = data.unreadCount;

      dispatch(updateConversationSetting(patch));
    };

    const handleConversationDelete = (data: any) => {
      dispatch(removeConversation(data.conversationId));
    };

    const handleRemoveFromConversation = (data: {
      conversationId?: string;
    }) => {
      if (!data?.conversationId) return;
      dispatch(removeConversation(data.conversationId));
    };

    const handleNewConversation = (conversation: any) => {
      if (!conversation?.conversationId) return;

      socketInstance.emit("join_room", conversation.conversationId);
      dispatch(addConversationToTop(conversation));
    };

    const handleGroupDisbanded = (payload: any) => {
      const convId = payload?.conversationId || payload?.id;
      if (convId) {
        dispatch(removeConversation(convId));
      }
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

    socketInstance.on("connect", onConnect);
    socketInstance.on("disconnect", onDisconnect);
    socketInstance.on("mark_as_read:success", handleMarkAsReadSuccess);
    socketInstance.on("mark_as_unread:success", handleMarkAsUnreadSuccess);
    socketInstance.on("mark_as_read:broadcast", handleMarkAsReadBroadcast);
    socketInstance.on("mark_as_unread:broadcast", handleMarkAsUnreadBroadcast);
    socketInstance.on(
      "conversation:update",
      handleConversationUnreadCountUpdate,
    );
    socketInstance.on("new_message_sidebar", handleNewMessageSidebar);
    socketInstance.on("message_recalled_sidebar", handleRecallMessageSidebar);
    socketInstance.on("conversation_setting:update", handleConversationUpdate);
    socketInstance.on("conversation_setting:delete", handleConversationDelete);
    socketInstance.on("messages_expired", handleMessagesExpired);
    socketInstance.on(
      "removed_from_conversation",
      handleRemoveFromConversation,
    );
    socketInstance.on("new_conversation", handleNewConversation);
    socketInstance.on("group_disbanded", handleGroupDisbanded);
    socketInstance.on("group_settings_updated", handleGroupSettingsUpdate);
    socketInstance.on("group_updated", handleGroupUpdate);
    socketInstance.on("force_logout", handleForceLogout);

    return () => {
      socketInstance.off("connect", onConnect);
      socketInstance.off("disconnect", onDisconnect);
      socketInstance.off("mark_as_read:success", handleMarkAsReadSuccess);
      socketInstance.off("mark_as_unread:success", handleMarkAsUnreadSuccess);
      socketInstance.off("mark_as_read:broadcast", handleMarkAsReadBroadcast);
      socketInstance.off(
        "mark_as_unread:broadcast",
        handleMarkAsUnreadBroadcast,
      );
      socketInstance.off(
        "conversation:update",
        handleConversationUnreadCountUpdate,
      );
      socketInstance.off("new_message_sidebar", handleNewMessageSidebar);
      socketInstance.off(
        "message_recalled_sidebar",
        handleRecallMessageSidebar,
      );
      socketInstance.off(
        "conversation_setting:update",
        handleConversationUpdate,
      );
      socketInstance.off(
        "conversation_setting:delete",
        handleConversationDelete,
      );
      socketInstance.off("messages_expired", handleMessagesExpired);
      socketInstance.off(
        "removed_from_conversation",
        handleRemoveFromConversation,
      );
      socketInstance.off("new_conversation", handleNewConversation);
      socketInstance.off("group_disbanded", handleGroupDisbanded);
      socketInstance.off("group_settings_updated", handleGroupSettingsUpdate);
      socketInstance.off("group_updated", handleGroupUpdate);
      socketInstance.off("force_logout", handleForceLogout);
    };
  }, [apiUrl, dispatch, socketAuth, user?.userId]);

  return (
    <SocketContext.Provider
      value={{ socket, isConnected, markAsRead, markAsUnread }}
    >
      {children}
    </SocketContext.Provider>
  );
};
