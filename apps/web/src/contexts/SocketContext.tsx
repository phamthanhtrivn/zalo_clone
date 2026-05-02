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
import type { PollType, PollOptionType, MessagesType } from "@/types/messages.type";
import {
  fetchConversations,
  removeConversation,
  removeExpiredMessages,
  updateConversationFromSocket,
  updateConversationSetting,
  updateRecallMessageInConversation,
} from "@/store/slices/conversationSlice";
import { 
    updateReadReceipt, 
    updatePoll, 
    addPollOption, 
    addMessage, 
    updateMessageReaction, 
    updateRecallMessage, 
    updateMessagePinned, 
    updateMessagesExpired 
} from "@/store/slices/messageSlice";
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
  setActiveConversationId: (id: string | null) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

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

  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const conversations = useAppSelector((state: RootState) => state.conversation.conversations);

  const socketRef = useRef<Socket | null>(null);
  const conversationsRef = useRef(conversations);
  const activeConversationIdRef = useRef<string | null>(null);
  const fetchingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const [groupDisbandedDialogOpen, setGroupDisbandedDialogOpen] = useState(false);
  const [, setGroupDisbandedConversationId] = useState<string>("");

  const markAsRead = useCallback(async (data: { userId: string; conversationId: string }) => {
    if (!socketRef.current) return;
    return new Promise((resolve, reject) => {
      socketRef.current?.emit("mark_as_read", data, (response: any) => {
        if (response?.success) resolve(response);
        else reject(response);
      });
    });
  }, []);

  const markAsUnread = useCallback(async (data: { userId: string; conversationId: string }) => {
    if (!socketRef.current) return;
    return new Promise((resolve, reject) => {
      socketRef.current?.emit("mark_as_unread", data, (response: any) => {
        if (response?.success) resolve(response);
        else reject(response);
      });
    });
  }, []);

  const setActiveConversationId = useCallback((id: string | null) => {
    if (activeConversationIdRef.current && socketRef.current) {
      socketRef.current.emit("leave_room", activeConversationIdRef.current);
    }
    activeConversationIdRef.current = id;
    if (id && socketRef.current) {
      socketRef.current.emit("join_room", id);
    }
  }, []);

  const handleForceLogout = useCallback(() => {
    toast.info("Phiên đăng nhập đã hết hạn hoặc bạn bị đăng xuất từ nơi khác.");
    dispatch(clearAuth());
    if (socketRef.current) socketRef.current.disconnect();
    navigateTo("/login");
  }, [dispatch]);

  // --- SINGLETON HANDLERS (useCallback to prevent re-bind) ---
  const handleNewMessage = useCallback((newMessage: MessagesType) => {
    const conversationId = newMessage.conversationId;
    if (!conversationId) return;

    dispatch(addMessage({ conversationId, message: newMessage }));

    const existsInStore = conversationsRef.current.some(c => c.conversationId === conversationId);
    if (!existsInStore) {
      if (!fetchingRef.current.has(conversationId)) {
        fetchingRef.current.add(conversationId);
        dispatch(fetchConversations()).finally(() => fetchingRef.current.delete(conversationId));
      }
      return;
    }

    dispatch(updateConversationFromSocket({
      conversationId,
      lastMessage: {
        _id: newMessage._id,
        senderName: newMessage.senderId?.profile?.name || "Bạn",
        content: newMessage.content,
        recalled: false,
        type: newMessage.type,
      },
      unreadCount: undefined,
      lastMessageAt: newMessage.createdAt,
    }));
  }, [dispatch]);

  const handleMessageReacted = useCallback((data: { messageId: string; reactions: any[]; conversationId?: string }) => {
    if (data.conversationId) {
      dispatch(updateMessageReaction({
        conversationId: data.conversationId,
        messageId: data.messageId,
        reactions: data.reactions
      }));
    }
  }, [dispatch]);

  const handleMessageRecalled = useCallback((data: { messageId: string; conversationId?: string }) => {
    if (data.conversationId) {
      dispatch(updateRecallMessage({ conversationId: data.conversationId, messageId: data.messageId }));
      dispatch(updateRecallMessageInConversation({ conversationId: data.conversationId, messageId: data.messageId }));
    }
  }, [dispatch]);

  const handleMessagePinned = useCallback((data: { messageId: string; pinned: boolean; conversationId?: string }) => {
    if (data.conversationId) {
      dispatch(updateMessagePinned({ conversationId: data.conversationId, messageId: data.messageId, pinned: data.pinned }));
    }
  }, [dispatch]);

  const handleReadReceipt = useCallback((data: { conversationId: string; messages: any[] }) => {
    data.messages.forEach(msg => {
      msg.readReceipts?.forEach((receipt: any) => {
        dispatch(updateReadReceipt({
          conversationId: data.conversationId,
          messageId: msg._id,
          userId: receipt.userId?._id || receipt.userId,
          type: "read"
        }));
      });
    });
  }, [dispatch]);

  const handleMessagesExpired = useCallback((data: { conversationId: string; messageIds: string[] }) => {
    dispatch(updateMessagesExpired(data));
    dispatch(removeExpiredMessages(data.messageIds));
  }, [dispatch]);

  const handleUpdatePoll = useCallback((data: Partial<PollType> & { _id: string; conversationId?: string }) => {
    console.log("🚀 Nhận dữ liệu poll mới từ Socket:", data);
    if (data.conversationId) {
      dispatch(updatePoll({ conversationId: data.conversationId, pollId: data._id, updatedPoll: data }));
    } else {
      console.error("[Socket] update_poll: Missing conversationId", data);
    }
  }, [dispatch]);

  const handlePollOptionAdded = useCallback((data: { pollId: string; newOption: PollOptionType; conversationId?: string }) => {
    if (data.conversationId) {
      dispatch(addPollOption({ conversationId: data.conversationId, pollId: data.pollId, newOption: data.newOption }));
    } else {
      console.error("[Socket] poll_option_added: Missing conversationId", data);
    }
  }, [dispatch]);

  const handleGroupDisbanded = useCallback((payload: any) => {
    const conversationId = payload?.conversationId || payload?.id;
    if (!conversationId) return;
    dispatch(removeConversation({ conversationId }));
    setGroupDisbandedConversationId(conversationId);
    setGroupDisbandedDialogOpen(true);
  }, [dispatch]);

  // --- INITIALIZE SOCKET & ATTACH LISTENERS ---
  useEffect(() => {
    if (!user?.userId || !accessToken) return;

    if (!socketRef.current) {
      socketRef.current = io(apiUrl, {
        auth: { token: accessToken, deviceId: getDeviceId() },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
      });

      socketRef.current.on("connect_error", (err) => {
        console.error("❌ Socket Connect Error:", err.message);
      });
    }

    const socketInstance = socketRef.current;
    setSocket(socketInstance);

    const onConnect = () => {
      setIsConnected(true);
      socketInstance.emit("join", user.userId);
      if (activeConversationIdRef.current) {
        socketInstance.emit("join_room", activeConversationIdRef.current);
      }
    };
    const onDisconnect = () => setIsConnected(false);

    const handleGroupUpdated = (data: any) => {
      console.log("📢 [Web Socket] Nhận group_updated:", data);
      dispatch(updateConversationSetting({
        conversationId: data.conversationId,
        name: data.name,
        avatar: data.avatar,
        group: data.group,
      }));
    };

    socketInstance.on("connect", onConnect);
    socketInstance.on("disconnect", onDisconnect);
    socketInstance.on("new_message", handleNewMessage);
    socketInstance.on("message_reacted", handleMessageReacted);
    socketInstance.on("message_recalled", handleMessageRecalled);
    socketInstance.on("message_pinned", handleMessagePinned);
    socketInstance.on("read_receipt", handleReadReceipt);
    socketInstance.on("messages_expired", handleMessagesExpired);
    socketInstance.on("update_poll", handleUpdatePoll);
    socketInstance.on("poll_option_added", handlePollOptionAdded);
    socketInstance.on("group_disbanded", handleGroupDisbanded);
    socketInstance.on("group_updated", handleGroupUpdated);
    socketInstance.on("force_logout", handleForceLogout);

    return () => {
      socketInstance.off("connect", onConnect);
      socketInstance.off("disconnect", onDisconnect);
      socketInstance.off("new_message", handleNewMessage);
      socketInstance.off("message_reacted", handleMessageReacted);
      socketInstance.off("message_recalled", handleMessageRecalled);
      socketInstance.off("message_pinned", handleMessagePinned);
      socketInstance.off("read_receipt", handleReadReceipt);
      socketInstance.off("messages_expired", handleMessagesExpired);
      socketInstance.off("update_poll", handleUpdatePoll);
      socketInstance.off("poll_option_added", handlePollOptionAdded);
      socketInstance.off("group_disbanded", handleGroupDisbanded);
      socketInstance.off("group_updated", handleGroupUpdated);
      socketInstance.off("force_logout", handleForceLogout);
    };
  }, [apiUrl, user?.userId, accessToken, handleNewMessage, handleMessageReacted, handleMessageRecalled, handleMessagePinned, handleReadReceipt, handleMessagesExpired, handleUpdatePoll, handlePollOptionAdded, handleGroupDisbanded, handleForceLogout]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        markAsRead,
        markAsUnread,
        setActiveConversationId,
      }}
    >
      {children}
      <AlertDialog open={groupDisbandedDialogOpen} onOpenChange={setGroupDisbandedDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Thông báo</AlertDialogTitle>
            <AlertDialogDescription>Nhóm này đã bị giải tán bởi trưởng nhóm.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-[#0068ff] hover:bg-[#0057d6] text-white" onClick={() => { setGroupDisbandedDialogOpen(false); navigateTo("/"); }}>Xác nhận</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SocketContext.Provider>
  );
};