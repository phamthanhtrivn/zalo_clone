import type { ConversationItemType } from "@/types/conversation-item.type";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn } from "@/lib/utils";
import { formatMessageTime } from "@/utils/format-message-time..util";
import { MoreHorizontal } from "lucide-react";
import { MdGroups } from "react-icons/md";
import React, { useMemo } from "react";

type Props = {
  conversation: ConversationItemType;
  isActive: boolean;
};

const ConversationListItem = ({ conversation, isActive }: Props) => {
  const getPreviewContent = useMemo(() => {
    const content = conversation.lastMessage?.content;

    if (!content) return "";
    if (content.text) return content.text;
    if (content.icon) return "[Sticker]";
    if (content.file) return content.file.substring(8);

    return "";
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

        <p className="text-[13px] text-gray-500 truncate">
          {conversation.type === "PRIVATE" &&
          conversation.lastMessage?.senderName !== "Bạn"
            ? ""
            : conversation.lastMessage?.senderName + ": "}
          {getPreviewContent}
        </p>
      </div>
    </Link>
  );
};

export default React.memo(ConversationListItem);
