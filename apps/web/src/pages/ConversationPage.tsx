import { useParams } from 'react-router-dom'
import { Phone, Video, Search, PanelsRightBottom, Smile, Paperclip, Image } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar'

const ConversationPage = () => {
  const { id } = useParams()

  // Simplified data for demo
  const chatInfo = {
    name: id === '1' ? 'Nguyễn Văn A' : id === '2' ? 'Group Dự Án' : 'Người dùng Zalo',
    status: 'Vừa mới truy cập',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f4f7f9]">
      {/* Chat Header */}
      <header className="h-[64px] bg-white border-b flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 cursor-pointer">
            <AvatarImage src={chatInfo.avatar} />
            <AvatarFallback>{chatInfo.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-[16px] font-semibold leading-none mb-1 cursor-pointer hover:underline">{chatInfo.name}</h3>
            <span className="text-[12px] text-gray-400 font-medium">{chatInfo.status}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-gray-600 rounded-md">
            <Search className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-600 rounded-md">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-600 rounded-md">
            <Video className="w-5 h-5" />
          </Button>
          <div className="w-[1px] h-6 bg-gray-200 mx-1"></div>
          <Button variant="ghost" size="icon" className="text-gray-600 rounded-md">
            <PanelsRightBottom className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Date separator */}
        <div className="flex justify-center my-6">
          <span className="bg-gray-200 text-gray-500 text-[11px] px-3 py-0.5 rounded-full font-semibold uppercase tracking-wider">Hôm nay</span>
        </div>

        {/* Message examples */}
        <div className="flex items-end gap-2">
          <Avatar className="w-8 h-8 mb-1">
            <AvatarImage src={chatInfo.avatar} />
            <AvatarFallback>{chatInfo.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="max-w-[70%] group">
            <div className="bg-white rounded-xl rounded-bl-none p-3 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-800">Chào bạn, mình mới join group. Có cần lưu ý gì không?</p>
            </div>
            <span className="text-[10px] text-gray-400 mt-1 ml-1">12:30</span>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <div className="max-w-[70%] group text-right">
            <div className="bg-[#e5efff] rounded-xl rounded-br-none p-3 shadow-sm inline-block text-left">
              <p className="text-sm text-[#005AE0]">Chào mừng bạn nhé! Bạn đọc kỹ phần note của nhóm là được.</p>
            </div>
            <div className="flex items-center justify-end gap-1 mt-1 mr-1">
              <span className="text-[10px] text-gray-400">Đã xem</span>
              <span className="text-[10px] text-gray-400">12:35</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Input Area */}
      <div className="bg-white border-t p-2 space-y-1">
        <div className="flex items-center gap-1 px-2">
          <Button variant="ghost" size="icon" className="w-8 h-8 text-gray-500"><Smile className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" className="w-8 h-8 text-gray-500"><Paperclip className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" className="w-8 h-8 text-gray-500"><Image className="w-5 h-5" /></Button>
          <div className="flex-1"></div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder={`Nhập @, tin nhắn tới ${chatInfo.name}`}
            className="flex-1 border-none bg-transparent bg-white h-11 focus-visible:ring-0 text-sm shadow-none"
          />
          <Button variant="ghost" size="icon" className="w-10 h-10 text-[#0068ff] hover:bg-transparent">
            <span className="font-bold text-sm">GỬI</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ConversationPage