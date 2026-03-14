import { useParams } from "react-router-dom";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { Button } from "../ui/button";
import { useCallback, useEffect, useState } from "react";
import { conversationService } from "@/services/conversation.service";
import ConversationListItem from "./ConversationListItem";
import type { ConversationItemType } from "@/types/conversation-item.type";
import { useDispatch, useSelector } from "react-redux";
import { setConversations } from "@/store/slices/conversationSlice";

const ConversationList = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const conversations = useSelector(
    (state) => state.conversation.conversations,
  );

  const handleFetchConversations = useCallback(async () => {
    try {
      const res = await conversationService.getConversationsFromUserId(
        "699d2b94f9075fe800282901",
      );

      if (res.success) {
        dispatch(setConversations(res.data));
      } else {
        console.log(res);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    handleFetchConversations();
  }, [handleFetchConversations]);

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

        {conversations.map((c) => (
          <ConversationListItem
            key={c.conversationId}
            conversation={c}
            isActive={id === c.conversationId}
          />
        ))}
      </div>
    </div>
  );
};

export default ConversationList;
