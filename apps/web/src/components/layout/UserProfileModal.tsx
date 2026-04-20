import React from "react";
import {
  X,
  Users,
  Contact2,
  Slash,
  Phone,
  MessageSquare,
  Delete,
} from "lucide-react";
import formatBirthday from "@/helper/formatBirthday";

const UserProfileModal = ({ user, onClose, onBlock, onDelete }: any) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-[1px] p-4">
      <div className="w-[400px] max-h-[90vh] bg-white shadow-2xl rounded-sm overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        {/* 1. Header - Cố định (Sticky) */}
        <div className="sticky top-0 z-20 bg-white flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h1 className="text-base font-semibold">Thông tin tài khoản</h1>
          <button
            onClick={onClose}
            className="text-gray-500 hover:bg-gray-100 p-1 rounded-full transition-all"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* 2. Cover & Avatar Area */}
          <div className="relative">
            <div className="h-44 w-full overflow-hidden bg-gray-50">
              <img
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTYyaAgcVTierjrjmauxLlYd76JdO729VSx_w&s"
                alt="Cover"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex items-center px-4 -mt-8 mb-4 relative z-10">
              <div className="relative">
                <img
                  src={user?.profile?.avatarUrl}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full border-[3px] border-white object-cover shadow-sm"
                />
              </div>
              <div className="ml-3 mt-8 flex items-center gap-1">
                <span className="text-[18px] font-bold">{user?.profile.name}</span>
              </div>
            </div>
          </div>

          {/* 3. Primary Action Buttons */}
          <div className="flex gap-2 px-4 mb-4">
            <button className="flex-1 py-[7px] bg-[#f1f2f4] hover:bg-[#e2e4e7] text-black font-medium rounded-[4px] text-sm flex items-center justify-center gap-2">
              <Phone size={16} /> Gọi điện
            </button>
            <button className="flex-1 py-[7px] bg-[#e5efff] hover:bg-[#d0e2ff] text-[#005ae0] font-medium rounded-[4px] text-sm flex items-center justify-center gap-2">
              <MessageSquare size={16} /> Nhắn tin
            </button>
          </div>

          {/* Phân cách dày */}
          <div className="h-2 bg-[#f4f5f7] border-y border-[#eaeaeb]" />

          {/* 4. Thông tin cá nhân */}
          <div className="p-4">
            <h2 className="text-[15px] font-bold mb-4">Thông tin cá nhân</h2>
            <div className="space-y-[14px] text-[14px]">
              <div className="flex items-center">
                <span className="w-24 text-gray-500">Giới tính</span>
                <span>{user?.profile.gender == "MALE" ? "Nam" : "Nữ"}</span>
              </div>
              <div className="flex items-center">
                <span className="w-24 text-gray-500">Ngày sinh</span>
                <span>
                  {user?.profile?.birthday == null
                    ? "Chưa cập nhật"
                    : formatBirthday(new Date(user?.profile?.birthday))}
                </span>
              </div>
              <div className="flex items-center border-b border-gray-100 pb-4">
                <span className="w-24 text-gray-500">Điện thoại</span>
                {user?.phone == null ? "Chưa cập nhật" : user?.phone}
              </div>
            </div>
          </div>

          <div className="h-2 bg-[#f4f5f7] border-y border-[#eaeaeb]" />

          {/* 6. Footer Actions */}
          <div className="flex flex-col">
            <div className="flex items-center gap-3 px-4 py-[14px] hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-none group">
              <Users
                size={20}
                className="text-gray-500 group-hover:text-blue-500"
              />
              <span className="text-[14.5px]">Nhóm chung (2)</span>
            </div>

            <div className="flex items-center gap-3 px-4 py-[14px] hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-none group">
              <Contact2
                size={20}
                className="text-gray-500 group-hover:text-blue-500"
              />
              <span className="text-[14.5px]">Chia sẻ danh thiếp</span>
            </div>

            <div onClick={onBlock} className="flex items-center gap-3 px-4 py-[14px] hover:bg-gray-50 cursor-pointer group">
              <Slash
                size={19}
                className="text-gray-500 group-hover:text-red-500"
              />
              <span className="text-[14.5px]">Chặn tin nhắn và cuộc gọi</span>
            </div>

            <div  onClick={onDelete} className="flex items-center gap-3 px-4 py-[14px] hover:bg-gray-50 cursor-pointer group">
              <Delete
                size={19}
                className="text-gray-500 group-hover:text-red-500"
              />
              <span className="text-[14.5px]">Xóa khỏi danh sách bạn bè</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
