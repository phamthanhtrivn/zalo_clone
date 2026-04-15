import { useParams } from "react-router-dom";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { Button } from "../ui/button";
import ConversationListItem from "./ConversationListItem";
import { useAppSelector } from "@/store";
import { useMemo, useState } from "react";


const ConversationList = () => {
  const { id } = useParams();
  const conversations = useAppSelector(
    (state) => state.conversation.conversations,
  );
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }

      return (
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );
    });
  }, [conversations]);

  return (
    <div className="flex flex-col h-full">
      {/* Tabs/Filters */}
      <div className="px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4 border-b border-transparent">
          <button className="text-[13px] font-semibold text-[#0091ff] border-b-2 border-[#0091ff] pb-1">
            Ưu tiên
          </button>
          <button className="text-[13px] font-medium text-gray-500 hover:text-gray-700 transition-colors pb-1">
            Khác
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[12px] font-medium text-gray-500 hover:bg-[#f1f2f4]"
          >
            Phân loại <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-500 hover:bg-[#f1f2f4]"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 && (
          <div className="text-center text-sm text-gray-400 py-6">
            Không có cuộc trò chuyện nào
          </div>
        )}

        {sortedConversations.filter(c => !c.hidden).map((c) => (
          <ConversationListItem
            key={c.conversationId}
            conversation={c}
            isActive={id === c.conversationId}
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
          />
        ))}
      </div>
    </div>

  );
};

export default ConversationList;
