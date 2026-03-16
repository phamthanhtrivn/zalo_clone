import { useParams, Link } from "react-router-dom"
import { ChevronDown, MoreHorizontal } from "lucide-react"
import { cn } from "../../lib/utils"
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar"
import { Button } from "../ui/button"
import { useState } from "react"
import { ConversationType } from "@zalo-clone/shared-types"
import { FloatingPortal } from "@floating-ui/react"

import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate
} from "@floating-ui/react"

type Chat = {
  id: string
  name: string
  lastMsg: string
  time: string
  avatar: string
  type: ConversationType
}

const DUMMY_CHATS: Chat[] = [
  { id: "1", name: "Nguyễn Văn A", lastMsg: "Chào bạn, khỏe không?", time: "12:30", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=A", type: ConversationType.DIRECT },
  { id: "2", name: "Group Dự Án", lastMsg: "Tối nay họp nhé mọi người", time: "11:45", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Project", type: ConversationType.GROUP },
  { id: "3", name: "Trần Thị B", lastMsg: "Đã gửi file báo cáo cho sếp", time: "Hôm qua", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=B", type: ConversationType.DIRECT },
  { id: "4", name: "Lê Văn C", lastMsg: "Oki b", time: "Thứ 2", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=C", type: ConversationType.DIRECT },
  { id: "5", name: "Gia Đình", lastMsg: "Cuối tuần này về quê chơi con nhé", time: "20/02", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Family", type: ConversationType.GROUP }
]

type ChatItemProps = {
  chat: Chat
  activeId?: string
  openMenu: string | null
  setOpenMenu: React.Dispatch<React.SetStateAction<string | null>>
}

const ChatItem = ({ chat, activeId, openMenu, setOpenMenu }: ChatItemProps) => {

  const isActive = activeId === chat.id
  const isDirect = chat.type === ConversationType.DIRECT
  const [hoverMenu, setHoverMenu] = useState<string | null>(null)

  const closeSubMenu = () => setHoverMenu(null)

  const { refs, floatingStyles } = useFloating({
    placement: "bottom-end",
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate
  })

  const {
    refs: subRefs,
    floatingStyles: subFloatingStyles
  } = useFloating({
    placement: "right-start",
    middleware: [offset(4), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate
  })

  return (
    <Link
      to={`/chat/${chat.id}`}
      className={cn(
        "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors group relative",
        isActive ? "bg-[#e5efff]" : "hover:bg-[#f3f5f6]"
      )}
    >

      <Avatar className="w-12 h-12">
        <AvatarImage src={chat.avatar} alt={chat.name} />
        <AvatarFallback>{chat.name.charAt(0)}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">

        <div className="flex items-center justify-between mb-0.5">

          <h4 className="text-sm font-medium truncate">{chat.name}</h4>

          <div className="flex items-center gap-2">

            <span className="text-[11px] text-gray-400">{chat.time}</span>

            <div ref={refs.setReference}>
              <MoreHorizontal
                className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setOpenMenu(openMenu === chat.id ? null : chat.id)
                }}
              />
            </div>

          </div>

        </div>

        <p className="text-[13px] text-gray-500 truncate">
          {chat.lastMsg}
        </p>

      </div>

      {openMenu === chat.id && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="z-50 w-56 bg-white rounded-xl shadow-lg border text-sm"
          >

            <div
              onMouseEnter={closeSubMenu}
              className="p-3 hover:bg-gray-100 cursor-pointer"
            >
              Ghim hội thoại
            </div>

            {/* CATEGORY */}
            <div
              ref={subRefs.setReference}
              onMouseEnter={() => setHoverMenu("category")}
              className="p-3 hover:bg-gray-100 cursor-pointer flex justify-between relative"
            >
              Phân loại <span>›</span>

              {hoverMenu === "category" && (
                <div
                  ref={subRefs.setFloating}
                  style={subFloatingStyles}
                  onMouseEnter={() => setHoverMenu("category")}
                  onMouseLeave={closeSubMenu}
                  className="w-56 bg-white rounded-xl shadow-lg border text-sm"
                >
                  <div className="p-3 hover:bg-gray-100 cursor-pointer flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-500 rounded-sm"></span>
                    Khách hàng
                  </div>

                  <div className="p-3 hover:bg-gray-100 cursor-pointer flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded-sm"></span>
                    Gia đình
                  </div>

                  <div className="p-3 hover:bg-gray-100 cursor-pointer flex items-center gap-2">
                    <span className="w-3 h-3 bg-orange-500 rounded-sm"></span>
                    Công việc
                  </div>

                  <div className="p-3 hover:bg-gray-100 cursor-pointer flex items-center gap-2">
                    <span className="w-3 h-3 bg-purple-500 rounded-sm"></span>
                    Bạn bè
                  </div>

                  <div className="p-3 hover:bg-gray-100 cursor-pointer flex items-center gap-2">
                    <span className="w-3 h-3 bg-yellow-500 rounded-sm"></span>
                    Trả lời sau
                  </div>

                  <div className="p-3 hover:bg-gray-100 cursor-pointer flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-500 rounded-sm"></span>
                    Đồng nghiệp
                  </div>

                  <div className="border-t"></div>

                  <div className="p-3 hover:bg-gray-100 cursor-pointer">
                    Quản lý thẻ phân loại
                  </div> </div>
              )}
            </div>

            <div
              onMouseEnter={closeSubMenu}
              className="p-3 hover:bg-gray-100 cursor-pointer"
            >
              Đánh dấu chưa đọc
            </div>

            <div className="border-t my-1"></div>

            {isDirect && (
              <div
                onMouseEnter={closeSubMenu}
                className="p-3 hover:bg-gray-100 cursor-pointer"
              >
                Thêm vào nhóm
              </div>
            )}

            {/* MUTE */}
            <div
              onMouseEnter={() => setHoverMenu("mute")}
              className="p-3 hover:bg-gray-100 cursor-pointer flex justify-between relative"
            >
              Tắt thông báo <span>›</span>

              {hoverMenu === "mute" && (
                <div
                  onMouseEnter={() => setHoverMenu("mute")}
                  onMouseLeave={closeSubMenu}
                  className="absolute left-full ml-1 top-0 w-48 bg-white rounded-xl shadow-lg border"
                >
                  <div className="p-3 hover:bg-gray-100 cursor-pointer">Trong 1 giờ</div>
                  <div className="p-3 hover:bg-gray-100 cursor-pointer">Trong 4 giờ</div>
                  <div className="p-3 hover:bg-gray-100 cursor-pointer">Cho đến 8:00 AM</div>
                  <div className="p-3 hover:bg-gray-100 cursor-pointer">Cho đến khi mở lại</div>
                </div>
              )}
            </div>

            <div
              onMouseEnter={closeSubMenu}
              className="p-3 hover:bg-gray-100 cursor-pointer"
            >
              Ẩn trò chuyện
            </div>

            {/* DELETE TIMER */}
            <div
              onMouseEnter={() => setHoverMenu("delete")}
              className="p-3 hover:bg-gray-100 cursor-pointer flex justify-between relative"
            >
              Tin nhắn tự xóa <span>›</span>

              {hoverMenu === "delete" && (
                <div
                  onMouseEnter={() => setHoverMenu("delete")}
                  onMouseLeave={closeSubMenu}
                  className="absolute left-full ml-1 top-0 w-44 bg-white rounded-xl shadow-lg border"
                >
                  <div className="p-3 hover:bg-gray-100 cursor-pointer">1 ngày</div>
                  <div className="p-3 hover:bg-gray-100 cursor-pointer">7 ngày</div>
                  <div className="p-3 hover:bg-gray-100 cursor-pointer">14 ngày</div>
                  <div className="border-t"></div>
                  <div className="p-3 hover:bg-gray-100 cursor-pointer">Không bao giờ</div>
                </div>
              )}
            </div>

            <div className="border-t my-1"></div>

            <div
              onMouseEnter={closeSubMenu}
              className="p-3 text-red-500 hover:bg-gray-100 cursor-pointer"
            >
              Xóa hội thoại
            </div>

            <div
              onMouseEnter={closeSubMenu}
              className="p-3 hover:bg-gray-100 cursor-pointer"
            >
              Báo xấu
            </div>

          </div>
        </FloatingPortal>
      )}

    </Link>
  )
}

export const ChatList = () => {

  const { id } = useParams()
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  return (
    <div className="flex flex-col h-full">

      {/* Tabs */}

      <div className="px-4 py-2 flex items-center justify-between">

        <div className="flex items-center gap-4">
          <button className="text-[13px] font-semibold text-[#0091ff] border-b-2 border-[#0091ff] pb-1">
            Ưu tiên
          </button>

          <button className="text-[13px] font-medium text-gray-500 hover:text-gray-700">
            Khác
          </button>
        </div>

        <div className="flex items-center gap-2">

          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[12px]"
          >
            Phân loại
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>

        </div>

      </div>

      {/* Chat list */}

      <div className="flex-1 overflow-y-auto overflow-x-visible">

        {DUMMY_CHATS.map((chat) => (
          <ChatItem
            key={chat.id}
            chat={chat}
            activeId={id}
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
          />
        ))}

      </div>

    </div>
  )
}