import { useLocation, useParams } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import ChatHeader from "@/components/layout/message/ChatHeader";
import MessageList from "@/components/layout/message/MessageList";
import ChatInput from "@/components/layout/message/ChatInput";
import ConversationInfoPanel from "@/components/layout/message/ConversationInfoPanel";
import MessageSearchPanel from "@/components/layout/message/MessageSearchPanel";
import { messageService } from "@/services/message.service";
import { userService } from "@/services/user.service";
import type { MessagesType } from "@/types/messages.type";
import { toast, Zoom } from "react-toastify";
import { useSocket } from "@/contexts/SocketContext";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  setConversations,
  clearReplyingMessage,
} from "@/store/slices/conversationSlice";
import { setMessages, prependMessages, appendMessages, updateRecallMessage } from "@/store/slices/messageSlice";
import ForwardModal from "@/components/layout/message/ForwardModal";

const ConversationPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const { conversation: stateConversation, otherUserId: locationOtherUserId } = location.state || {};
  const dispatch = useAppDispatch();

  const currentUser = useAppSelector((state) => state.auth.user);
  const currentUserId = currentUser?.userId || (currentUser as any)?._id || "";

  const conversations = useAppSelector((state) => state.conversation.conversations);
  const replyingMessage = useAppSelector((state) => state.conversation.replyingMessage);
  const messages = useAppSelector((state) => state.message.messagesByConversation[id || ""] || []);

  const conversation = stateConversation || conversations.find((c) => c.conversationId === id);
  const isGroup = conversation?.type === "GROUP";

  const effectiveOtherMemberId = !isGroup ? (conversation?.otherMemberId || locationOtherUserId || null) : null;

  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<MessagesType[]>([]);
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
  const pendingJumpMessageIdRef = useRef<string | null>(null);

  const [isFriend, setIsFriend] = useState<boolean | null>(null);
  const [friendStatus, setFriendStatus] = useState<string | null>(null);

  const lastMessageId = messages[messages.length - 1]?._id;
  const { setActiveConversationId, socket, aiStatus, aiStreamingText, streamingTargetId } = useSocket();
  const selectedMessageId = new URLSearchParams(location.search).get("messageId");


  useEffect(() => {
    setActiveConversationId(id || null);
    return () => setActiveConversationId(null);
  }, [id, setActiveConversationId]);

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
        const res = await userService.checkFriendStatus(effectiveOtherMemberId);
        const friendData = res?.data?.data ?? res?.data;
        if (!cancelled && friendData) {
          setIsFriend(!!friendData.isFriend);
          setFriendStatus(friendData.status ?? null);
        }
      } catch (err) {
        console.error('[FriendStatus] API error:', err);
      }
    };
    check();
    return () => { cancelled = true; };
  }, [id, effectiveOtherMemberId, isGroup, currentUserId]);

  const handleJumpToMessage = async (messageId: string) => {
    if (!id || !currentUserId) return;
    isJumpingRef.current = true;
    const res = await messageService.getMessagesAroundPinnedMessage(id, currentUserId, messageId, 15);
    if (res.success) {
      dispatch(setMessages({ conversationId: id, messages: res.data.messages }));
      setNextCursor(res.data.nextCursor);
      setPrevCursor(res.data.prevCursor);
      setTimeout(() => {
        const el = document.getElementById(messageId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("highlight");
          setTimeout(() => el.classList.remove("highlight"), 5000);
        }
        setTimeout(() => { isJumpingRef.current = false; }, 1000);
      }, 100);
    }
  };

  const handleLoadMessagesFromConversation = async () => {
    if (!id || !currentUserId) return;
    try {
      const res = await messageService.getMessagesFromConversation(id, currentUserId, null, 20);
      if (res.success) {
        dispatch(setMessages({ conversationId: id, messages: res.data.messages }));
        setNextCursor(res.data.nextCursor);
        setPrevCursor(null);
      }
    } catch (error) { console.error(error); }
  };

  const handleLoadPinnedMessages = async () => {
    if (!id || !currentUserId) return;
    try {
      const res = await messageService.getPinnedMessages(id, currentUserId);
      if (res.success) setPinnedMessages(res.data.messages);
    } catch (err) { console.error(err); }
  };

  const handleScrollToTop = async () => {
    const container = containerRef.current;
    if (!container || !nextCursor || !id || !currentUserId || isJumpingRef.current || isFetchingRef.current) return;
    if (container.scrollTop < 100) {
      isFetchingRef.current = true;
      const prevHeight = container.scrollHeight;
      const res = await messageService.getMessagesFromConversation(id, currentUserId, nextCursor, 20);
      if (res.success && res.data.messages.length > 0) {
        dispatch(prependMessages({ conversationId: id, messages: res.data.messages }));
        setNextCursor(res.data.nextCursor);
        requestAnimationFrame(() => { container.scrollTop = container.scrollHeight - prevHeight; });
      } else { setNextCursor(null); }
      isFetchingRef.current = false;
    }
  };

  const handleScrollToBottom = async () => {
    const container = containerRef.current;
    if (!container || !prevCursor || !id || !currentUserId || isJumpingRef.current || isFetchingNewerRef.current) return;
    if (container.scrollHeight - container.scrollTop - container.clientHeight < 100) {
      isFetchingNewerRef.current = true;
      const res = await messageService.getNewerMessages(id, currentUserId, prevCursor, 20);
      if (res.success && res.data.messages.length) {
        dispatch(appendMessages({ conversationId: id, messages: res.data.messages }));
        setPrevCursor(res.data.messages[res.data.messages.length - 1]._id);
      } else { setPrevCursor(null); }
      isFetchingNewerRef.current = false;
    }
  };

  useEffect(() => {
    dispatch(setMessages({ conversationId: id || "", messages: [] }));
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
    setTimeout(() => { handleJumpToMessage(targetMessageId); }, 250);
  }, [messages.length]);


  // Xử lý scroll khi nhận stream message AI
  useEffect(() => {
    if (aiStatus && streamingTargetId === id && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [aiStatus, aiStreamingText, streamingTargetId, id]);

  useEffect(() => {
    if (containerRef.current && isFirstLoad.current && messages.length) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      isFirstLoad.current = false;
    }
  }, [messages.length]);

  const onSendMessage = async (text: string) => {
    if (!id || !currentUserId || !text.trim()) return;
    try {
      await messageService.sendMessage(id, currentUserId, replyingMessage?._id, { text });
      if (replyingMessage) dispatch(clearReplyingMessage());
    } catch (error) { console.error(error); }
  };

  const onSendFiles = async (files: FileList) => {
    if (!id || !currentUserId || !files.length) return;
    try {
      const filesArray = Array.from(files);
      const mediaFiles = filesArray.filter(f => f.type.startsWith("image/") || f.type.startsWith("video/"));
      const docFiles = filesArray.filter(f => !f.type.startsWith("image/") && !f.type.startsWith("video/"));
      const promises: Promise<any>[] = [];
      if (mediaFiles.length > 0) promises.push(messageService.sendMessage(id, currentUserId, replyingMessage?._id, undefined, mediaFiles));
      docFiles.forEach(file => promises.push(messageService.sendMessage(id, currentUserId, replyingMessage?._id, undefined, [file])));
      await Promise.all(promises);
      if (replyingMessage) dispatch(clearReplyingMessage());
    } catch (error) { console.error(error); }
  };

  const handleRecalledMessage = async (messageId: string) => {
    try {
      await messageService.recalledMessage(currentUserId, messageId, id!);
      dispatch(updateRecallMessage({ conversationId: id!, messageId }));
    } catch (err) { toast.error("Bạn chỉ có thể thu hồi tin nhắn trong vòng 24 giờ"); }
  };

  const handlePinnedMessage = async (messageId: string) => {
    try { await messageService.pinnedMessage(currentUserId, messageId, id!); }
    catch (err) { toast.error("Bạn chỉ có thể ghim tối đa 3 tin nhắn"); }
  };

  const handleDeleteMessageForMe = async (messageId: string) => {
    const res = await messageService.deleteMessageForMe(currentUserId, messageId, id!);
    if (res.success) {
      dispatch(setMessages({ conversationId: id!, messages: messages.filter(m => m._id !== messageId) }));
    }
  };

  if (!conversation) return <div className="flex-1 flex items-center justify-center text-gray-500 italic">Hội thoại không tồn tại</div>;

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <div className="flex-1 flex flex-col h-full bg-[#EBECF0] min-w-0">
        <ChatHeader
          conversation={conversation}
          isInfoOpen={isInfoOpen}
          toggleInfo={() => { setIsInfoOpen(!isInfoOpen); setIsSearchOpen(false); }}
          pinnedMessages={pinnedMessages}
          handlePinnedMessage={handlePinnedMessage}
          handleJumpToMessage={handleJumpToMessage}
          isSearchOpen={isSearchOpen}
          toggleSearch={() => { setIsSearchOpen(!isSearchOpen); setIsInfoOpen(false); }}
        />

        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          containerRef={containerRef}
          handleScrollToTop={handleScrollToTop}
          handleScrollToBottom={handleScrollToBottom}
          reactionMessage={(emoji, mid) => messageService.reactionMessage(id!, currentUserId, emoji, mid)}
          removeReaction={(mid) => messageService.removeReaction(currentUserId, mid, id!)}
          handleRecalledMessage={handleRecalledMessage}
          handlePinnedMessage={handlePinnedMessage}
          handleDeleteMessageForMe={handleDeleteMessageForMe}
          isSelected={isSelected}
          setIsSelected={setIsSelected}
          selectedMessages={selectedMessages}
          toggleSelectMessage={(mid) => setSelectedMessages((p) => p.includes(mid) ? p.filter((i) => i !== mid) : [...p, mid])}
          lastMessageId={lastMessageId || ""}
          isGroup={isGroup}
          onJumpToMessage={handleJumpToMessage}
          aiStatus={(streamingTargetId === id || streamingTargetId === currentUserId) ? aiStatus : null}
          aiStreamingText={(streamingTargetId === id || streamingTargetId === currentUserId) ? aiStreamingText : ""}
          aiAvatar={conversation?.type === "AI" ? conversation?.avatar : "https://res.cloudinary.com/dmv766v92/image/upload/v1711111111/ai_avatar_placeholder.png"}
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
        onSubmit={(targetIds) => messageService.forwardMessagesToConversations(currentUserId, selectedMessages, targetIds).finally(() => setShowForwardModal(false))}
      />

      <ConversationInfoPanel isOpen={isInfoOpen} conversation={conversation} onClose={() => setIsInfoOpen(false)} />
      <MessageSearchPanel isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} conversation={conversation} onJumpToMessage={handleJumpToMessage} />
    </div>
  );
};

export default ConversationPage;
