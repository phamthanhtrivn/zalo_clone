import { UserPlus } from 'lucide-react'

const ContactRequest = () => {
  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      <header className="h-[64px] border-b border-[#e5e7eb] flex items-center px-4 shrink-0">
        <div className="flex items-center gap-3">
          <UserPlus className="w-5 h-5 text-gray-600" />
          <h1 className="text-[16px] font-semibold text-gray-800">Lời mời kết bạn</h1>
        </div>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f4f7f9] p-4 text-center">
        <div className="text-gray-400 space-y-2">
          <UserPlus className="w-16 h-16 mx-auto opacity-20" />
          <p className="text-sm">Nội dung đã được tối giản theo yêu cầu.</p>
        </div>
      </div>
    </div>
  )
}

export default ContactRequest
