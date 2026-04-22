import { Link, useLocation } from "react-router-dom";
import { MessageSquare, Contact } from "lucide-react";
import { cn } from "../../lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useEffect, useState } from "react";
import { userService } from "../../services/user.service";
import ProfileModal from "./ProfileModal";
import SettingDropdownSidebar from "../common/sidebar/SettingDropdown";

interface NavItem {
  icon: any;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: MessageSquare, label: "Tin nhắn", path: "/" },
  { icon: Contact, label: "Danh bạ", path: "/contacts" },
];

export const SidebarPrimary = () => {
  const location = useLocation();
  const [user, setUser] = useState<any>();
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await userService.getProfile();
        if (data.success) {
          setUser(data.data);
        }
      } catch (err) {
        console.log(err);
      }
    };
    fetchUser();
  }, []);

  return (
    <aside className="w-16 bg-[#005AE0] flex flex-col items-center py-4 shrink-0 z-[100]">
      {/* User Avatar */}
      <div className="relative mb-6">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative cursor-pointer">
              <Avatar
                onClick={() => setOpen(true)}
                className="w-12 h-12 border border-white/10 hover:opacity-90 transition-opacity"
              >
                <AvatarImage src={user?.profile?.avatarUrl} alt="User" />
                <AvatarFallback>FT</AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#005AE0] rounded-full"></div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Hồ sơ cá nhân</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <ProfileModal
        setUser={setUser}
        user={user}
        open={open}
        onClose={() => setOpen(false)}
      />

      {/* Navigation Items */}
      <nav className="flex-1 w-full flex flex-col items-center space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.path === "/"
              ? location.pathname === "/" ||
                location.pathname.startsWith("/chat") ||
                location.pathname.startsWith("/conversation")
              : location.pathname.startsWith(item.path);

          return (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <Link
                  to={item.path}
                  className={cn(
                    "w-full aspect-square flex items-center justify-center transition-colors relative group",
                    isActive
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <item.icon className="w-7.5 h-7.5 stroke-[1.5]" />
                  <span className="sr-only">{item.label}</span>
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-white" />
                  )}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{item.label}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* Bottom Actions - Sử dụng Dropdown mới từ nhánh KhongVanTam */}
      <div className="mt-auto flex flex-col items-center z-[10000]">
        <SettingDropdownSidebar />
      </div>
    </aside>
  );
};
