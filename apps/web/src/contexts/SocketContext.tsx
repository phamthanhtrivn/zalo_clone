import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAppDispatch, useAppSelector, type RootState } from "@/store";
import {
  addConversationToTop,
  fetchConversations,
  removeConversation,
  removeExpiredMessages,
  setUnreadCount,
  updateConversation,
  updateConversationFromSocket,
  updateConversationSetting,
  updateRecallMessageInConversation,
  updateUnreadStateInMessages,
} from "@/store/slices/conversationSlice";
import { updateReadReceipt } from "@/store/slices/messageSlice";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "react-toastify";
import { clearAuth } from "@/store/auth/authSlice";
import { getDeviceId } from "@/utils/device.util";

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

// BUG-5 fix: SocketProvider nằm NGOÀI <Router> nên không thể dùng useNavigate().
// Dùng window.history.pushState + popstate event để React Router v6 tự detect URL change.
const navigateTo = (path: string) => {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const fetchingRef = useRef<Set<string>>(new Set());

  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  // BUG-4 fix: lấy accessToken từ auth state để gửi kèm khi kết nối socket
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const socketRef = useRef<Socket | null>(null);

  // SMELL fix: conversationsRef để tránh stale closure trong handler
  const conversations = useAppSelector(
    (state: RootState) => state.conversation.conversations,
  );
  const conversationsRef = useRef(conversations);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // State phục vụ thông báo giải tán nhóm
  const [groupDisbandedDialogOpen, setGroupDisbandedDialogOpen] =
    useState(false);
  const [, setGroupDisbandedConversationId] = useState<string>("");

  const handleMarkAsRead = useCallback(
    async (data: { userId: string; conversationId: string }) => {
      if (!socketRef.current) return;

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

  const handleMarkAsUnread = useCallback(
    async (data: { userId: string; conversationId: string }) => {
      if (!socketRef.current) return;

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

  // Tự động đăng xuất khi bị cưỡng ép
  const handleForceLogout = (data: { message: string }) => {
    toast.info(
      data.message ||
        "Phiên đăng nhập đã hết hạn hoặc bạn bị đăng xuất từ nơi khác.",
    );
    dispatch(clearAuth());

    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  // --- INITIALIZE SOCKET ---
  useEffect(() => {
    if (!user?.userId || !accessToken) return;

    // BUG-4 fix: tạo socket 1 lần với đủ token + deviceId
    if (!socketRef.current) {
      socketRef.current = io(apiUrl, {
        auth: {
          token: accessToken,      // ✅ Backend yêu cầu JWT token
          deviceId: getDeviceId(), // ✅ Backend yêu cầu deviceId
        },
      });
    }

    const socketInstance = socketRef.current;
    setSocket(socketInstance);

    // --- SOCKET HANDLERS ---
    const onConnect = () => {
      console.log("Connected:", socketInstance.id);
      setIsConnected(true);
      socketInstance.emit("join", user.userId);
    };

    const onDisconnect = () => setIsConnected(false);

    // 1. Nhận hội thoại mới
    const handleNewConversation = (conversation: any) => {
      if (!conversation?.conversationId) return;
      socketInstance.emit("join_room", conversation.conversationId);
      dispatch(addConversationToTop(conversation));
    };

    // 2. Cập nhật Sidebar khi có tin nhắn mới
    const handleNewMessageSidebar = (data: any) => {
      if (!data?.conversationId) return;
      const conversationId = data.conversationId;

      // SMELL fix: dùng conversationsRef thay vì conversations để tránh stale closure
      const existsInStore = conversationsRef.current.some(
        (c) => c.conversationId === conversationId,
      );

      if (!existsInStore) {
        if (!fetchingRef.current.has(conversationId)) {
          fetchingRef.current.add(conversationId);
          dispatch(fetchConversations())
            .then(() => fetchingRef.current.delete(conversationId))
            .catch(() => fetchingRef.current.delete(conversationId));
        }
        return;
      }

      const senderName =
        data?.lastMessage?.senderName ??
        (data?.senderId?._id === user?.userId
          ? "Bạn"
          : data?.senderId?.profile?.name || "");

      const lastMessage = data?.lastMessage
        ? data.lastMessage
        : {
            _id: data?._id,
            senderName,
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

    // 3. Thu hồi tin nhắn
    const handleRecallMessageSidebar = (data: {
      conversationId: string;
      messageId: string;
    }) => {
      dispatch(updateRecallMessageInConversation(data));
    };

    // 4. Tin nhắn hết hạn
    const handleMessagesExpired = (data: {
      conversationId: string;
      messageIds: string[];
    }) => {
      dispatch(removeExpiredMessages(data.messageIds));
    };

    // 5. Cập nhật Cài đặt hội thoại
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

    // 6. Xóa hội thoại
    const handleConversationDelete = (data: any) => {
      dispatch(removeConversation({ conversationId: data.conversationId }));
    };

    // 7. Read / Unread / Receipts
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

    const handleMarkAsReadError = (data: {
      conversationId: string;
      message: string;
    }) => {
      console.error("❌ mark_as_read:error", data);
    };

    const handleMarkAsUnreadError = (data: {
      conversationId: string;
      message: string;
    }) => {
      console.error("❌ mark_as_unread:error", data);
    };

    // 8. Group Events
    const handleGroupSettingsUpdate = (data: any) => {
      dispatch(
        updateConversationSetting({
          conversationId: data.conversationId,
          group: data.group,
        }),
      );
    };

    const handleGroupUpdated = (data: any) => {
      dispatch(
        updateConversationSetting({
          conversationId: data.conversationId,
          name: data.name,
          avatar: data.avatar,
          group: data.group,
        }),
      );
    };

    const handleMemberUpdated = () => {
      dispatch(fetchConversations());
    };

    // BUG-5 fix: Thay alert() + window.location.href bằng toast + navigateTo()
    const handleRemovedFromConversation = (payload: any) => {
      const conversationId = payload?.conversationId;
      if (!conversationId) return;

      dispatch(removeConversation({ conversationId }));

      const currentPath = window.location?.pathname || "";
      if (currentPath.includes(conversationId)) {
        toast.info("Bạn không còn là thành viên của nhóm này.");
        navigateTo("/");
      }
    };

    const handleGroupDisbanded = (payload: any) => {
      const conversationId = payload?.conversationId || payload?.id;
      if (!conversationId) return;

      dispatch(removeConversation({ conversationId }));
      setGroupDisbandedConversationId(conversationId);
      setGroupDisbandedDialogOpen(true);
    };

    // Đăng ký các Listener (mỗi event chỉ đăng ký 1 lần)
    socketInstance.on("connect", onConnect);
    socketInstance.on("disconnect", onDisconnect);
    socketInstance.on("mark_as_read:success", handleMarkAsReadSuccess);
    socketInstance.on("mark_as_unread:success", handleMarkAsUnreadSuccess);
    socketInstance.on("mark_as_read:error", handleMarkAsReadError);
    socketInstance.on("mark_as_unread:error", handleMarkAsUnreadError);
    socketInstance.on("mark_as_read:broadcast", handleMarkAsReadBroadcast);
    socketInstance.on("mark_as_unread:broadcast", handleMarkAsUnreadBroadcast);

    socketInstance.on("new_conversation", handleNewConversation);
    socketInstance.on("new_message_sidebar", handleNewMessageSidebar);
    socketInstance.on("message_recalled_sidebar", handleRecallMessageSidebar);
    socketInstance.on("messages_expired", handleMessagesExpired);

    socketInstance.on("message_read", handleMessageRead);
    socketInstance.on("messages_unread_updated", handleUnreadUpdate);

    socketInstance.on("conversation_setting:update", handleConversationUpdate);
    socketInstance.on("conversation_setting:delete", handleConversationDelete);

    socketInstance.on("group_disbanded", handleGroupDisbanded);
    socketInstance.on("removed_from_conversation", handleRemovedFromConversation);
    socketInstance.on("group_settings_updated", handleGroupSettingsUpdate);
    socketInstance.on("group_updated", handleGroupUpdated);
    socketInstance.on("member_updated", handleMemberUpdated);
    socketInstance.on("role_updated", handleMemberUpdated);
    socketInstance.on("force_logout", handleForceLogout);

    return () => {
      socketInstance.off("connect", onConnect);
      socketInstance.off("disconnect", onDisconnect);
      socketInstance.off("mark_as_read:success", handleMarkAsReadSuccess);
      socketInstance.off("mark_as_unread:success", handleMarkAsUnreadSuccess);
      socketInstance.off("mark_as_read:error", handleMarkAsReadError);
      socketInstance.off("mark_as_unread:error", handleMarkAsUnreadError);
      socketInstance.off("mark_as_read:broadcast", handleMarkAsReadBroadcast);
      socketInstance.off("mark_as_unread:broadcast", handleMarkAsUnreadBroadcast);

      socketInstance.off("new_conversation", handleNewConversation);
      socketInstance.off("new_message_sidebar", handleNewMessageSidebar);
      socketInstance.off("message_recalled_sidebar", handleRecallMessageSidebar);
      socketInstance.off("messages_expired", handleMessagesExpired);

      socketInstance.off("message_read", handleMessageRead);
      socketInstance.off("messages_unread_updated", handleUnreadUpdate);

      socketInstance.off("conversation_setting:update", handleConversationUpdate);
      socketInstance.off("conversation_setting:delete", handleConversationDelete);

      socketInstance.off("group_disbanded", handleGroupDisbanded);
      socketInstance.off("removed_from_conversation", handleRemovedFromConversation);
      socketInstance.off("group_settings_updated", handleGroupSettingsUpdate);
      socketInstance.off("group_updated", handleGroupUpdated);
      socketInstance.off("member_updated", handleMemberUpdated);
      socketInstance.off("role_updated", handleMemberUpdated);
      socketInstance.off("force_logout", handleForceLogout);
    };
  }, [apiUrl, dispatch, user?.userId, accessToken]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        markAsRead: handleMarkAsRead,
        markAsUnread: handleMarkAsUnread,
      }}
    >
      {children}

      {/* Dialog thông báo giải tán nhóm */}
      <AlertDialog
        open={groupDisbandedDialogOpen}
        onOpenChange={setGroupDisbandedDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Thông báo</AlertDialogTitle>
            <AlertDialogDescription>
              Nhóm này đã bị giải tán bởi trưởng nhóm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              className="bg-[#0068ff] hover:bg-[#0057d6] text-white"
              onClick={(e) => {
                e.preventDefault();
                setGroupDisbandedDialogOpen(false);
                navigateTo("/");
              }}
            >
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SocketContext.Provider>
  );
};
