import { Avatar, AvatarImage, AvatarFallback } from "../../ui/avatar";
import { Quote, MoreHorizontal, Download } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { ReactionPicker } from "./ReactionPicker";
import { ReactionSummary } from "./ReactionSummary";
import type { MessagesType, ReactionType } from "@/types/messages.type";
import type { EmojiType } from "@/constants/emoji.constant";
import { useState, useEffect } from "react";
import { BsPinAngle } from "react-icons/bs";
import { IoIosInformationCircleOutline } from "react-icons/io";
import { CgUndo } from "react-icons/cg";
import { RiUnpinLine } from "react-icons/ri";
import { FaRegTrashAlt } from "react-icons/fa";
import ViewDetailMessageModal from "./ViewDetailMessageModal";
import { FaListCheck } from "react-icons/fa6";
import { useAppDispatch, useAppSelector } from "@/store";
import { setReplyingMessage } from "@/store/slices/conversationSlice";
import { saveAs } from "file-saver";

interface Props {
  message: MessagesType;
  isMe: boolean;
  showAvatar: boolean;
  showTime: boolean;
  reactionMessage: (emojiType: EmojiType, messageId: string) => void;
  onOpenReactionModal: (reactions: ReactionType[]) => void;
  removeReaction: (messageId: string) => void;
  handleRecalledMessage: (messageId: string) => void;
  handlePinnedMessage: (messageId: string) => void;
  handleDeleteMessageForMe: (messageId: string) => void;
  isSelected: boolean;
  setIsSelected: (isSelected: boolean) => void;
  selectedMessages: string[];
  toggleSelectMessage: (messageId: string) => void;
  isGroup: boolean;
  onJumpToMessage?: (messageId: string) => void;
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
  handlePinnedMessage,
  handleDeleteMessageForMe,
  isSelected,
  setIsSelected,
  selectedMessages,
  toggleSelectMessage,
  isGroup,
  onJumpToMessage,
}: Props) => {
  const dispatch = useAppDispatch();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const files = message.content?.files || [];

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const handleDownloadAll = async () => {
    try {
      for (const file of files) {
        const res = await fetch(file.fileKey);
        const blob = await res.blob();
        saveAs(blob, file.fileName);
      }
    } catch (err) {
      console.error("Download all error:", err);
    }
  };

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
        <div className="relative flex flex-col group/bubble">
          {!isMe && isGroup && showAvatar && (
            <div className="text-[12px] text-gray-500 mb-1 ml-1">
              {message.senderId.profile.name}
            </div>
          )}

          <MessageBubble
            message={message}
            isMe={isMe}
            showTime={showTime}
            isSelected={isSelected}
            selectedMessages={selectedMessages}
            toggleSelectMessage={toggleSelectMessage}
            onJumpToMessage={onJumpToMessage}
          />

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
              onClick={() => dispatch(setReplyingMessage(message))}
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

            {/* MENU */}
            {openMenuId === message._id && (
              <div
                className={`
                absolute top-1/2 -translate-y-1/2
                ${isMe ? "right-full mr-2" : "left-full ml-2"}
                w-44 bg-white border border-gray-200 rounded-xl shadow-xl z-50
                py-1
              `}
                onClick={(e) => e.stopPropagation()}
              >

                {files.length > 1 && (
                  <button
                    onClick={handleDownloadAll}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                  >
                    <Download size={14} />
                    Tải tất cả ({files.length})
                  </button>
                )}

                {files.length > 1 && <div className="my-1 border-t" />}

                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    handlePinnedMessage(openMenuId);
                    setOpenMenuId(null);
                  }}
                >
                  {!message.pinned ? (
                    <>
                      <BsPinAngle /> <span>Ghim</span>
                    </>
                  ) : (
                    <>
                      <RiUnpinLine /> <span>Bỏ ghim</span>
                    </>
                  )}
                </button>

                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    setIsSelected(true);
                    toggleSelectMessage(message._id);
                    setOpenMenuId(null);
                  }}
                >
                  <FaListCheck /> <span>Chọn nhiều</span>
                </button>

                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    setShowDetailModal(true);
                    setOpenMenuId(null);
                  }}
                >
                  <IoIosInformationCircleOutline />
                  <span>Chi tiết</span>
                </button>

                <div className="my-1 border-t" />

                {isMe && (
                  <button
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 cursor-pointer"
                    onClick={() => {
                      handleRecalledMessage(openMenuId);
                      setOpenMenuId(null);
                    }}
                  >
                    <CgUndo /> <span>Thu hồi</span>
                  </button>
                )}

                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 cursor-pointer"
                  onClick={() => handleDeleteMessageForMe(message._id)}
                >
                  <FaRegTrashAlt /> <span>Xóa phía tôi</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showDetailModal && (
        <ViewDetailMessageModal
          selectedMessage={message}
          setShowDetailModal={() => setShowDetailModal(false)}
        />
      )}
    </div>
  );
};
