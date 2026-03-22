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

const CURRENT_USER_ID = "699d2b94f9075fe800282901";

const ConversationPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const { conversation } = location.state || {};

  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<MessagesType[]>([]);
  const [messages, setMessages] = useState<MessagesType[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null); // mốc để lấy tin nhắn cũ hơn
  const [prevCursor, setPrevCursor] = useState<string | null>(null); // mốc để lấy tin nhắn mới hơn

  const containerRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);

  const handleScrollToTop = async () => {
    const container = containerRef.current;
    if (!container || !nextCursor || !id) return;

    if (container.scrollTop === 0) {
      const prevHeight = container.scrollHeight;

      const res = await messageService.getMessagesFromConversation(
        id,
        CURRENT_USER_ID,
        nextCursor,
        10,
      );

      if (res.success) {
        setMessages((prev) => [...res.data.messages, ...prev]);
        setNextCursor(res.data.nextCursor);

        const lastMsg = res.data.messages[res.data.messages.length - 1]?._id;
        setPrevCursor(lastMsg?._id || null);

        requestAnimationFrame(() => {
          const newHeight = container.scrollHeight;
          container.scrollTop = newHeight - prevHeight;
        });
      }
    }
  };

  const handleScrollToBottom = async () => {
    const container = containerRef.current;
    if (!container || !prevCursor || !id) return;

    const isBottom =
      container.scrollHeight - container.scrollTop === container.clientHeight;

    if (isBottom) {
      const res = await messageService.getNewerMessages(
        id,
        CURRENT_USER_ID,
        prevCursor,
        10,
      );

      if (res.success && res.data.messages.length) {
        setMessages((prev) => [...prev, ...res.data.messages]);

        // update cursor
        const lastMsg = res.data.messages[res.data.messages.length - 1];
        setPrevCursor(lastMsg._id);
      }
    }
  };

  const handleJumpToMessage = async (messageId: string) => {
    if (!id) return;

    const res = await messageService.getMessagesAroundPinnedMessage(
      id,
      CURRENT_USER_ID,
      messageId,
      15,
    );

    if (res.success) {
      const data = res.data;

      // replace list
      setMessages(data.messages);

      // set lại cursor
      setNextCursor(data.nextCursor);
      setPrevCursor(data.prevCursor);

      // scroll tới message
      setTimeout(() => {
        const el = document.getElementById(messageId);
        if (el) {
          el.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 0);
    }
  };

  const handleLoadMessagesFromConversation = async () => {
    if (!id) return;

    try {
      const res = await messageService.getMessagesFromConversation(
        id,
        CURRENT_USER_ID,
        null,
        10,
      );

      if (res.success) {
        setMessages(res.data.messages);
        setNextCursor(res.data.nextCursor);
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
      const res = await messageService.getPinnedMessages(id, CURRENT_USER_ID);

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
        CURRENT_USER_ID,
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
        CURRENT_USER_ID,
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
      await messageService.recalledMessage(CURRENT_USER_ID, messageId, id);
    } catch (error) {
      toastAlert("Bạn chỉ có thể thu hồi tin nhắn trong vòng 24 giờ");
      console.error(error);
    }
  };

  const handlePinnedMessage = async (messageId: string) => {
    if (!id) return;

    try {
      await messageService.pinnedMessage(CURRENT_USER_ID, messageId, id);
    } catch (error) {
      toastAlert("Bạn chỉ có thể ghim tối đa 3 tin nhắn");
      console.error(error);
    }
  };

  useEffect(() => {
    setMessages([]);
    setPinnedMessages([]);
    setNextCursor(null);
    setPrevCursor(null);

    isFirstLoad.current = true;

    handleLoadMessagesFromConversation();
    handleLoadPinnedMessages();
  }, [id]);

  useEffect(() => {
    if (containerRef.current && isFirstLoad.current && messages.length) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      isFirstLoad.current = false;
    }
  }, [messages]);

  useEffect(() => {
    const handleMediaLoaded = () => {
      if (!containerRef.current) return;

      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    };

    window.addEventListener("message-media-loaded", handleMediaLoaded);

    return () => {
      window.removeEventListener("message-media-loaded", handleMediaLoaded);
    };
  }, []);

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
            currentUserId={CURRENT_USER_ID}
            containerRef={containerRef}
            handleScrollToTop={handleScrollToTop}
            handleScrollToBottom={handleScrollToBottom}
            reactionMessage={reactionMessage}
            removeReaction={removeReaction}
            handleRecalledMessage={handleRecalledMessage}
            handlePinnedMessage={handlePinnedMessage}
          />

          <ChatInput chatName={conversation.name} />
        </div>
      )}

      <ConversationInfoPanel isOpen={isInfoOpen} />
    </div>
  );
};

export default ConversationPage;
