import { Smile, Paperclip, Image } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const ChatInput = ({ chatName }: any) => {
  return (
    <div className="bg-white border-t p-2 space-y-1">
      <div className="flex items-center gap-1 px-2">
        <Button variant="ghost" size="icon" className="w-8 h-8 text-gray-500">
          <Smile className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="w-8 h-8 text-gray-500">
          <Paperclip className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="w-8 h-8 text-gray-500">
          <Image className="w-5 h-5" />
        </Button>
        <div className="flex-1"></div>
      </div>
      <div className="flex items-center gap-2">
        <Input
          placeholder={`Nhập @, tin nhắn tới ${chatName}`}
          className="flex-1 border-none bg-white h-11 focus-visible:ring-0 text-sm shadow-none"
        />
        <Button
          variant="ghost"
          size="icon"   
          className="w-10 h-10 text-[#0068ff] hover:bg-transparent"
        >
          <span className="font-bold text-sm">GỬI</span>
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;
