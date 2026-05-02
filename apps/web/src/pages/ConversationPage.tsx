import { useLocation, useParams } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import ChatHeader from "@/components/layout/message/ChatHeader";
import MessageList from "@/components/layout/message/MessageList";
import ChatInput from "@/components/layout/message/ChatInput";
import ConversationInfoPanel from "@/components/layout/message/ConversationInfoPanel";
import { messageService } from "@/services/message.service";
import { userService } from "@/services/user.service";
import type { MessagesType } from "@/types/messages.type";
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
  const { conversation: stateConversation, otherUserId: locationOtherUserId } = location.state || {};
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

  // ID của người đối diện: lấy từ conversation store, hoặc fallback từ location.state
  // (cần thiết khi conversation vừa được tạo và chưa có otherMemberId)
  const effectiveOtherMemberId = !isGroup
    ? (conversation?.otherMemberId || locationOtherUserId || null)
    : null;

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
  // const conversation = useAppSelector((state) => {
  //   const found = state.conversation.conversations.find(
  //     (c) => c.conversationId === id,
  //   );
  //   return found ?? null;
  // });
  const [isSelected, setIsSelected] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [loadingForward, setLoadingForward] = useState(false);
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProcessedMessageIdRef = useRef<string | null>(null);
  const pendingJumpMessageIdRef = useRef<string | null>(null);

  // --- FRIEND STATUS ---
  const [isFriend, setIsFriend] = useState<boolean | null>(null);
  const [friendStatus, setFriendStatus] = useState<string | null>(null);

  const lastMessageId = messages[messages.length - 1]?._id;
  const { socket } = useSocket();
  const selectedMessageId = new URLSearchParams(location.search).get("messageId");
  // Trong ConversationPage component, thêm useEffect để xử lý read_receipt
  // ConversationPage.tsx - useEffect đã đúng, chỉ cần kiểm tra
  // ConversationPage.tsx
  // ConversationPage.tsx
  // ConversationPage.tsx


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

  // --- FRIEND STATUS CHECK ---
  useEffect(() => {
    if (isGroup || !effectiveOtherMemberId || !currentUserId) {
      setIsFriend(null);
      setFriendStatus(null);
      return;
    }
    let cancelled = false;
    const check = async () => {
      try {
        console.log('[FriendStatus] Checking:', effectiveOtherMemberId);
        const res = await userService.checkFriendStatus(effectiveOtherMemberId);
        console.log('[FriendStatus] Result:', res);
        // Response cấu trúc: { success, statusCode, data: { success, data: { isFriend, status } } }
        const friendData = res?.data?.data ?? res?.data;
        if (!cancelled && friendData) {
          setIsFriend(!!friendData.isFriend);
          setFriendStatus(friendData.status ?? null);
        } else if (!cancelled) {
          setIsFriend(false);
          setFriendStatus(null);
        }
      } catch (err) {
        console.error('[FriendStatus] API error:', err);
        // Nếu API lỗi, mặc định coi là chưa kết bạn để hiện banner
        if (!cancelled) {
          setIsFriend(false);
          setFriendStatus(null);
        }
      }
    };
    check();
    return () => { cancelled = true; };
  }, [id, effectiveOtherMemberId, isGroup, currentUserId]);

  const handleSendFriendRequest = async () => {
    if (!effectiveOtherMemberId || !currentUserId) return;
    try {
      await userService.addFriend(effectiveOtherMemberId, currentUserId);
      setFriendStatus("PENDING");
    } catch (err) {
      console.error("Gửi lời mời kết bạn thất bại:", err);
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!effectiveOtherMemberId || !currentUserId) return;
    try {
      await userService.acceptFriend(effectiveOtherMemberId, currentUserId);
      setIsFriend(true);
      setFriendStatus("ACCEPTED");
    } catch (err) {
      console.error("Chấp nhận kết bạn thất bại:", err);
    }
  };

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
      const audioFiles = filesArray.filter((f) => f.type.startsWith("audio/"));
      const mediaFiles = filesArray.filter(
        (f) => f.type.startsWith("image/") || f.type.startsWith("video/"),
      );
      const docFiles = filesArray.filter(
        (f) =>
          !f.type.startsWith("image/") &&
          !f.type.startsWith("video/") &&
          !f.type.startsWith("audio/"),
      );

      const getAudioDurationSeconds = (file: File) =>
        new Promise<number>((resolve) => {
          const url = URL.createObjectURL(file);
          const audio = new Audio();
          audio.preload = "metadata";
          audio.src = url;

          const cleanup = () => {
            URL.revokeObjectURL(url);
          };

          audio.onloadedmetadata = () => {
            const duration = Number.isFinite(audio.duration)
              ? audio.duration
              : 0;
            cleanup();
            resolve(duration);
          };

          audio.onerror = () => {
            cleanup();
            resolve(0);
          };
        });

      const promises: Promise<any>[] = [];

      // Voice: 1 message / audio file
      for (const file of audioFiles) {
        promises.push(
          (async () => {
            const durationSeconds = await getAudioDurationSeconds(file);
            const voiceDuration = Math.max(1, Math.floor(durationSeconds || 1));
            const formData = new FormData();
            formData.append("conversationId", id);
            formData.append("senderId", currentUserId);
            if (replyingMessage?._id) formData.append("repliedId", replyingMessage._id);
            formData.append(
              "content",
              JSON.stringify({
                voiceDuration,
              }),
            );
            formData.append("files", file);
            return messageService.sendVoiceMessage(formData);
          })(),
        );
      }

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

  const onSendVoice = async (voice: {
    blob: Blob;
    fileName: string;
    mimeType: string;
    durationMs: number;
  }) => {
    if (!id || !currentUserId) return;

    const formData = new FormData();
    formData.append("conversationId", id);
    formData.append("senderId", currentUserId);
    if (replyingMessage?._id) {
      formData.append("repliedId", replyingMessage._id);
    }

    const audioFile = new File([voice.blob], voice.fileName, {
      type: voice.mimeType || "audio/webm",
    });

    formData.append(
      "content",
      JSON.stringify({
        voiceDuration: Math.max(1, Math.floor(voice.durationMs / 1000)),
      }),
    );
    formData.append("files", audioFile);

    await messageService.sendVoiceMessage(formData);
    if (replyingMessage) dispatch(clearReplyingMessage());
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
    setPinnedMessages([]);
    setNextCursor(null);
    setPrevCursor(null);

    isFirstLoad.current = true;
    pendingJumpMessageIdRef.current = selectedMessageId;

    handleLoadMessagesFromConversation();
    handleLoadPinnedMessages();
    messageService.readReceipt(currentUserId, id!);
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
    }

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
    socket.on("messages_expired", handleMessagesExpired);

    return () => {
      [
        "new_message",
        "message_reacted",
        "message_recalled",
        "message_pinned",
        "read_receipt",
        "call_updated",
        "messages_expired"
      ].forEach((ev) => socket.off(ev));

      socket.emit("leave_room", id);
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
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

        {/* Thanh gửi yêu cầu kết bạn */}
        {!isGroup && isFriend === false && (
          <div className="px-4 py-2.5 bg-white border-b border-gray-100 flex items-center gap-3 text-sm">
            {/* Icon */}
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#0091ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>

            {/* Text */}
            <span className="flex-1 text-gray-600 text-[13px]">
              {friendStatus === "REQUESTED"
                ? "Người này đã gửi lời mời kết bạn cho bạn"
                : friendStatus === "PENDING"
                  ? "Đã gửi lời mời kết bạn"
                  : "Gửi yêu cầu kết bạn tới người này"}
            </span>

            {/* Action button */}
            {friendStatus === "REQUESTED" ? (
              <button
                onClick={handleAcceptFriendRequest}
                className="shrink-0 px-4 py-1.5 bg-[#0091ff] text-white text-[13px] font-medium rounded-md hover:bg-[#0075dd] transition-colors"
              >
                Chấp nhận
              </button>
            ) : friendStatus === "PENDING" ? (
              <span className="shrink-0 px-4 py-1.5 text-gray-400 text-[13px] border border-gray-200 rounded-md">
                Đã gửi
              </span>
            ) : (
              <button
                onClick={handleSendFriendRequest}
                className="shrink-0 px-4 py-1.5 bg-[#0091ff] text-white text-[13px] font-medium rounded-md hover:bg-[#0075dd] transition-colors"
              >
                Gửi kết bạn
              </button>
            )}
          </div>
        )}

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
          onSendVoice={onSendVoice}
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
