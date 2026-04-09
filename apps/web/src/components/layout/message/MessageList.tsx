import { memo, useState } from "react";
import {
  getDateLabel,
  isSameHourAndMinute,
} from "@/utils/format-message-time..util";
import type { MessagesType, ReactionType } from "@/types/messages.type";
import type { RefObject } from "react";
import type { EmojiType } from "@/constants/emoji.constant";
import { ReactionModal } from "./ReactionModal";
import { MessageItem } from "./MessageItem";

type Props = {
  messages: MessagesType[];
  currentUserId: string;
  containerRef: RefObject<HTMLDivElement | null>;
  handleScrollToTop: () => void;
  handleScrollToBottom: () => void;
  reactionMessage: (emojiType: EmojiType, messageId: string) => void;
  removeReaction: (messageId: string) => void;
  handleRecalledMessage: (messageId: string) => void;
  handlePinnedMessage: (messageId: string) => void;
  handleDeleteMessageForMe: (messageId: string) => void;
  isSelected: boolean;
  setIsSelected: (isSelected: boolean) => void;
  selectedMessages: string[];
  toggleSelectMessage: (messageId: string) => void;
  onForwardMessages: (
    messageIds: string[],
    targetConversationIds: string[],
  ) => void;
};

const MessageList = ({
  messages,
  currentUserId,
  containerRef,
  handleScrollToTop,
  handleScrollToBottom,
  reactionMessage,
  removeReaction,
  handleRecalledMessage,
  handlePinnedMessage,
  handleDeleteMessageForMe,
  isSelected,
  setIsSelected,
  selectedMessages,
  toggleSelectMessage,
  onForwardMessages,
}: Props) => {
  const [selectedMessageReactions, setSelectedMessageReactions] = useState<
    ReactionType[] | null
  >(null);

  return (
    <div
      ref={containerRef}
      onScroll={() => {
        handleScrollToTop();
        handleScrollToBottom();
      }}
      className="flex-1 overflow-y-auto p-4 space-y-1"
    >
      {selectedMessageReactions && (
        <ReactionModal
          reactions={selectedMessageReactions}
          onClose={() => setSelectedMessageReactions(null)}
        />
      )}
      {messages.map((message, index) => {
        const prev = messages[index - 1];
        const next = messages[index + 1];

        // --- CẢI TIẾN LOGIC TẠI ĐÂY ---
        // 1. Kiểm tra isMe (Dùng optional chaining)
        const isMe =
          message.type !== "SYSTEM" && message.senderId?._id === currentUserId;

        // 2. Logic gom nhóm tin nhắn (Chỉ áp dụng cho tin nhắn không phải SYSTEM)
        const isSystem = message.type === "SYSTEM";

        const sameSenderPrev =
          !isSystem &&
          prev &&
          prev.type !== "SYSTEM" &&
          prev.senderId?._id === message.senderId?._id;

        const sameSenderNext =
          !isSystem &&
          next &&
          next.type !== "SYSTEM" &&
          next.senderId?._id === message.senderId?._id;

        // 3. Kiểm tra thời gian
        const sameMinutePrev =
          prev && isSameHourAndMinute(prev.createdAt, message.createdAt);

        const sameMinuteNext =
          next && isSameHourAndMinute(next.createdAt, message.createdAt);

        // 4. Quyết định hiển thị Avatar và thời gian
        const isFirstInCluster = !(sameSenderPrev && sameMinutePrev);
        const isLastInCluster = !(sameSenderNext && sameMinuteNext);

        const showAvatar = !isSystem && !isMe && isFirstInCluster;
        const showTime = !isSystem && isLastInCluster;

        const showDivider =
          !prev ||
          new Date(prev.createdAt).toDateString() !==
            new Date(message.createdAt).toDateString();

        return (
          <div
            id={message._id}
            key={message._id}
            className={
              message.reactions && message.reactions.length > 0 ? "mb-4" : ""
            }
          >
            {showDivider && (
              <div className="flex justify-center my-4">
                <span className="bg-[#BABBBE] text-white text-xs px-3 py-1 rounded-md">
                  {getDateLabel(message.createdAt)}
                </span>
              </div>
            )}

            <MessageItem
              message={message}
              isMe={isMe}
              showAvatar={showAvatar}
              showTime={showTime}
              reactionMessage={reactionMessage}
              onOpenReactionModal={(reactions) =>
                setSelectedMessageReactions(reactions)
              }
              removeReaction={removeReaction}
              handleRecalledMessage={handleRecalledMessage}
              handlePinnedMessage={handlePinnedMessage}
              handleDeleteMessageForMe={handleDeleteMessageForMe}
              isSelected={isSelected}
              setIsSelected={setIsSelected}
              selectedMessages={selectedMessages}
              toggleSelectMessage={toggleSelectMessage}
              onForwardMessages={onForwardMessages}
            />
          </div>
        );
      })}
    </div>
  );
};

export default memo(MessageList);
