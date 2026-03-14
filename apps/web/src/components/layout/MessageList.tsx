import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar"

const MessageList = ({ chatInfo }: any) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">

      <div className="flex justify-center my-6">
        <span className="bg-gray-200 text-gray-500 text-xs px-3 py-1 rounded-full">
          Hôm nay
        </span>
      </div>

      <div className="flex items-end gap-2">
        <Avatar className="w-8 h-8">
          <AvatarImage src={chatInfo.avatar} />
          <AvatarFallback>{chatInfo.name.charAt(0)}</AvatarFallback>
        </Avatar>

        <div className="bg-white rounded-xl p-3 border">
          Chào bạn, mình mới join group
        </div>
      </div>

      <div className="flex justify-end">
        <div className="bg-[#e5efff] rounded-xl p-3 text-[#005AE0]">
          Chào mừng bạn nhé
        </div>
      </div>

    </div>
  )
}

export default MessageList