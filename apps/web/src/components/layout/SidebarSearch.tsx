import { Search, UserPlus, Users } from 'lucide-react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'

export const SidebarSearch = () => {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#0091ff] transition-colors" />
          <Input
            type="text"
            placeholder="Tìm kiếm"
            className="h-8 pl-9 bg-[#f1f2f4] shadow-none border-none focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-[#0091ff]"
          />
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600 hover:bg-[#f1f2f4] cursor-pointer">
          <UserPlus className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600 hover:bg-[#f1f2f4] cursor-pointer">
          <Users className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}
