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
  lastMessageId: string;
  isGroup: boolean;
  onJumpToMessage?: (messageId: string) => void;
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
  lastMessageId,
  isGroup,
  onJumpToMessage,
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

        // 1. Kiểm tra isMe và isSystem
        const isMe =
          message.type !== "SYSTEM" && message.senderId?._id === currentUserId;
        const isSystem = message.type === "SYSTEM";

        // 2. Logic gom nhóm tin nhắn
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

        const sameMinutePrev =
          prev && isSameHourAndMinute(prev.createdAt, message.createdAt);
        const sameMinuteNext =
          next && isSameHourAndMinute(next.createdAt, message.createdAt);

        const isFirstInCluster = !(sameSenderPrev && sameMinutePrev);
        const isLastInCluster = !(sameSenderNext && sameMinuteNext);

        // 3. Hiển thị Avatar, Thời gian và Divider ngày
        const showAvatar = !isSystem && !isMe && isFirstInCluster;
        const showTime = !isSystem && isLastInCluster;
        const isLastMessage = lastMessageId === message._id;

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
              isGroup={isGroup}
              onJumpToMessage={onJumpToMessage}
            />

            {isLastMessage && !message.recalled && message.readReceipts && message.readReceipts.length > 0 && (
              <div className={`flex ${isMe ? "justify-end" : "justify-start ml-11"} mt-1 pr-1`}>
                <div className="flex items-center">
                  {message.readReceipts.slice(0, 3).map((receipt: any, idx: number) => {
                    const avatarUrl = receipt.userId?.profile?.avatarUrl;
                    const userName = receipt.userId?.profile?.name || 'User';

                    return (
                      <img
                        key={idx}
                        src={avatarUrl}
                        className="w-4 h-4 rounded-full border border-white"
                        alt={userName}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const fallback = document.createElement('div');
                            fallback.className = 'w-4 h-4 rounded-full bg-gray-400 border border-white flex items-center justify-center text-[8px] text-white';
                            fallback.textContent = userName.charAt(0).toUpperCase();
                            parent.insertBefore(fallback, target);
                          }
                        }}
                      />
                    );
                  })}
                  {message.readReceipts.length > 3 && (
                    <div className="w-4 h-4 rounded-full bg-gray-300 text-[10px] flex items-center justify-center border border-white">
                      +{message.readReceipts.length - 3}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default memo(MessageList);
