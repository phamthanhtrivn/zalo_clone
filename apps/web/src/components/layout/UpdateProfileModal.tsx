import React, { useState } from "react";
import { X, ChevronLeft } from "lucide-react";
import {userService} from "../../services/user.service";

const UpdateProfileModal = ({ user, onClose, setUser }: any) => {
  const birthday = user?.profile?.birthday
    ? new Date(user.profile.birthday)
    : new Date();

  const [displayName, setDisplayName] = useState(user?.profile?.name);
  const [gender, setGender] = useState(
    user?.profile?.gender === "MALE" ? "Nam" : "Nữ",
  );
  const [day, setDay] = useState(
    birthday.getDate().toString().padStart(2, "0"),
  );
  const [month, setMonth] = useState(
    (birthday.getMonth() + 1).toString().padStart(2, "0"),
  );
  const [year, setYear] = useState(birthday.getFullYear().toString());

  // Hàm tạo mảng số để render danh sách Option
  const generateOptions = (start: any, end: any) => {
    return Array.from({ length: end - start + 1 }, (_, i) => {
      const value = (start + i).toString().padStart(2, "0");
      return (
        <option key={value} value={value}>
          {value}
        </option>
      );
    });
  };

  const handelUpdate = () => {
    const formData = new FormData();
    formData.append("profile[name]", displayName);
    formData.append("profile[gender]", gender === "Nam" ? "MALE" : "FEMALE");
    formData.append("profile[birthday]", `${year}-${month}-${day}`);
    const updateProfile = async () => {
        try{
            const data = await userService.updateProfile(formData);
            if(data.success){
               const newUser = data.data;
               console.log('newUser', newUser);
            //    setUser((prev : any) => ({ ...prev, profile: newUser.profile }));
            }
            onClose();
        }
        catch(err){
            console.log(err);
        }
    }
    updateProfile();
  };

  return (
    // Lớp phủ tối (Overlay)
    <div className="w-full max-w-[480px] bg-white rounded-xl shadow-xl flex flex-col overflow-hidden font-sans text-gray-800">
      {/* 1. Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="text-slate-600 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
          >
            <ChevronLeft size={24} strokeWidth={1.5} />
          </button>
          <h2 className="text-[17px] font-semibold text-[#1a2b4c]">
            Cập nhật thông tin cá nhân
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
        >
          <X size={24} strokeWidth={1.5} />
        </button>
      </div>

      {/* 2. Nội dung Form */}
      <div className="p-5 flex-1 overflow-y-auto">
        {/* Tên hiển thị */}
        <div className="mb-6">
          <label className="block text-[15px] text-slate-600 mb-2">
            Tên hiển thị
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[15px] text-slate-800"
          />
        </div>

        {/* Tiêu đề Thông tin cá nhân */}
        <h3 className="text-[17px] font-semibold text-[#1a2b4c] mb-4">
          Thông tin cá nhân
        </h3>

        {/* Giới tính */}
        <div className="flex items-center gap-10 mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="gender"
              value="Nam"
              checked={gender === "Nam"}
              onChange={(e) => setGender(e.target.value)}
              className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-[15px] text-slate-700">Nam</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="gender"
              value="Nữ"
              checked={gender === "Nữ"}
              onChange={(e) => setGender(e.target.value)}
              className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-[15px] text-slate-700">Nữ</span>
          </label>
        </div>

        {/* Ngày sinh */}
        <div>
          <label className="block text-[15px] text-slate-600 mb-2">
            Ngày sinh
          </label>
          <div className="grid grid-cols-3 gap-3">
            {/* Select Ngày */}
            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 appearance-none bg-transparent relative z-10 text-[15px] text-slate-800"
              style={{
                backgroundImage:
                  'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 0.75rem top 50%",
                backgroundSize: "0.65rem auto",
              }}
            >
              {generateOptions(1, 31)}
            </select>

            {/* Select Tháng */}
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 appearance-none bg-transparent relative z-10 text-[15px] text-slate-800"
              style={{
                backgroundImage:
                  'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 0.75rem top 50%",
                backgroundSize: "0.65rem auto",
              }}
            >
              {generateOptions(1, 12)}
            </select>

            {/* Select Năm */}
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 appearance-none bg-transparent relative z-10 text-[15px] text-slate-800"
              style={{
                backgroundImage:
                  'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 0.75rem top 50%",
                backgroundSize: "0.65rem auto",
              }}
            >
              {/* Random từ năm 1950 đến 2024 */}
              {generateOptions(1950, 2024).reverse()}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Footer Buttons */}
      <div className="p-4 border-t border-gray-200 flex justify-end gap-3 bg-white">
        <button
          onClick={onClose}
          className="px-6 py-2.5 bg-gray-200 text-[#1a2b4c] font-medium rounded-md hover:bg-gray-300 transition-colors text-[15px]"
        >
          Hủy
        </button>
        <button
          onClick={handelUpdate}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors text-[15px]"
        >
          Cập nhật
        </button>
      </div>
    </div>
  );
};

export default UpdateProfileModal;