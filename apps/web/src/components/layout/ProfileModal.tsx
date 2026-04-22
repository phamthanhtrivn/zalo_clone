import React, { useState, useRef } from "react";
import { X, Camera, PenLine } from "lucide-react";
import UpdateProfileModal from "./UpdateProfileModal";
import { userService } from "../../services/user.service";
import { formatBirthday } from "@/utils/dateTimeFormat.util";

type ModelProfileProps = {
  setUser: any;
  user: any;
  open: boolean;
  onClose: () => void;
};

const ModelProfile = ({ user, open, onClose, setUser }: ModelProfileProps) => {
  const [openUpdateModel, setOpenUpdateModel] = useState(false);
  const fileInputRef = useRef<any>(null);
  if (!open) return null;

  const handleCameraClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: any) => {
    const file = event.target.files[0];
    const updateImage = async () => {
      try {
        const formData = new FormData();
        formData.append("avatar", file);
        const data = await userService.updateProfile(formData);
        if (data.success) {
          const newUser = data.data;
          console.log(newUser);
          setUser((prev: any) => ({ ...prev, profile: newUser.profile }));
        }
      } catch (err) {
        console.log(err);
      }
    };
    updateImage();
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4">
      {/* Khung Modal chính */}
      {openUpdateModel ? (
        <UpdateProfileModal
          setUser={setUser}
          user={user}
          onClose={() => setOpenUpdateModel(false)}
        />
      ) : (
        <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden font-sans text-gray-800 max-h-[95vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white sticky top-0 z-30">
            <h1 className="text-[17px] font-semibold text-slate-800">
              Thông tin tài khoản
            </h1>
            <button
              onClick={onClose}
              className="text-gray-500 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
            >
              <X size={24} strokeWidth={1.5} />
            </button>
          </div>

          <div className="w-full h-44 bg-gray-200 relative">
            <img
              src="https://images.unsplash.com/photo-1559586616-361e18714958?auto=format&fit=crop&w=800&q=80"
              alt="Ảnh bìa ruộng bậc thang"
              className="w-full h-full object-cover"
            />
          </div>

          {/* 3. Phần Avatar và Tên */}
          <div className="px-4 relative mb-4">
            <div className="flex items-end -mt-12">
              {/* Avatar */}
              <div className="relative z-10">
                <img
                  src={user?.profile?.avatarUrl}
                  alt="Avatar"
                  className="w-24 h-24 rounded-full border-4 border-white object-cover bg-zinc-800"
                />
                {/* Nút đổi avatar */}
                <button
                  onClick={handleCameraClick}
                  className="absolute bottom-0 right-0 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full p-1.5 border border-gray-300 shadow-sm transition-colors z-20"
                >
                  <Camera size={18} strokeWidth={1.5} />
                </button>
              </div>

              {/* Thẻ input ẩn để chọn file ảnh */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*" // Chỉ cho phép chọn các file hình ảnh
                className="hidden"
              />

              {/* Tên người dùng */}
              <div className="ml-4 mb-2 flex items-center">
                <h2 className="text-[22px] font-bold text-slate-800">
                  {user?.profile.name}
                </h2>
                <button className="ml-2 text-slate-600 hover:text-slate-800">
                  <PenLine
                    onClick={() => setOpenUpdateModel(true)}
                    size={16}
                    strokeWidth={2}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Dải phân cách màu xám nhạt */}
          <div className="h-2.5 bg-gray-100 w-full"></div>

          {/* 4. Phần Thông tin cá nhân */}
          <div className="p-4">
            <h3 className="text-[17px] font-semibold text-slate-800 mb-5">
              Thông tin cá nhân
            </h3>

            <div className="space-y-4 text-[15px]">
              {/* Giới tính */}
              <div className="grid grid-cols-[100px_1fr] gap-4">
                <span className="text-gray-500">Giới tính</span>
                <span className="text-slate-800">
                  {user?.profile.gender == "MALE" ? "Nam" : "Nữ"}
                </span>
              </div>

              {/* Ngày sinh */}
              <div className="grid grid-cols-[100px_1fr] gap-4">
                <span className="text-gray-500">Ngày sinh</span>
                <span className="text-slate-800">
                  {user?.profile?.birthday == null
                    ? "Chưa cập nhật"
                    : formatBirthday(new Date(user?.profile?.birthday))}
                </span>
              </div>

              {/* Điện thoại */}
              <div className="grid grid-cols-[100px_1fr] gap-4">
                <span className="text-gray-500">Điện thoại</span>
                <span className="text-slate-800">
                  {user?.phone == null ? "Chưa cập nhật" : user?.phone}
                </span>
              </div>
            </div>

            {/* Ghi chú */}
            <p className="text-[13px] text-gray-500 mt-5 leading-relaxed pr-4">
              Chỉ bạn bè có lưu số của bạn trong danh bạ máy xem được số này
            </p>
          </div>

          {/* 5. Nút Cập nhật */}
          <div
            onClick={() => setOpenUpdateModel(true)}
            className="px-4 py-3 mt-4 border-t border-gray-100 mb-2"
          >
            <button className="w-full flex items-center justify-center py-2 text-[16px] font-semibold text-[#1a2b4c] hover:bg-gray-50 rounded-lg transition-colors">
              <PenLine size={18} className="mr-2" strokeWidth={2} />
              Cập nhật
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelProfile;
