import React from "react";
import { Phone, PhoneMissed, Video } from "lucide-react";
import { formatDuration } from "@/utils/format-message-time..util";

interface Props {
  type: "VIDEO" | "VOICE";
  status: string;
  duration: number | null;
  isMe: boolean;
}

const CallContent: React.FC<Props> = ({ type, status, duration, isMe }) => {
  const isVideo = type === "VIDEO";
  let statusText = "";
  let Icon = isVideo ? Video : Phone;
  let iconColor = isMe ? "text-blue-600" : "text-gray-600";

  switch (status) {
    case "ENDED":
    case "ACCEPTED":
      statusText = `Cuộc gọi ${isVideo ? "video" : "thoại"} (${formatDuration(duration)})`;
      break;
    case "MISSED":
      statusText = isMe ? "Đối phương đã lỡ" : "Cuộc gọi nhỡ";
      Icon = PhoneMissed;
      iconColor = "text-red-500";
      break;
    case "REJECTED":
      statusText = isMe ? "Cuộc gọi bị từ chối" : "Cuộc gọi nhỡ";
      Icon = PhoneMissed;
      iconColor = "text-red-500";
      break;
    case "BUSY":
      statusText = "Máy bận";
      iconColor = "text-orange-500";
      break;
    default:
      statusText = `Đang thiết lập...`;
  }

  return (
    <div className="flex items-center gap-3 py-1">
      <div className={`p-2 rounded-full bg-white/50 ${iconColor}`}>
        <Icon size={20} />
      </div>
      <div className="flex flex-col">
        <span className="text-[14px] font-medium leading-tight">
          {statusText}
        </span>
        <span className="text-[11px] opacity-70">
          {isMe ? "Cuộc gọi đi" : "Cuộc gọi đến"}
        </span>
      </div>
    </div>
  );
};

export default React.memo(CallContent);
