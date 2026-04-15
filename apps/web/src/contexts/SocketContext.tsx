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
  addConversationToTop,
  fetchConversations,
  removeConversation,
  updateConversationFromSocket,
  updateConversationSetting,
  updateRecallMessageInConversation,
} from "@/store/slices/conversationSlice";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

  // State phục vụ thông báo giải tán nhóm
  const [groupDisbandedDialogOpen, setGroupDisbandedDialogOpen] =
    useState(false);
  const [, setGroupDisbandedConversationId] = useState<string>("");

  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const socketRef = useRef<Socket | null>(null);

  // --- HELPERS ---
  const navigateHome = () => {
    try {
      window.history.pushState({}, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    } catch {
      window.location.href = "/";
    }
  };

  // --- SOCKET HANDLERS ---

  // 1. Nhận hội thoại mới (Khi ai đó thêm mình vào nhóm hoặc nhắn tin lần đầu)
  const handleNewConversation = (data: any) => {
    dispatch(addConversationToTop(data));
  };

  // 2. Cập nhật Sidebar khi có tin nhắn mới (Tin nhắn thường hoặc Cuộc gọi)
  const handleNewMessageSidebar = (data: any) => {
    if (!data?.conversationId) return;

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

  // 4. Cập nhật Cài đặt hội thoại (Ghim, Ẩn, Tắt thông báo)
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

    dispatch(updateConversationSetting(patch));
  };

  // 5. Xóa hội thoại từ phía Server/Thiết bị khác
  const handleConversationDelete = (data: any) => {
    dispatch(removeConversation({ conversationId: data.conversationId }));
  };

  // 6. Xử lý khi nhóm bị giải tán
  const handleGroupDisbanded = (payload: any) => {
    const conversationId =
      payload?.conversationId ||
      payload?.id ||
      (typeof payload === "string" ? payload : "");
    if (!conversationId) return;

    dispatch(removeConversation({ conversationId }));

    const path = window.location?.pathname || "";
    if (path.includes(conversationId)) {
      setGroupDisbandedConversationId(conversationId);
      setGroupDisbandedDialogOpen(true);
    }
  };

  // --- INITIALIZE SOCKET ---
  useEffect(() => {
    if (!user?.userId) return;

    if (!socketRef.current) {
      socketRef.current = io(apiUrl, {
        auth: { userId: user.userId },
      });
    }

    const socketInstance = socketRef.current;
    setSocket(socketInstance);

    socketInstance.on("connect", () => setIsConnected(true));
    socketInstance.on("disconnect", () => setIsConnected(false));

    // Đăng ký các Listener
    socketInstance.on("new_conversation", handleNewConversation);
    socketInstance.on("new_message_sidebar", handleNewMessageSidebar);
    socketInstance.on("message_recalled_sidebar", handleRecallMessageSidebar);
    socketInstance.on("conversation_setting:update", handleConversationUpdate);
    socketInstance.on("conversation_setting:delete", handleConversationDelete);
    socketInstance.on("role_updated", () => dispatch(fetchConversations()));
    socketInstance.on("group_disbanded", handleGroupDisbanded);

    return () => {
      socketInstance.off("connect");
      socketInstance.off("disconnect");
      socketInstance.off("new_conversation", handleNewConversation);
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
      socketInstance.off("role_updated");
      socketInstance.off("group_disbanded", handleGroupDisbanded);
    };
  }, [apiUrl, dispatch, user?.userId]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
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
                navigateHome();
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
