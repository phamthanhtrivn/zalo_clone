import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import ChatHeader from "@/components/layout/ChatHeader";
import MessageList from "@/components/layout/MessageList";
import ChatInput from "@/components/layout/ChatInput";
import ConversationInfoPanel from "@/components/layout/ConversationInfoPanel";
import { messageService } from "@/services/message.service";

const ConversationPage = () => {
  const { id } = useParams();
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);

  const chatInfo = {
    name:
      id === "1"
        ? "Nguyễn Văn A"
        : id === "2"
          ? "Group Dự Án"
          : "Người dùng Zalo",
    status: "Vừa mới truy cập",
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
  };

  const handleLoadMessagesFromConversation = async () => {
    try {
      if (id) {
        const res = await messageService.getMessagesFromConversation(
          id,
          "699d2b94f9075fe800282901",
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
      <div className="flex-1 flex flex-col h-full bg-[#f4f7f9] min-w-0">
        <ChatHeader
          chatInfo={chatInfo}
          isInfoOpen={isInfoOpen}
          toggleInfo={() => setIsInfoOpen(!isInfoOpen)}
        />

        <MessageList chatInfo={chatInfo} />

        <ChatInput chatName={chatInfo.name} />
      </div>

      <ConversationInfoPanel chatInfo={chatInfo} isOpen={isInfoOpen} />
    </div>
  );
};

export default ConversationPage;
