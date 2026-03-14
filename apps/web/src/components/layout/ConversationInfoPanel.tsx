import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";

const ConversationInfoPanel = ({ chatInfo, isOpen }: any) => {
  return (
    <div
      className={`
        bg-white border-l overflow-hidden
        transition-all duration-300
        ${isOpen ? "w-[320px]" : "w-0"}
      `}
    >
      <div className="h-16 flex items-center px-4 border-b font-semibold">
        Thông tin hội thoại
      </div>

      <div className="p-4 space-y-4">
        <div className="flex flex-col items-center">
          <Avatar className="w-16 h-16">
            <AvatarImage src={chatInfo.avatar} />
            <AvatarFallback>{chatInfo.name.charAt(0)}</AvatarFallback>
          </Avatar>

          <h3 className="mt-2 font-semibold">{chatInfo.name}</h3>
          <span className="text-sm text-gray-400">{chatInfo.status}</span>
        </div>

        <div className="border-t pt-4 space-y-2">
          <Button variant="ghost" className="w-full justify-start">
            Xem thành viên
          </Button>

          <Button variant="ghost" className="w-full justify-start">
            Ảnh / File
          </Button>

          <Button variant="ghost" className="w-full justify-start">
            Ghim tin nhắn
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConversationInfoPanel;
