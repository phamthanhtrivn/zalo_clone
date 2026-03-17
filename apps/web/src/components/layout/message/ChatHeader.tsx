import { Video, Search } from "lucide-react";
import { MdGroupAdd } from "react-icons/md";
import { LuPanelRight, LuPanelRightClose } from "react-icons/lu";
import type { ConversationItemType } from "@/types/conversation-item.type";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type ChatHeaderProps = {
  conversation: ConversationItemType;
  isInfoOpen: boolean;
  toggleInfo: () => void;
};

const ChatHeader = ({
  conversation,
  isInfoOpen,
  toggleInfo,
}: ChatHeaderProps) => {
  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={conversation?.avatar} />
          <AvatarFallback>{conversation.name.charAt(0)}</AvatarFallback>
        </Avatar>

        <div>
          <h3 className="text-[16px] font-semibold">{conversation.name}</h3>
          <span className="text-[12px] text-gray-400"></span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon">
          <MdGroupAdd />
        </Button>

        <Button variant="ghost" size="icon">
          <Video />
        </Button>

        <Button variant="ghost" size="icon">
          <Search />
        </Button>

        <Button
          variant={isInfoOpen ? "default" : "ghost"}
          size="icon"
          onClick={toggleInfo}
        >
          {isInfoOpen ? <LuPanelRightClose color="white" /> : <LuPanelRight />}
        </Button>
      </div>
    </header>
  );
};

export default ChatHeader;
