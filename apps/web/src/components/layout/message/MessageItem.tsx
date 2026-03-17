import { Avatar, AvatarImage, AvatarFallback } from "../../ui/avatar";
import { Quote, MoreHorizontal } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { ReactionPicker } from "./ReactionPicker";
import { ReactionSummary } from "./ReactionSummary";
import type { MessagesType, ReactionType } from "@/types/messages.type";
import type { EmojiType } from "@/constants/emoji.constant";

interface Props {
  message: MessagesType;
  isMe: boolean;
  showAvatar: boolean;
  showTime: boolean;
  reactionMessage: (emojiType: EmojiType, messageId: string) => void;
  onOpenReactionModal: (reactions: ReactionType[]) => void;
  removeReaction: (messageId: string) => void;
}

export const MessageItem = ({
  message,
  isMe,
  showAvatar,
  showTime,
  reactionMessage,
  onOpenReactionModal,
  removeReaction
}: Props) => {
  return (
    <div className={`flex items-end gap-2 ${isMe ? "justify-end" : ""}`}>
      {!isMe &&
        (showAvatar ? (
          <Avatar className="w-8 h-8">
            <AvatarImage src={message.senderId.profile?.avatarUrl} />
            <AvatarFallback>
              {message.senderId.profile?.name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-8" />
        ))}

      {/* BUBBLE WRAPPER */}
      <div
        className={`flex group items-center gap-2 ${isMe ? "flex-row-reverse" : "flex-row"
          }`}
      >
        <div className="relative flex group/bubble">
          <MessageBubble message={message} isMe={isMe} showTime={showTime} />

          <ReactionPicker
            messageId={message._id}
            reactionMessage={reactionMessage}
            messageReactions={message.reactions}
            isMe={isMe}
            removeReaction={removeReaction}
          />

          <ReactionSummary
            reactions={message.reactions}
            onClick={onOpenReactionModal}
          />
        </div>

        {/* ACTIONS */}
        <div
          className={`
            flex items-center gap-1
            opacity-0 group-hover:opacity-100
            transition-all duration-200 
          `}
        >
          <button
            title="Trả lời"
            className="cursor-pointer w-7 h-7 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 text-gray-600 hover:bg-gray-50 hover:text-blue-500"
          >
            <Quote size={10} className="fill-current" />
          </button>
          <button
            title="Thêm"
            className="cursor-pointer w-7 h-7 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 text-gray-600 hover:bg-gray-50 hover:text-blue-500"
          >
            <MoreHorizontal size={10} />
          </button>
        </div>
      </div>
    </div>
  );
};
