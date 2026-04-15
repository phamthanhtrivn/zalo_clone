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
  const currentUserId =
    currentUser?.userId ||
    (currentUser as { _id?: string } | null | undefined)?._id ||
    "";
  const conversations = useAppSelector(
    (state) => state.conversation.conversations,
  );
  const conversation =
    stateConversation ||
    conversations.find(
      (c) =>
        c.conversationId === id ||
        (c as any)._id === id ||
        (c as any).id === id,
    );

  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<MessagesType[]>([]);
  const [messages, setMessages] = useState<MessagesType[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null); // mốc để lấy tin nhắn cũ hơn
  const [prevCursor, setPrevCursor] = useState<string | null>(null); // mốc để lấy tin nhắn mới hơn

  const containerRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);
  const isJumpingRef = useRef(false);
  const isFetchingRef = useRef(false); // flag để tránh gọi API old messages nhiều lần khi scroll nhanh
  const isFetchingNewerRef = useRef(false); // flag để tránh gọi API newer messages nhiều lần khi scroll nhanh

  const [isSelected, setIsSelected] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [showForwardModal, setShowForwardModal] = useState(false);

  const { socket } = useSocket();

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

        if (res.success) {
          if (res.data.messages.length > 0) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m._id));
              const uniqueNew = res.data.messages.filter(
                (m: MessagesType) => !existingIds.has(m._id),
              );
              return [...uniqueNew, ...prev];
            });
            setNextCursor(res.data.nextCursor);

            requestAnimationFrame(() => {
              const newHeight = container.scrollHeight;
              container.scrollTop = newHeight - prevHeight;
            });
          } else {
            setNextCursor(null);
          }
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

    const isBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      100;

    if (isBottom) {
      isFetchingNewerRef.current = true;
      try {
        const res = await messageService.getNewerMessages(
          id,
          currentUserId,
          prevCursor,
          20,
        );

        if (res.success) {
          if (res.data.messages.length) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m._id));
              const uniqueNew = res.data.messages.filter(
                (m: MessagesType) => !existingIds.has(m._id),
              );
              return [...prev, ...uniqueNew];
            });

            const lastMsg = res.data.messages[res.data.messages.length - 1];
            setPrevCursor(lastMsg._id);

            requestAnimationFrame(() => {
              container.scrollTo({
                top: container.scrollHeight,
                behavior: "smooth",
              });
            });
          } else {
            // Nếu không có tin nhắn mới hơn, set prevCursor về null để tránh gọi lại
            setPrevCursor(null);
          }
        }
      } finally {
        isFetchingNewerRef.current = false;
      }
    }
  };

  const scrollToMessage = (messageId: string, retry = 0) => {
    const el = document.getElementById(messageId);

    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      el.classList.add("highlight");

      setTimeout(() => {
        el.classList.remove("highlight");
      }, 5000);

      return;
    }

    // retry tối đa 10 lần (~500ms)
    if (retry < 10) {
      setTimeout(() => {
        scrollToMessage(messageId, retry + 1);
      }, 50);
    }
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
      const data = res.data;

      // Deduplicate when jumping as well, though usually messages are replaced
      setMessages(data.messages);
      setNextCursor(data.nextCursor);
      setPrevCursor(data.prevCursor);

      setTimeout(() => {
        scrollToMessage(messageId);

        // Tăng timeout để chờ scroll behavior: "smooth" hoàn tất
        setTimeout(() => {
          isJumpingRef.current = false;
        }, 1000);
      }, 100);
    }
  };

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
        setPrevCursor(null); // Reset when loading entire conversation again
      } else {
        console.error(res);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleLoadPinnedMessages = async () => {
    if (!id || !currentUserId) return;

    try {
      const res = await messageService.getPinnedMessages(id, currentUserId);

      if (res.success) {
        setPinnedMessages(res.data.messages);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const reactionMessage = async (emojiType: EmojiType, messageId: string) => {
    if (!id || !currentUserId) return;

    try {
      const res = await messageService.reactionMessage(
        id,
        currentUserId,
        emojiType,
        messageId,
      );
      if (!res.success) {
        console.error(res);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const removeReaction = async (messageId: string) => {
    if (!id || !currentUserId) return;

    try {
      const res = await messageService.removeReaction(
        currentUserId,
        messageId,
        id,
      );
      if (!res.success) {
        console.error(res);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const toastAlert = useCallback((noti: string) => {
    toast(noti, {
      position: "top-center",
      autoClose: 3000,
      hideProgressBar: true,
      closeOnClick: false,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "dark",
      closeButton: false,
      transition: Zoom,
      style: {
        display: "flex",
        justifyContent: "center",
        width: "500px",
        maxWidth: "80%",
      },
    });
  }, []);

  const handleRecalledMessage = async (messageId: string) => {
    if (!id || !currentUserId) return;

    try {
      await messageService.recalledMessage(currentUserId, messageId, id);
    } catch (error) {
      toastAlert("Bạn chỉ có thể thu hồi tin nhắn trong vòng 24 giờ");
      console.error(error);
    }
  };

  const handlePinnedMessage = async (messageId: string) => {
    if (!id || !currentUserId) return;

    try {
      await messageService.pinnedMessage(currentUserId, messageId, id);
    } catch (error) {
      toastAlert("Bạn chỉ có thể ghim tối đa 3 tin nhắn");
      console.error(error);
    }
  };

  const onSendMessage = async (text: string) => {
    if (!id || !currentUserId || !text.trim()) return;

    try {
      const res = await messageService.sendMessage(id, currentUserId, {
        text,
      });

      if (res == null) {
        toastAlert("Không nhận được phản hồi từ máy chủ");
        return;
      }

      if (
        typeof res === "object" &&
        "success" in res &&
        res.success === false
      ) {
        toastAlert(
          typeof (res as { message?: string }).message === "string"
            ? (res as { message: string }).message
            : "Gửi tin nhắn thất bại",
        );
        return;
      }
    } catch (error) {
      console.error(error);
      toastAlert("Gửi tin nhắn thất bại");
    }
  };

  const onSendFiles = async (files: FileList) => {
    if (!id || !currentUserId || !files.length) return;

    try {
      const promises = Array.from(files).map((file) =>
        messageService.sendMessage(id, currentUserId, undefined, file),
      );

      const results = await Promise.all(promises);

      results.forEach((res, index) => {
        if (
          !res ||
          typeof res !== "object" ||
          !("success" in res) ||
          !res.success
        ) {
          console.error(`Lỗi file ${files[index].name}`);
        }
      });

      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteMessageForMe = async (messageId: string) => {
    if (!id || !currentUserId) return;

    const res = await messageService.deleteMessageForMe(
      currentUserId,
      messageId,
      id,
    );

    if (res.success) {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));

      const refreshList =
        await conversationService.getConversationsFromUserId(currentUserId);

      if (refreshList.success) {
        dispatch(setConversations(refreshList.data));
      }
    }
  };

  const handleOpenConversation = async () => {
    try {
      if (!id || !currentUserId) return;

      await messageService.readReceipt(currentUserId, id);
    } catch (error) {
      console.error(error);
    }
  };

  const handleForwardMessages = async (targetConversationIds: string[]) => {
    if (!currentUserId) return;
    try {
      await messageService.forwardMessagesToConversations(
        currentUserId,
        selectedMessages,
        targetConversationIds,
      );

      setShowForwardModal(false);
      setSelectedMessages([]);
    } catch (error) {
      console.log(error);
    }
  };

  const toggleSelectMessage = (messageId: string) => {
    if (selectedMessages.includes(messageId)) {
      setSelectedMessages(selectedMessages.filter((id) => id !== messageId));
    } else {
      setSelectedMessages([...selectedMessages, messageId]);
    }
  };

  useEffect(() => {
    if (!id || !currentUserId) return;

    setMessages([]);
    setPinnedMessages([]);
    setNextCursor(null);
    setPrevCursor(null);

    isFirstLoad.current = true;

    handleLoadMessagesFromConversation();
    handleLoadPinnedMessages();
    handleOpenConversation();
  }, [id, currentUserId]);

  useEffect(() => {
    if (containerRef.current && isFirstLoad.current && messages.length) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      isFirstLoad.current = false;
    }
  }, [messages]);

  useEffect(() => {
    const handleMediaLoaded = () => {
      const container = containerRef.current;
      if (!container) return;

      if (isJumpingRef.current) return;

      const prevScrollBottom = container.scrollHeight - container.scrollTop;

      requestAnimationFrame(() => {
        const newScrollTop = container.scrollHeight - prevScrollBottom;

        container.scrollTop = newScrollTop;
      });
    };

    window.addEventListener("message-media-loaded", handleMediaLoaded);

    return () => {
      window.removeEventListener("message-media-loaded", handleMediaLoaded);
    };
  }, []);

  useEffect(() => {
    if (selectedMessages.length === 0 && isSelected) {
      setIsSelected(false);
    }
  }, [selectedMessages, isSelected]);

  useEffect(() => {
    if (!socket || !id) return;

    socket.emit("join_room", id);

    const handleCallUpdated = (data: {
      messageId: string;
      status: string;
      duration?: number;
    }) => {
      console.log(">>> NHẬN CẬP NHẬT CUỘC GỌI REALTIME:", data);
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id === data.messageId) {
            return {
              ...msg,
              call: {
                ...(msg.call || {}),
                status: data.status,
                duration: data.duration ?? msg.call?.duration ?? 0,
              },
            };
          }
          return msg;
        }),
      );
    };

    const handleNewMessage = (newMessage: MessagesType) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === newMessage._id)) return prev;
        return [...prev, newMessage];
      });

      const container = containerRef.current;
      if (!container) return;

      const isMedia =
        newMessage.content?.file?.type === "IMAGE" ||
        newMessage.content?.file?.type === "VIDEO";

      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        100;

      if (!isMedia && isNearBottom) {
        requestAnimationFrame(() => {
          container.scrollTop = container.scrollHeight;
        });
      }
    };

    const handleMessageReacted = (data: {
      messageId: string;
      reactions: any[];
    }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === data.messageId ? { ...m, reactions: data.reactions } : m,
        ),
      );
    };

    const handleMessageRecalled = (data: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === data.messageId ? { ...m, recalled: true } : m,
        ),
      );
    };

    const handleMessagePinned = (data: {
      messageId: string;
      pinned: boolean;
      pinnedMessages: any[];
    }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === data.messageId ? { ...m, pinned: data.pinned } : m,
        ),
      );

      setPinnedMessages(data.pinnedMessages);
    };

    const handleReadReceipt = (data: {
      conversationId: string;
      messages: MessagesType[];
    }) => {
      if (data.conversationId === id) {
        setMessages((prev) => {
          const updatedMap = new Map(
            data.messages.map((m) => [m._id, m.readReceipts]),
          );

          return prev.map((m) => {
            const newReadReceipts = updatedMap.get(m._id);

            if (!newReadReceipts) return m;

            return {
              ...m,
              readReceipts: newReadReceipts,
            };
          });
        });
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("message_reacted", handleMessageReacted);
    socket.on("message_recalled", handleMessageRecalled);
    socket.on("message_pinned", handleMessagePinned);
    socket.on("read_receipt", handleReadReceipt);
    socket.on("call_updated", handleCallUpdated);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("message_reacted", handleMessageReacted);
      socket.off("message_recalled", handleMessageRecalled);
      socket.off("message_pinned", handleMessagePinned);
      socket.off("read_receipt", handleReadReceipt);
      socket.off("call_updated", handleCallUpdated);
      socket.emit("leave_room", id);
    };
  }, [socket, id]);

  return (
    <div className="flex flex-1 h-full">
      {conversation ? (
        currentUserId ? (
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
              reactionMessage={reactionMessage}
              removeReaction={removeReaction}
              handleRecalledMessage={handleRecalledMessage}
              handlePinnedMessage={handlePinnedMessage}
              handleDeleteMessageForMe={handleDeleteMessageForMe}
              isSelected={isSelected}
              setIsSelected={setIsSelected}
              selectedMessages={selectedMessages}
              toggleSelectMessage={toggleSelectMessage}
              onForwardMessages={handleForwardMessages}
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
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Đang tải thông tin tài khoản...
          </div>
        )
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Không tìm thấy hội thoại
        </div>
      )}

      {showForwardModal && (
        <ForwardModal
          open={showForwardModal}
          onClose={() => setShowForwardModal(false)}
          conversations={conversations}
          selectedMessageIds={selectedMessages}
          onSubmit={handleForwardMessages}
        />
      )}

      {conversation && currentUserId && (
        <ConversationInfoPanel
          isOpen={isInfoOpen}
          conversation={conversation}
          currentUser={{ _id: currentUserId }}
        />
      )}
    </div>
  );
};

export default ConversationPage;
