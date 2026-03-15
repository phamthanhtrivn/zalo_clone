import { useLocation, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import ChatHeader from "@/components/layout/ChatHeader";
import MessageList from "@/components/layout/MessageList";
import ChatInput from "@/components/layout/ChatInput";
import ConversationInfoPanel from "@/components/layout/ConversationInfoPanel";
import { messageService } from "@/services/message.service";

const ConversationPage = () => {
  const userId = "699d2b94f9075fe800282901";
  const { id } = useParams();
  const location = useLocation();
  const { conversation } = location.state || {};

  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);

  const handleLoadMessagesFromConversation = async () => {
    try {
      if (id) {
        const res = await messageService.getMessagesFromConversation(
          id,
          userId,
          nextCursor,
          15,
        );
        if (res.success) {
          setMessages(res.data.messages);
          setNextCursor(res.data.nextCursor);
        } else {
          console.error(res);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    handleLoadMessagesFromConversation();
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

          <MessageList messages={messages} currentUserId={userId} />

          <ChatInput chatName={conversation.name} />
        </div>
      )}

      <ConversationInfoPanel isOpen={isInfoOpen} />
    </div>
  );
};

export default ConversationPage;
