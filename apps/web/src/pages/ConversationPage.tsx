import { useLocation, useParams } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import ChatHeader from "@/components/layout/message/ChatHeader";
import MessageList from "@/components/layout/message/MessageList";
import ChatInput from "@/components/layout/message/ChatInput";
import ConversationInfoPanel from "@/components/layout/message/ConversationInfoPanel";
import { messageService } from "@/services/message.service";
import type { MessagesType } from "@/types/messages.type";
import type { EmojiType } from "@/constants/emoji.constant";
import { toast, Zoom } from "react-toastify";
import { useSocket } from "@/contexts/SocketContext";
import { conversationService } from "@/services/conversation.service";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  setConversations,
  clearReplyingMessage,
} from "@/store/slices/conversationSlice";
import ForwardModal from "@/components/layout/message/ForwardModal";

const ConversationPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const { conversation: stateConversation } = location.state || {};
  const dispatch = useAppDispatch();

  const currentUser = useAppSelector((state) => state.auth.user);
  const currentUserId = currentUser?.userId || (currentUser as any)?._id || "";

  const conversations = useAppSelector(
    (state) => state.conversation.conversations,
  );
  const replyingMessage = useAppSelector(
    (state) => state.conversation.replyingMessage,
  );

  // Ưu tiên tìm trong state -> sau đó tìm trong store
  const conversation =
    stateConversation || conversations.find((c) => c.conversationId === id);
  const isGroup = conversation?.type === "GROUP";

  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<MessagesType[]>([]);
  const [messages, setMessages] = useState<MessagesType[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [prevCursor, setPrevCursor] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);
  const isJumpingRef = useRef(false);
  const isFetchingRef = useRef(false);
  const isFetchingNewerRef = useRef(false);

  const [isSelected, setIsSelected] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [loadingForward, setLoadingForward] = useState(false);

  const lastMessageId = messages[messages.length - 1]?._id;
  const { socket } = useSocket();

  // --- LOGIC THÔNG BÁO ---
  const toastAlert = useCallback((noti: string) => {
    toast(noti, {
      position: "top-center",
      autoClose: 3000,
      hideProgressBar: true,
      theme: "dark",
      transition: Zoom,
    });
  }, []);

  // --- LOGIC CUỘN & NHẢY TIN NHẮN ---
  const scrollToMessage = (messageId: string, retry = 0) => {
    const el = document.getElementById(messageId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("highlight");
      setTimeout(() => el.classList.remove("highlight"), 5000);
      return;
    }
    if (retry < 10) setTimeout(() => scrollToMessage(messageId, retry + 1), 50);
  };

  const handleJumpToMessage = async (messageId: string) => {
    if (!id || !currentUserId) return;
    isJumpingRef.current = true;
    const res = await messageService.getMessagesAroundPinnedMessage(
      id,
      currentUserId,
      messageId,
      15,
    );
    if (res.success) {
      setMessages(res.data.messages);
      setNextCursor(res.data.nextCursor);
      setPrevCursor(res.data.prevCursor);
      setTimeout(() => {
        scrollToMessage(messageId);
        setTimeout(() => {
          isJumpingRef.current = false;
        }, 1000);
      }, 100);
    }
  };

  // --- API FETCHING ---
  const handleLoadMessagesFromConversation = async () => {
    if (!id || !currentUserId) return;
    try {
      const res = await messageService.getMessagesFromConversation(
        id,
        currentUserId,
        null,
        20,
      );
      if (res.success) {
        setMessages(res.data.messages);
        setNextCursor(res.data.nextCursor);
        setPrevCursor(null);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleLoadPinnedMessages = async () => {
    if (!id || !currentUserId) return;
    try {
      const res = await messageService.getPinnedMessages(id, currentUserId);
      if (res.success) setPinnedMessages(res.data.messages);
    } catch (err) {
      console.error(err);
    }
  };

  const handleScrollToTop = async () => {
    const container = containerRef.current;
    if (
      !container ||
      !nextCursor ||
      !id ||
      !currentUserId ||
      isJumpingRef.current ||
      isFetchingRef.current
    )
      return;
    if (container.scrollTop < 100) {
      isFetchingRef.current = true;
      const prevHeight = container.scrollHeight;
      const res = await messageService.getMessagesFromConversation(
        id,
        currentUserId,
        nextCursor,
        20,
      );
      if (res.success && res.data.messages.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m._id));
          return [
            ...res.data.messages.filter((m) => !existingIds.has(m._id)),
            ...prev,
          ];
        });
        setNextCursor(res.data.nextCursor);
        requestAnimationFrame(() => {
          container.scrollTop = container.scrollHeight - prevHeight;
        });
      } else {
        setNextCursor(null);
      }
      isFetchingRef.current = false;
    }
  };

  const handleScrollToBottom = async () => {
    const container = containerRef.current;
    if (
      !container ||
      !prevCursor ||
      !id ||
      !currentUserId ||
      isJumpingRef.current ||
      isFetchingNewerRef.current
    )
      return;
    if (
      container.scrollHeight - container.scrollTop - container.clientHeight <
      100
    ) {
      isFetchingNewerRef.current = true;
      const res = await messageService.getNewerMessages(
        id,
        currentUserId,
        prevCursor,
        20,
      );
      if (res.success && res.data.messages.length) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m._id));
          return [
            ...prev,
            ...res.data.messages.filter((m) => !existingIds.has(m._id)),
          ];
        });
        setPrevCursor(res.data.messages[res.data.messages.length - 1]._id);
      } else {
        setPrevCursor(null);
      }
      isFetchingNewerRef.current = false;
    }
  };

  // --- ACTIONS ---
  const onSendMessage = async (text: string) => {
    if (!id || !currentUserId || !text.trim()) return;
    try {
      await messageService.sendMessage(
        id,
        currentUserId,
        replyingMessage?._id,
        { text },
      );
      if (replyingMessage) dispatch(clearReplyingMessage());
    } catch (error) {
      console.error(error);
    }
  };

  const onSendFiles = async (files: FileList) => {
    if (!id || !currentUserId || !files.length) return;
    try {
      const filesArray = Array.from(files);
      const mediaFiles = filesArray.filter(
        (f) => f.type.startsWith("image/") || f.type.startsWith("video/"),
      );
      const docFiles = filesArray.filter(
        (f) => !f.type.startsWith("image/") && !f.type.startsWith("video/"),
      );

      const promises: Promise<any>[] = [];
      if (mediaFiles.length > 0)
        promises.push(
          messageService.sendMessage(
            id,
            currentUserId,
            replyingMessage?._id,
            undefined,
            mediaFiles,
          ),
        );
      docFiles.forEach((file) =>
        promises.push(
          messageService.sendMessage(
            id,
            currentUserId,
            replyingMessage?._id,
            undefined,
            [file],
          ),
        ),
      );

      await Promise.all(promises);
      if (replyingMessage) dispatch(clearReplyingMessage());
    } catch (error) {
      console.error(error);
    }
  };

  const handleRecalledMessage = async (messageId: string) => {
    try {
      await messageService.recalledMessage(currentUserId, messageId, id!);
    } catch (err) {
      toastAlert("Bạn chỉ có thể thu hồi tin nhắn trong vòng 24 giờ");
    }
  };

  const handlePinnedMessage = async (messageId: string) => {
    try {
      await messageService.pinnedMessage(currentUserId, messageId, id!);
    } catch (err) {
      toastAlert("Bạn chỉ có thể ghim tối đa 3 tin nhắn");
    }
  };

  const handleDeleteMessageForMe = async (messageId: string) => {
    const res = await messageService.deleteMessageForMe(
      currentUserId,
      messageId,
      id!,
    );
    if (res.success) {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
      const convs =
        await conversationService.getConversationsFromUserId(currentUserId);
      if (convs.success) dispatch(setConversations(convs.data));
    }
  };

  const handleForwardMessages = async (targetConversationIds: string[]) => {
    try {
      setLoadingForward(true);
      await messageService.forwardMessagesToConversations(
        currentUserId,
        selectedMessages,
        targetConversationIds,
      );
      setShowForwardModal(false);
      setSelectedMessages([]);
      setIsSelected(false);
    } finally {
      setLoadingForward(false);
    }
  };

  // --- EFFECTS ---
  useEffect(() => {
    setMessages([]);
    handleLoadMessagesFromConversation();
    handleLoadPinnedMessages();
    messageService.readReceipt(currentUserId, id!);
    dispatch(clearReplyingMessage());
    isFirstLoad.current = true;
  }, [id, currentUserId]);

  useEffect(() => {
    if (containerRef.current && isFirstLoad.current && messages.length) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      isFirstLoad.current = false;
    }
  }, [messages]);

  useEffect(() => {
    if (!socket || !id) return;
    socket.emit("join_room", id);

    const handleCallUpdated = (data: any) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === data.messageId
            ? {
                ...msg,
                call: {
                  ...(msg.call || {}),
                  status: data.status,
                  duration: data.duration ?? msg.call?.duration ?? 0,
                },
              }
            : msg,
        ),
      );
    };

    const handleNewMessage = (newMessage: MessagesType) => {
      setMessages((prev) =>
        prev.some((m) => m._id === newMessage._id)
          ? prev
          : [...prev, newMessage],
      );
      const container = containerRef.current;
      if (
        container &&
        container.scrollHeight - container.scrollTop - container.clientHeight <
          150
      ) {
        requestAnimationFrame(() => {
          container.scrollTop = container.scrollHeight;
        });
      }
    };

    const handleReadReceipt = (data: any) => {
      if (data.conversationId === id) {
        const updatedMap = new Map(
          data.messages.map((m: any) => [m._id, m.readReceipts]),
        );
        setMessages((prev) =>
          prev.map((m) =>
            updatedMap.has(m._id)
              ? { ...m, readReceipts: updatedMap.get(m._id) }
              : m,
          ),
        );
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("message_reacted", (data) =>
      setMessages((p) =>
        p.map((m) =>
          m._id === data.messageId ? { ...m, reactions: data.reactions } : m,
        ),
      ),
    );
    socket.on("message_recalled", (data) =>
      setMessages((p) =>
        p.map((m) => (m._id === data.messageId ? { ...m, recalled: true } : m)),
      ),
    );
    socket.on("message_pinned", (data) => {
      setMessages((p) =>
        p.map((m) =>
          m._id === data.messageId ? { ...m, pinned: data.pinned } : m,
        ),
      );
      setPinnedMessages(data.pinnedMessages);
    });
    socket.on("read_receipt", handleReadReceipt);
    socket.on("call_updated", handleCallUpdated);

    return () => {
      [
        "new_message",
        "message_reacted",
        "message_recalled",
        "message_pinned",
        "read_receipt",
        "call_updated",
      ].forEach((ev) => socket.off(ev));
      socket.emit("leave_room", id);
    };
  }, [socket, id]);

  if (!conversation)
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 italic">
        Hội thoại không tồn tại
      </div>
    );

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <div className="flex-1 flex flex-col h-full bg-[#EBECF0] min-w-0">
        <ChatHeader
          conversation={conversation}
          isInfoOpen={isInfoOpen}
          toggleInfo={() => setIsInfoOpen(!isInfoOpen)}
          pinnedMessages={pinnedMessages}
          handlePinnedMessage={handlePinnedMessage}
          handleJumpToMessage={handleJumpToMessage}
        />

        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          containerRef={containerRef}
          handleScrollToTop={handleScrollToTop}
          handleScrollToBottom={handleScrollToBottom}
          reactionMessage={(emoji, mid) =>
            messageService.reactionMessage(id!, currentUserId, emoji, mid)
          }
          removeReaction={(mid) =>
            messageService.removeReaction(currentUserId, mid, id!)
          }
          handleRecalledMessage={handleRecalledMessage}
          handlePinnedMessage={handlePinnedMessage}
          handleDeleteMessageForMe={handleDeleteMessageForMe}
          isSelected={isSelected}
          setIsSelected={setIsSelected}
          selectedMessages={selectedMessages}
          toggleSelectMessage={(mid) =>
            setSelectedMessages((p) =>
              p.includes(mid) ? p.filter((i) => i !== mid) : [...p, mid],
            )
          }
          lastMessageId={lastMessageId || ""}
          isGroup={isGroup}
          onJumpToMessage={handleJumpToMessage}
        />

        <ChatInput
          chatName={conversation.name}
          onSendMessage={onSendMessage}
          onSendFiles={onSendFiles}
          isSelected={isSelected}
          setIsSelected={setIsSelected}
          selectedMessages={selectedMessages}
          setSelectedMessages={setSelectedMessages}
          onOpenForwardModal={() => setShowForwardModal(true)}
          conversationId={conversation.conversationId}
        />
      </div>

      <ForwardModal
        open={showForwardModal}
        onClose={() => setShowForwardModal(false)}
        conversations={conversations}
        selectedMessageIds={selectedMessages}
        loadingForward={loadingForward}
        onSubmit={handleForwardMessages}
      />

      <ConversationInfoPanel
        isOpen={isInfoOpen}
        conversation={conversation}
        onClose={() => setIsInfoOpen(false)}
      />
    </div>
  );
};

export default ConversationPage;
