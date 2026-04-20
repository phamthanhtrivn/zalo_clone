
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
import { setConversations, clearReplyingMessage } from "@/store/slices/conversationSlice";
import ForwardModal from "@/components/layout/message/ForwardModal";

const ConversationPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const conversations = useAppSelector(
    (state) => state.conversation.conversations,
  );
  const user = useAppSelector((state) => state.auth.user);
  const conversation = useAppSelector((state) => {
    const found = state.conversation.conversations.find(
      (c) => c.conversationId === id,
    );
    return found ?? null;
  });

  const isGroup = conversation?.type === "GROUP"
  const replyingMessage = useAppSelector((state) => state.conversation.replyingMessage);
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
  const [loadingForward, setLoadingForward] = useState(false);
  const lastMessageId = messages[messages.length - 1]?._id;
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedMessageIdRef = useRef<string | null>(null);
  const pendingJumpMessageIdRef = useRef<string | null>(null);

  const { socket } = useSocket();
  const selectedMessageId = new URLSearchParams(location.search).get("messageId");
  // Trong ConversationPage component, thêm useEffect để xử lý read_receipt
  // ConversationPage.tsx - useEffect đã đúng, chỉ cần kiểm tra
  // ConversationPage.tsx
  // ConversationPage.tsx
  // ConversationPage.tsx

  // ✅ SỬA: Chỉ xử lý read_receipt, bỏ qua messages_unread_updated
  // ConversationPage.tsx
  const processingRef = useRef<Set<string>>(new Set());
  // ConversationPage.tsx
  const handleReadReceipt = useCallback((data: {
    conversationId: string;
    messages: Array<{ _id: string; readReceipts: any[] }>;
  }) => {
    if (data.conversationId !== id) return;
    console.log('📖 Client received read_receipt:');
    data.messages.forEach(msg => {
      console.log(`  Message ${msg._id}:`);
      msg.readReceipts?.forEach((receipt, idx) => {
        console.log(`    Receipt ${idx}:`, {
          userId: receipt.userId?._id,
          hasProfile: !!receipt.userId?.profile,
          avatarUrl: receipt.userId?.profile?.avatarUrl,
          fullData: receipt
        });
      });
    });
    // ✅ Nếu là user hiện tại, cập nhật readReceipts bình thường
    // Nếu là user khác, cũng cập nhật nhưng không gây re-render mạnh
    setMessages((prev) => {
      const updatedMap = new Map(data.messages.map((m) => [m._id, m.readReceipts]));
      let hasChanges = false;

      const newMessages = prev.map((msg) => {
        const newReadReceipts = updatedMap.get(msg._id);
        if (newReadReceipts) {
          const currentReceipts = msg.readReceipts || [];
          // Kiểm tra xem có thay đổi không
          if (currentReceipts.length !== newReadReceipts.length) {
            hasChanges = true;
            return { ...msg, readReceipts: newReadReceipts };
          }
        }
        return msg;
      });

      return hasChanges ? newMessages : prev;
    });
  }, [id]);

  // ✅ BỎ QUA messages_unread_updated - không xử lý gì cả
  // const handleUnreadUpdated = useCallback((data: {
  //   conversationId: string;
  //   userId: string;
  //   lastReadMessageId: string | null;
  //   unreadCount?: number;
  // }) => {
  //   if (data.conversationId !== id) return;
  //   // Chỉ log, không cập nhật messages
  //   console.log('📝 Ignored unread_updated for user:', data.userId);
  // }, [id]);

  // ✅ SỬA useEffect - thêm debounce để tránh cập nhật quá nhanh
  // useEffect(() => {
  //   if (!socket || !id) return;

  //   // Debounce cho read_receipt
  //   let timeoutId: NodeJS.Timeout;

  //   const debouncedReadReceipt = (data: any) => {
  //     clearTimeout(timeoutId);
  //     timeoutId = setTimeout(() => {
  //       handleReadReceipt(data);
  //     }, 50);
  //   };

  //   socket.on("read_receipt", debouncedReadReceipt);
  //   socket.on("messages_unread_updated", handleUnreadUpdated);

  //   return () => {
  //     socket.off("read_receipt", debouncedReadReceipt);
  //     socket.off("messages_unread_updated", handleUnreadUpdated);
  //     clearTimeout(timeoutId);
  //     if (updateTimeoutRef.current) {
  //       clearTimeout(updateTimeoutRef.current);
  //     }
  //   };
  // }, [socket, id, handleReadReceipt, handleUnreadUpdated]);
  // ConversationPage.tsx - Sửa useEffect
  // useEffect(() => {
  //   if (!socket || !id) return;

  //   // ✅ Chỉ lắng nghe read_receipt
  //   socket.on("read_receipt", handleReadReceipt);
  //   // ❌ Không lắng nghe messages_unread_updated nữa
  //   // socket.on("messages_unread_updated", handleUnreadUpdated);

  //   return () => {
  //     socket.off("read_receipt", handleReadReceipt);
  //     // socket.off("messages_unread_updated", handleUnreadUpdated);
  //     if (updateTimeoutRef.current) {
  //       clearTimeout(updateTimeoutRef.current);
  //     }
  //   };
  // }, [socket, id, handleReadReceipt]); // ❌ Bỏ handleUnreadUpdated khỏi dependencies
  const handleScrollToTop = async () => {
    const container = containerRef.current;
    if (
      !container ||
      !nextCursor ||
      !id ||
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
          user?.userId || "",
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
          user?.userId || "",
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
    if (!id) return;

    isJumpingRef.current = true;

    const res = await messageService.getMessagesAroundPinnedMessage(
      id,
      user?.userId || "",
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
    if (!id) return;

    try {
      const res = await messageService.getMessagesFromConversation(
        id,
        user?.userId || "",
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
    if (!id) return;

    try {
      const res = await messageService.getPinnedMessages(
        id,
        user?.userId || "",
      );

      if (res.success) {
        setPinnedMessages(res.data.messages);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const reactionMessage = async (emojiType: EmojiType, messageId: string) => {
    if (!id) return;

    try {
      const res = await messageService.reactionMessage(
        id,
        user?.userId || "",
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
    if (!id) return;

    try {
      const res = await messageService.removeReaction(
        user?.userId || "",
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
    if (!id) return;

    try {
      await messageService.recalledMessage(user?.userId || "", messageId, id);
    } catch (error) {
      toastAlert("Bạn chỉ có thể thu hồi tin nhắn trong vòng 24 giờ");
      console.error(error);
    }
  };

  const handlePinnedMessage = async (messageId: string) => {
    if (!id) return;

    try {
      await messageService.pinnedMessage(user?.userId || "", messageId, id);
    } catch (error) {
      toastAlert("Bạn chỉ có thể ghim tối đa 3 tin nhắn");
      console.error(error);
    }
  };

  const onSendMessage = async (text: string) => {
    if (!id || !text.trim()) return;

    try {
      await messageService.sendMessage(id, user?.userId || "", replyingMessage?._id, {
        text,
      });
      if (replyingMessage) {
        dispatch(clearReplyingMessage());
      }
    } catch (error) {
      console.error(error);
    }
  };

  const onSendFiles = async (files: FileList) => {
    if (!id || !files.length) return;

    try {
      const filesArray = Array.from(files);

      const mediaFiles = filesArray.filter(
        (file) => file.type.startsWith("image/") || file.type.startsWith("video/"),
      );
      const documentFiles = filesArray.filter(
        (file) => !file.type.startsWith("image/") && !file.type.startsWith("video/"),
      );

      const promises: Promise<any>[] = [];

      if (mediaFiles.length > 0) {
        promises.push(
          messageService.sendMessage(
            id,
            user?.userId || "",
            replyingMessage?._id,
            undefined,
            mediaFiles
          )
        );
      }

      documentFiles.forEach((file) => {
        promises.push(
          messageService.sendMessage(
            id,
            user?.userId || "",
            replyingMessage?._id,
            undefined,
            [file]
          )
        );
      });

      const results = await Promise.all(promises);

      results.forEach((res) => {
        if (!res.success) {
          console.error("Gửi file thất bại");
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
    if (!id) return;

    const res = await messageService.deleteMessageForMe(
      user?.userId || "",
      messageId,
      id,
    );

    if (res.success) {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));

      const res = await conversationService.getConversationsFromUserId(
        user?.userId || "",
      );

      if (res.success) {
        dispatch(setConversations(res.data));
      }
    }
  };

  const handleOpenConversation = async () => {
    try {
      if (!id) return;

      await messageService.readReceipt(user?.userId || "", id);
    } catch (error) {
      console.error(error);
    }
  };

  const handleForwardMessages = async (targetConversationIds: string[]) => {
    try {
      setLoadingForward(true);
      await messageService.forwardMessagesToConversations(
        user?.userId || "",
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

  const toggleSelectMessage = (messageId: string) => {
    if (selectedMessages.includes(messageId)) {
      setSelectedMessages(selectedMessages.filter((id) => id !== messageId));
    } else {
      setSelectedMessages([...selectedMessages, messageId]);
    }
  };

  useEffect(() => {
    setMessages([]);
    setPinnedMessages([]);
    setNextCursor(null);
    setPrevCursor(null);

    isFirstLoad.current = true;
    pendingJumpMessageIdRef.current = selectedMessageId;

    handleLoadMessagesFromConversation();
    handleLoadPinnedMessages();
    handleOpenConversation();
    dispatch(clearReplyingMessage());
  }, [id, selectedMessageId]);

  useEffect(() => {
    if (!pendingJumpMessageIdRef.current || !messages.length) return;

    const targetMessageId = pendingJumpMessageIdRef.current;
    pendingJumpMessageIdRef.current = null;

    const timeoutId = setTimeout(() => {
      handleJumpToMessage(targetMessageId);
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [messages]);

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

    const handleNewMessage = (newMessage: MessagesType) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === newMessage._id)) return prev;
        return [...prev, newMessage];
      });

      const container = containerRef.current;
      if (!container) return;

      const isMedia =
        newMessage.content?.files?.type === "IMAGE" ||
        newMessage.content?.files?.type === "VIDEO";

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

    // const handleReadReceipt = (data: {
    //   conversationId: string;
    //   messages: MessagesType[];
    // }) => {
    //   if (data.conversationId === id) {
    //     setMessages((prev) => {
    //       const updatedMap = new Map(
    //         data.messages.map((m) => [m._id, m.readReceipts]),
    //       );

    //       return prev.map((m) => {
    //         const newReadReceipts = updatedMap.get(m._id);

    //         if (!newReadReceipts) return m;

    //         return {
    //           ...m,
    //           readReceipts: newReadReceipts,
    //         };
    //       });
    //     });
    //   }
    // };

    const handleMessagesExpired = (data: { conversationId: string, messageIds: string[] }) => {
      if (data.conversationId !== id) return;
      setMessages((prev) =>
        prev.map((m) =>
          data.messageIds.includes(m._id) ? { ...m, expired: true } : m,
        ),
      );
    };

    socket.on("new_message", handleNewMessage);
    socket.on("message_reacted", handleMessageReacted);
    socket.on("message_recalled", handleMessageRecalled);
    socket.on("message_pinned", handleMessagePinned);
    socket.on("read_receipt", handleReadReceipt);
    socket.on("messages_expired", handleMessagesExpired);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("message_reacted", handleMessageReacted);
      socket.off("message_recalled", handleMessageRecalled);
      socket.off("message_pinned", handleMessagePinned);
      socket.off("read_receipt", handleReadReceipt);
      socket.off("messages_expired", handleMessagesExpired);
      socket.emit("leave_room", id);
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [socket, id]);

  return (
    <div className="flex flex-1 h-full">
      {conversation && (
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
            currentUserId={user?.userId || ""}
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
            lastMessageId={lastMessageId}
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
          />
        </div>
      )}

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
