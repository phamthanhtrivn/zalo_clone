

import SideBarItem from "./SideBarItem";
import { Settings } from "lucide-react";
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

export default function SettingDropdownSidebar() {
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div>
          <SideBarItem icon={Settings} label="Cài đặt" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40 bg-white" align="start">
        <DropdownMenuGroup>
          <DropdownMenuItem>Thông tin tài khoản</DropdownMenuItem>
          <DropdownMenuItem>Cài đặt</DropdownMenuItem>
          <DropdownMenuItem>Hỗ trợ</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="text-red-500" onClick={handleOnLogout}>
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
