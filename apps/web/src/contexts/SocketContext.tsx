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
  const [groupDisbandedDialogOpen, setGroupDisbandedDialogOpen] = useState(false);
  const [groupDisbandedConversationId, setGroupDisbandedConversationId] =
    useState<string>("");
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const socketRef = useRef<Socket | null>(null);

  const handleNewConversation = (data: any) => {
    dispatch(addConversationToTop(data));
  };

  const handleNewMessageSidebar = (data: any) => {
    if (!data?.conversationId) return;

    // Backend thường emit object conversation đầy đủ cho sidebar,
    // nhưng một số flow call-message có thể emit payload message.
    const senderName =
      data?.lastMessage?.senderName ??
      (data?.senderId?._id === user?.userId ? "Bạn" : data?.senderId?.profile?.name || "");

    const lastMessage = data?.lastMessage
      ? data.lastMessage
      : {
          _id: data?._id,
          senderName,
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

  const handleRecallMessageSidebar = (data: {
    conversationId: string;
    messageId: string;
  }) => {
    dispatch(updateRecallMessageInConversation(data));
  };

  const handleRoleUpdated = () => {
    dispatch(fetchConversations());
  };

  const handleGroupDisbanded = (payload: any) => {
    const conversationId =
      (typeof payload?.conversationId === "string" && payload.conversationId) ||
      (typeof payload?.id === "string" && payload.id) ||
      (typeof payload === "string" ? payload : "");

    if (!conversationId) return;

    dispatch(removeConversation({ conversationId }));

    const path = window.location?.pathname || "";
    const isOnThatConversation =
      path === `/conversations/${conversationId}` ||
      path === `/conversation/${conversationId}`;

    if (isOnThatConversation) {
      setGroupDisbandedConversationId(conversationId);
      setGroupDisbandedDialogOpen(true);
    }
  };

  const navigateHome = () => {
    try {
      window.history.pushState({}, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    } catch {
      window.location.href = "/";
    }
  };

  useEffect(() => {
    // 🔥 chỉ connect khi có user
    if (!user?.userId) return;
    // if (!currentUserId) return;

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

    socketInstance.on("new_conversation", handleNewConversation);
    socketInstance.on("new_message_sidebar", handleNewMessageSidebar);
    socketInstance.on("message_recalled_sidebar", handleRecallMessageSidebar);
    socketInstance.on("role_updated", handleRoleUpdated);
    socketInstance.on("group_disbanded", handleGroupDisbanded);

    return () => {
      socketInstance.off("new_conversation", handleNewConversation);
      socketInstance.off("new_message_sidebar", handleNewMessageSidebar);
      socketInstance.off(
        "message_recalled_sidebar",
        handleRecallMessageSidebar,
      );
      socketInstance.off("role_updated", handleRoleUpdated);
      socketInstance.off("group_disbanded", handleGroupDisbanded);
    };
  }, [
    apiUrl,
    dispatch,
    user?.userId,
    // currentUserId,
  ]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
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
                setGroupDisbandedConversationId("");
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
