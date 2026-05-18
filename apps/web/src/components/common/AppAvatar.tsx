import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import { RiVerifiedBadgeFill } from "react-icons/ri";
import { cn } from "@/lib/utils";
import { getAvatarData, getColorByName } from "@/utils/avatar-utils";

interface AppAvatarProps {
  src?: string;
  name: string;
  className?: string;
  isAI?: boolean;
  isOnline?: boolean;
  onClick?: () => void;
}

const AppAvatar: React.FC<AppAvatarProps> = ({
  src,
  name,
  className,
  isAI = false,
  isOnline = false,
  onClick,
}) => {
  const [stableSrc, setStableSrc] = useState<string>("");
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
    if (src && src.trim().length > 0) {
      setStableSrc(src);
    }
  }, [src]);

  const displaySrc =
    imageFailed ? "" : src && src.trim().length > 0 ? src : stableSrc;
  const { initials, isGroupIcon } = getAvatarData(name);
  const backgroundColor = getColorByName(name);

  return (
    <div className="relative shrink-0">
      <Avatar
        className={cn("h-12 w-12 cursor-pointer", className)}
        onClick={onClick}
      >
        <AvatarImage
          src={displaySrc}
          alt={name}
          className="object-cover"
          onError={() => setImageFailed(true)}
        />
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

      {!isAI && isOnline && (
        <span
          className="absolute bottom-0 right-0 h-[26%] w-[26%] rounded-full border-2 border-white bg-green-500 shadow-sm"
          title="Đang hoạt động"
        />
      )}
    </div>
  );
};

export default AppAvatar;
