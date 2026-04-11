import type { ConversationItemType } from "@/types/conversation-item.type";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn } from "@/lib/utils";
import { formatMessageTime } from "@/utils/format-message-time..util";
import { MoreHorizontal } from "lucide-react";
import { MdGroups } from "react-icons/md";
import React, { useMemo } from "react";
import { CiImageOn } from "react-icons/ci";
import { RiVideoLine } from "react-icons/ri";
import { LuSticker } from "react-icons/lu";
import { HiMiniLink } from "react-icons/hi2";
import { GoFileSymlinkFile } from "react-icons/go";

type Props = {
  conversation: ConversationItemType;
  isActive: boolean;
};

const ConversationListItem = ({ conversation, isActive }: Props) => {
  const getPreviewContent = useMemo(() => {
    const content = conversation.lastMessage?.content;
    const recalled = conversation.lastMessage?.recalled;
    if (recalled) return "Tin nhắn đã được thu hồi";

    if (!content) return "";

    let icon = null;
    let text = "";

    if (content.text && /https?:\/\//.test(content.text)) {
      icon = <HiMiniLink />;
      text = content.text;
    } else if (content.icon) {
      icon = <LuSticker />;
      text = "Sticker";
    } else if (content.file) {
      switch (content.file.type) {
        case "IMAGE":
          icon = <CiImageOn />;
          text = "Hình ảnh";
          break;
        case "VIDEO":
          icon = <RiVideoLine />;
          text = "Video";
          break;
        case "FILE":
          icon = <GoFileSymlinkFile />;
          text = content.file.fileName;
          break;
        default:
          text = "";
      }
    } else if (content.text) {
      text = content.text;
    }

    return (
      <div className="flex items-center gap-1 truncate">
        {icon}
        <span className="truncate">{text}</span>
      </div>
    );
  }, [conversation.lastMessage]);

  return (
    <Link
      to={`/conversation/${conversation.conversationId}`}
      state={{
        conversation,
      }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors group mt-2 mx-2 rounded-lg",
        isActive ? "bg-[#e5efff]" : "hover:bg-[#f3f5f6]",
      )}
    >
      <Avatar className="w-12 h-12">
        <AvatarImage src={conversation.avatar} alt={conversation.name} />
        <AvatarFallback>{conversation.name.charAt(0)}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <h4
            className={cn(
              "text-sm font-medium truncate flex gap-2 items-center",
              isActive ? "text-black" : "text-gray-900",
            )}
          >
            {conversation.type === "GROUP" && (
              <MdGroups size={20} color="gray" />
            )}{" "}
            {conversation.name}
          </h4>

          <div className="relative flex items-center">
            {/* time */}
            <span className="text-[11px] text-gray-400 transition-opacity group-hover:opacity-0">
              {formatMessageTime(conversation.lastMessageAt)}
            </span>

            {/* button */}
            <button className="absolute right-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="w-4 h-4 text-gray-500 hover:text-black" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[13px] text-gray-500 truncate">
          {conversation.type === "PRIVATE" &&
            conversation.lastMessage?.senderName !== "Bạn"
            ? ""
            : conversation.lastMessage?.senderName + ": "}
          {getPreviewContent}
        </div>
      </div>
    </Link>
  );
};

export default React.memo(ConversationListItem);
