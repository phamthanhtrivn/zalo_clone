import SideBarItem from "./SideBarItem";
import {
  Settings,
  User,
  MessageCircleQuestionMark,
  LogOut,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logOut } from "@/store/auth/authThunk";
import { toast } from "react-toastify";
import { useAppDispatch } from "@/store";
import { useState } from "react";
import { SettingsModal } from "@/components/layout/setting/SettingModal";

export default function SettingDropdownSidebar() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const dispatch = useAppDispatch();

  const handleOnLogout = async () => {
    try {
      await dispatch(logOut()).unwrap();
      toast.success("Đăng xuất thành công");
    } catch (err) {
      toast.error("Lỗi hệ thóng");
    }
  };

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div>
            <SideBarItem icon={Settings} label="Cài đặt" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-50 bg-white" align="start">
          <DropdownMenuGroup>
            <DropdownMenuItem className="hover:cursor-pointer p-3">
              <User />
              Thông tin tài khoản
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:cursor-pointer p-3"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings /> Cài đặt
            </DropdownMenuItem>
            <DropdownMenuItem className="hover:cursor-pointer p-3">
              <MessageCircleQuestionMark /> Hỗ trợ
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              className="text-red-500 p-3 hover:cursor-pointer"
              onClick={handleOnLogout}
            >
              <LogOut /> Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
