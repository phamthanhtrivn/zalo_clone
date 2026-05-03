import { Video, Search, Loader2 } from "lucide-react";
import React, { useState } from "react";
import { MdGroupAdd } from "react-icons/md";
import { LuPanelRight, LuPanelRightClose } from "react-icons/lu";
import { RiVerifiedBadgeFill } from "react-icons/ri";
import type { ConversationItemType } from "@/types/conversation-item.type";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { MessagesType } from "@/types/messages.type";
import PinnedMessagesBar from "./PinnedMessagesBar";
import { useCall } from "@/contexts/VideoCallContext";
import { useAppSelector } from "@/store";
import { messageService } from "@/services/message.service";
import { CallType } from "@/constants/types";
import { getAvatarData, getColorByName } from "@/utils/avatar-utils";
import { Users } from "lucide-react";

type ChatHeaderProps = {
  conversation: ConversationItemType;
  isInfoOpen: boolean;
  toggleInfo: () => void;
  pinnedMessages: MessagesType[];
  handlePinnedMessage: (messageId: string) => void;
  handleJumpToMessage: (messageId: string) => void;
  isSearchOpen: boolean;
  toggleSearch: () => void;
};

const ChatHeader = ({
  conversation,
  isInfoOpen,
  toggleInfo,
  pinnedMessages,
  handlePinnedMessage,
  handleJumpToMessage,
  isSearchOpen,
  toggleSearch,
}: ChatHeaderProps) => {
  const { callUser } = useCall();
  const currentUserId = useAppSelector((state) => state.auth.user?.userId);
  const [isInitializingCall, setIsInitializingCall] = useState(false);

  const otherMemberId =
    conversation?.participants?.find((id: string) => id !== currentUserId) ||
    (conversation as any)?.otherMemberId;

  const handleVideoCall = async () => {
    if (
      !conversation.conversationId ||
      !otherMemberId ||
      !currentUserId ||
      isInitializingCall
    ) {
      console.log("Không đủ thông tin hoặc đang khởi tạo cuộc gọi");
      return;
    }

    setIsInitializingCall(true);
    try {
      console.log("1. Đang tạo bản ghi cuộc gọi trong DB");

      const response = await messageService.createCallMessage({
        conversationId: conversation.conversationId,
        senderId: currentUserId,
        type: CallType.VIDEO,
      });

      const messageId =
        response.data?._id || response.data?.id || response?._id;

      if (!messageId) {
        throw new Error("Không nhận được messageId từ server");
      }

      console.log("2. Đã có messageId:", messageId, "Bắt đầu kết nối WebRTC");

      callUser(
        otherMemberId,
        conversation.conversationId,
        CallType.VIDEO,
        messageId,
        conversation.name,
        conversation.avatar,
      );
    } catch (error) {
      console.log("Lỗi khi khởi tạo cuộc gọi:", error);
    } finally {
      setIsInitializingCall(false);
    }
  };

  return (
    <>
      <header className="h-16 bg-white border-b flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border-0 shadow-sm">
            <AvatarImage src={conversation?.avatar} />
            <AvatarFallback
              className="text-white font-bold"
              style={{ backgroundColor: getColorByName(conversation.name) }}
            >
              {(() => {
                const { initials, isGroupIcon } = getAvatarData(conversation.name);
                return isGroupIcon ? <Users className="w-5 h-5" /> : initials;
              })()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <h3 className="text-[16px] font-semibold text-gray-800 truncate flex items-center gap-1">
              {conversation.name}
              {conversation.type === "AI" && (
                <RiVerifiedBadgeFill className="text-[#0091ff] shrink-0" size={16} />
              )}
            </h3>
            <span className="text-[12px] text-gray-400"></span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon">
            <MdGroupAdd />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleVideoCall}
            disabled={isInitializingCall}
          >
            {isInitializingCall ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Video />
            )}
          </Button>

          <Button
            variant={isSearchOpen ? "default" : "ghost"}
            size="icon"
            onClick={toggleSearch}
          >
            <Search color={isSearchOpen ? "white" : "currentColor"} />
          </Button>

          <Button
            variant={isInfoOpen ? "default" : "ghost"}
            size="icon"
            onClick={toggleInfo}
          >
            {isInfoOpen ? (
              <LuPanelRightClose color="white" />
            ) : (
              <LuPanelRight />
            )}
          </Button>
        </div>
      </header>

      <PinnedMessagesBar
        pinnedMessages={pinnedMessages}
        handlePinnedMessage={handlePinnedMessage}
        onClickMessage={handleJumpToMessage}
      />
    </>
  );
};

export default ChatHeader;
