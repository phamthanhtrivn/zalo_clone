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
import { setConversations } from "@/store/slices/conversationSlice";
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
  const conversation =
    stateConversation ||
    conversations.find((c) => c.conversationId === id || (c as any)._id === id);

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

  // --- LOGIC FETCHING ---
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
      try {
        const res = await messageService.getMessagesFromConversation(
          id,
          currentUserId,
          nextCursor,
          20,
        );
        if (res.success && res.data.messages.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m._id));
            const uniqueNew = res.data.messages.filter(
              (m) => !existingIds.has(m._id),
            );
            return [...uniqueNew, ...prev];
          });
          setNextCursor(res.data.nextCursor);
          requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight - prevHeight;
          });
        } else {
          setNextCursor(null);
        }
      } finally {
        isFetchingRef.current = false;
      }
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
      try {
        const res = await messageService.getNewerMessages(
          id,
          currentUserId,
          prevCursor,
          20,
        );
        if (res.success && res.data.messages.length) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m._id));
            const uniqueNew = res.data.messages.filter(
              (m) => !existingIds.has(m._id),
            );
            return [...prev, ...uniqueNew];
          });
          setPrevCursor(res.data.messages[res.data.messages.length - 1]._id);
        } else {
          setPrevCursor(null);
        }
      } finally {
        isFetchingNewerRef.current = false;
      }
    }
  };

  // --- LOGIC MESSAGE ACTIONS ---
  const onSendFiles = async (files: FileList) => {
    if (!id || !currentUserId || !files.length) return;
    try {
      const promises = Array.from(files).map((file) =>
        messageService.sendMessage(id, currentUserId, undefined, file),
      );
      await Promise.all(promises);
      requestAnimationFrame(() => {
        if (containerRef.current)
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleForwardMessages = async (targetConversationIds: string[]) => {
    if (!currentUserId) return;
    try {
      setLoadingForward(true);
      await messageService.forwardMessagesToConversations(
        currentUserId,
        selectedMessages,
        targetConversationIds,
      );
      setShowForwardModal(false);
      setSelectedMessages([]);
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingForward(false);
    }
  };

  // --- SOCKET LISTENERS ---
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
      if (
        containerRef.current &&
        containerRef.current.scrollHeight -
          containerRef.current.scrollTop -
          containerRef.current.clientHeight <
          100
      ) {
        requestAnimationFrame(() => {
          containerRef.current!.scrollTop = containerRef.current!.scrollHeight;
        });
      }
    };

    const handleReadReceipt = (data: any) => {
      if (data.conversationId === id) {
        const updatedMap = new Map(
          data.messages.map((m: any) => [m._id, m.readReceipts]),
        );
        setMessages((prev) =>
          prev.map((m) => {
            const receipts = updatedMap.get(m._id);
            return receipts ? { ...m, readReceipts: receipts } : m;
          }),
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

  useEffect(() => {
    if (!id || !currentUserId) return;
    setMessages([]);
    handleLoadMessagesFromConversation();
    messageService
      .getPinnedMessages(id, currentUserId)
      .then((res) => res.success && setPinnedMessages(res.data.messages));
    messageService.readReceipt(currentUserId, id);
  }, [id, currentUserId]);

  if (!conversation)
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 italic">
        Hội thoại không tồn tại
      </div>
    );

  return (
    <div className="flex flex-1 h-full">
      <div className="flex-1 flex flex-col h-full bg-[#EBECF0] min-w-0">
        <ChatHeader
          conversation={conversation}
          isInfoOpen={isInfoOpen}
          toggleInfo={() => setIsInfoOpen(!isInfoOpen)}
          pinnedMessages={pinnedMessages}
          handlePinnedMessage={(mid) =>
            messageService.pinnedMessage(currentUserId, mid, id!)
          }
          handleJumpToMessage={(mid) => {
            /* Logic jump */
          }}
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
          handleRecalledMessage={(mid) =>
            messageService.recalledMessage(currentUserId, mid, id!)
          }
          handlePinnedMessage={(mid) =>
            messageService.pinnedMessage(currentUserId, mid, id!)
          }
          handleDeleteMessageForMe={(mid) => {
            /* Logic delete */
          }}
          isSelected={isSelected}
          setIsSelected={setIsSelected}
          selectedMessages={selectedMessages}
          toggleSelectMessage={(mid) =>
            setSelectedMessages((p) =>
              p.includes(mid) ? p.filter((i) => i !== mid) : [...p, mid],
            )
          }
          lastMessageId={lastMessageId || ""}
        />

        <ChatInput
          chatName={conversation.name}
          onSendMessage={(text) =>
            messageService.sendMessage(id!, currentUserId, { text })
          }
          onSendFiles={onSendFiles}
          isSelected={isSelected}
          setIsSelected={setIsSelected}
          selectedMessages={selectedMessages}
          setSelectedMessages={setSelectedMessages}
          onOpenForwardModal={() => setShowForwardModal(true)}
        />
      </div>

      {showForwardModal && (
        <ForwardModal
          open={showForwardModal}
          onClose={() => setShowForwardModal(false)}
          conversations={conversations}
          selectedMessageIds={selectedMessages}
          loadingForward={loadingForward}
          onSubmit={handleForwardMessages}
        />
      )}

      <ConversationInfoPanel
        isOpen={isInfoOpen}
        conversation={conversation}
        onClose={() => setIsInfoOpen(false)}
      />
    </div>
  );
};

export default ConversationPage;
