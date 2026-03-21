import { Avatar, AvatarImage, AvatarFallback } from "../../ui/avatar";
import { Quote, MoreHorizontal } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { ReactionPicker } from "./ReactionPicker";
import { ReactionSummary } from "./ReactionSummary";
import type { MessagesType, ReactionType } from "@/types/messages.type";
import type { EmojiType } from "@/constants/emoji.constant";
import { useState, useEffect } from "react";
import { BsPinAngle } from "react-icons/bs";
import { IoIosInformationCircleOutline } from "react-icons/io";
import { CgUndo } from "react-icons/cg";

interface Props {
  message: MessagesType;
  isMe: boolean;
  showAvatar: boolean;
  showTime: boolean;
  reactionMessage: (emojiType: EmojiType, messageId: string) => void;
  onOpenReactionModal: (reactions: ReactionType[]) => void;
  removeReaction: (messageId: string) => void;
  handleRecalledMessage: (messageId: string) => void;
}

export const MessageItem = ({
  message,
  isMe,
  showAvatar,
  showTime,
  reactionMessage,
  onOpenReactionModal,
  removeReaction,
  handleRecalledMessage,
}: Props) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

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
        className={`flex group items-center gap-2 ${
          isMe ? "flex-row-reverse" : "flex-row"
        }`}
      >
        <div className="relative flex group/bubble">
          <MessageBubble message={message} isMe={isMe} showTime={showTime} />

          {!message.recalled && (
            <>
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
            </>
          )}
        </div>

        {/* ACTIONS */}
        {!message.recalled && (
          <div
            className="
            relative flex items-center gap-1
            opacity-0 group-hover:opacity-100
            transition-all duration-200
          "
          >
            <button
              title="Trả lời"
              className="cursor-pointer w-7 h-7 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 text-gray-600 hover:bg-gray-50 hover:text-blue-500"
            >
              <Quote size={10} className="fill-current" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(openMenuId === message._id ? null : message._id);
              }}
              title="Thêm"
              className="cursor-pointer w-7 h-7 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 text-gray-600 hover:bg-gray-50 hover:text-blue-500"
            >
              <MoreHorizontal size={10} />
            </button>

            {/* MENU MORE ACTION */}
            {openMenuId === message._id && (
              <div
                className={`
                absolute top-1/2 -translate-y-1/2
                ${isMe ? "right-full mr-2" : "left-full ml-2"}
                w-44 bg-white border border-gray-200 rounded-xl shadow-xl z-50
                py-1
                animate-in fade-in zoom-in-95 duration-150
              `}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Ghim */}
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => {
                    console.log("Ghim", message._id);
                    setOpenMenuId(null);
                  }}
                >
                  <BsPinAngle className="text-base text-gray-500" />
                  <span>Ghim tin nhắn</span>
                </button>

                {/* Chi tiết */}
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => {
                    console.log("Chi tiết", message._id);
                    setOpenMenuId(null);
                  }}
                >
                  <IoIosInformationCircleOutline className="text-base text-gray-500" />
                  <span>Xem chi tiết</span>
                </button>

                {/* Divider */}
                {isMe && (
                  <>
                    <div className="my-1 border-t border-gray-200" />

                    <button
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                      onClick={() => {
                        handleRecalledMessage(openMenuId);
                        setOpenMenuId(null);
                      }}
                    >
                      <CgUndo className="text-base" />
                      <span>Thu hồi</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
