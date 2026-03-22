import { useLocation, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import ChatHeader from "@/components/layout/ChatHeader";
import MessageList from "@/components/layout/MessageList";
import ChatInput from "@/components/layout/ChatInput";
import ConversationInfoPanel from "@/components/layout/ConversationInfoPanel";
import { messageService } from "@/services/message.service";
import type { MessagesType } from "@/types/messages..type";
import { io } from "socket.io-client";
const CURRENT_USER_ID = "699d2b94f9075fe800282901";

const ConversationPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const { conversation } = location.state || {};

  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [messages, setMessages] = useState<MessagesType[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

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

        requestAnimationFrame(() => {
          const newHeight = container.scrollHeight;
          container.scrollTop = newHeight - prevHeight;
        });
      }
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

  useEffect(() => {
    setMessages([]);
    setNextCursor(null);
    isFirstLoad.current = true;

    handleLoadMessagesFromConversation();
  }, [id]);

  useEffect(() => {
    if (containerRef.current && isFirstLoad.current && messages.length) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      isFirstLoad.current = false;
    }
  }, [messages]);

  useEffect(() => {
    const socket = io("http://localhost:3000");

    if (id) {
      socket.emit('joinRoom', id); // tham gia room conversation hiện tại
    }

    socket.on('messages_expired', ({ messageIds }: { messageIds: string[] }) => {
      setMessages(prev =>
        prev.filter(msg => !messageIds.includes(msg._id.toString()))
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);
  return (
    <div className="flex flex-1 h-full">
      {conversation && (
        <div className="flex-1 flex flex-col h-full bg-[#EBECF0] min-w-0">
          <ChatHeader
            conversation={conversation}
            isInfoOpen={isInfoOpen}
            toggleInfo={() => setIsInfoOpen(!isInfoOpen)}
          />

          <MessageList
            messages={messages}
            currentUserId={CURRENT_USER_ID}
            containerRef={containerRef}
            handleScrollToTop={handleScrollToTop}
          />

          <ChatInput chatName={conversation.name} />
        </div>
      )}

      <ConversationInfoPanel isOpen={isInfoOpen} />
    </div>
  );
};

export default ConversationPage;
