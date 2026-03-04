import { useParams, Link } from 'react-router-dom'
import { ChevronDown, MoreHorizontal } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar'
import { Button } from '../ui/button'

const DUMMY_CHATS = [
  { id: '1', name: 'Nguyễn Văn A', lastMsg: 'Chào bạn, khỏe không?', time: '12:30', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=A' },
  { id: '2', name: 'Group Dự Án', lastMsg: 'Tối nay họp nhé mọi người', time: '11:45', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Project', isGroup: true },
  { id: '3', name: 'Trần Thị B', lastMsg: 'Đã gửi file báo cáo cho sếp', time: 'Hôm qua', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=B' },
  { id: '4', name: 'Lê Văn C', lastMsg: 'Oki b', time: 'Thứ 2', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=C' },
  { id: '5', name: 'Gia Đình', lastMsg: 'Cuối tuần này về quê chơi con nhé', time: '20/02', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Family', isGroup: true },
]

export const ChatList = () => {
  const { id } = useParams()

  return (
    <div className="flex flex-col h-full">
      {/* Tabs/Filters */}
      <div className="px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4 border-b border-transparent">
          <button className="text-[13px] font-semibold text-[#0091ff] border-b-2 border-[#0091ff] pb-1">Ưu tiên</button>
          <button className="text-[13px] font-medium text-gray-500 hover:text-gray-700 transition-colors pb-1">Khác</button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[12px] font-medium text-gray-500 hover:bg-[#f1f2f4]">
            Phân loại <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:bg-[#f1f2f4]">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {DUMMY_CHATS.map((chat) => {
          const isActive = id === chat.id
          return (
            <Link
              key={chat.id}
              to={`/chat/${chat.id}`}
              className={cn(
                "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors group",
                isActive ? "bg-[#e5efff]" : "hover:bg-[#f3f5f6]"
              )}
            >
              <Avatar className="w-12 h-12">
                <AvatarImage src={chat.avatar} alt={chat.name} />
                <AvatarFallback>{chat.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h4 className={cn("text-sm font-medium truncate", isActive ? "text-black" : "text-gray-900")}>
                    {chat.name}
                  </h4>
                  <span className="text-[11px] text-gray-400">{chat.time}</span>
                </div>
                <p className="text-[13px] text-gray-500 truncate">{chat.lastMsg}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
