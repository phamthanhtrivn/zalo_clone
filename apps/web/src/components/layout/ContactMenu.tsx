import { Link, useLocation } from 'react-router-dom'
import { Users, UserPlus } from 'lucide-react'
import { cn } from '../../lib/utils'

export const ContactMenu = () => {
  const location = useLocation()

  const menuItems = [
    { icon: Users, label: 'Danh sách bạn bè', path: '/contacts' },
    { icon: Users, label: 'Danh sách nhóm và cộng đồng', path: '/contacts/groups' },
    { icon: UserPlus, label: 'Lời mời kết bạn', path: '/contacts/requests' },
    { icon: UserPlus, label: 'Lời mời vào nhóm và cộng đồng', path: '/contacts/group-requests' },
  ]

  return (
    <nav className="flex-1 overflow-y-auto pt-2">
      {menuItems.map((item) => {
        const isActive = location.pathname === item.path
        return (
          <Link
            key={item.label}
            to={item.path}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 transition-colors group",
              isActive ? "bg-[#e5efff] text-[#005AE0]" : "hover:bg-[#f3f5f6] text-gray-700"
            )}
          >
            <item.icon className="w-[22px] h-[22px]" />
            <span className="text-[14px]">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
