import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import { RiVerifiedBadgeFill } from "react-icons/ri";
import { cn } from "@/lib/utils";
import { getAvatarData, getColorByName } from "@/utils/avatar-utils";

interface AppAvatarProps {
  src?: string;
  name: string;
  className?: string; // Để tùy chỉnh kích thước h-x w-x
  isAI?: boolean;
  onClick?: () => void;
}

const AppAvatar: React.FC<AppAvatarProps> = ({
  src,
  name,
  className,
  isAI = false,
  onClick
}) => {
  const { initials, isGroupIcon } = getAvatarData(name);
  const backgroundColor = getColorByName(name);

  return (
    <div className="relative shrink-0">
      <Avatar
        className={cn("h-12 w-12 cursor-pointer", className)}
        onClick={onClick}
      >
        <AvatarImage src={src} alt={name} className="object-cover" />
        <AvatarFallback
          className="font-bold text-white"
          style={{ backgroundColor }}
        >
          {isGroupIcon ? <Users className="h-1/2 w-1/2" /> : initials}
        </AvatarFallback>
      </Avatar>

      {isAI && (
        <div className="absolute -bottom-1 -right-1 flex h-[40%] w-[40%] items-center justify-center rounded-full bg-white p-px shadow-sm">
          <RiVerifiedBadgeFill className="h-full w-full text-[#0091ff]" />
        </div>
      )}
    </div>
  );
};

export default AppAvatar;
