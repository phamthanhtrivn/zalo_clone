import { Video, Search } from "lucide-react"
import { Button } from "../ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar"
import { MdGroupAdd } from "react-icons/md"
import { LuPanelRight, LuPanelRightClose } from "react-icons/lu"

const ChatHeader = ({ chatInfo, isInfoOpen, toggleInfo }: any) => {
  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={chatInfo?.avatar} />
          <AvatarFallback>{chatInfo.name.charAt(0)}</AvatarFallback>
        </Avatar>

        <div>
          <h3 className="text-[16px] font-semibold">{chatInfo.name}</h3>
          <span className="text-[12px] text-gray-400">{chatInfo.status}</span>
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

        <Button variant={isInfoOpen ? "default" : "ghost"} size="icon" onClick={toggleInfo}>
          {isInfoOpen ? <LuPanelRightClose color="white" /> : <LuPanelRight />}
        </Button>
      </div>
    </header>
  )
}

export default ChatHeader