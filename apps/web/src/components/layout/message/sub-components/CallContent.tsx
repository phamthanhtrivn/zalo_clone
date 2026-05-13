import React from "react";
import { Phone, PhoneMissed, Video, Users } from "lucide-react";
import { formatDuration } from "@/utils/format-message-time..util";
import { useCall } from "@/contexts/VideoCallContext";
import { CallType } from "@/constants/types";

interface Props {
  type: "VIDEO" | "VOICE";
  status: string;
  duration: number | null;
  isMe: boolean;
  isGroupCall?: boolean;
  isGroupChat?: boolean;
  sessionId?: string | null;
  conversationId?: string;
}

const CallContent: React.FC<Props> = ({ type, status, duration, isMe, isGroupCall, isGroupChat, sessionId, conversationId }) => {
  const isVideo = type === "VIDEO";
  const { joinGroupCall, callMode } = useCall();
  const isInAnotherCall = callMode !== 'NONE';

  if (isGroupCall) {
    const isActive = status === "ACTIVE" || status === "RINGING" || status === "CALLING";
    const isEnded = status === "ENDED";
    const IconComp = isGroupChat ? Users : (isVideo ? Video : Phone);
    return (
      <div className="flex flex-col items-center gap-2 py-2 w-48">
        <div className={`p-3 rounded-full bg-white/50 text-blue-600`}>
          <IconComp size={24} />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[14px] font-medium leading-tight text-center">
            Cuộc gọi {isGroupChat ? "nhóm " : ""}{isVideo ? "video" : "thoại"}
          </span>
          <span className="text-[12px] opacity-70 mt-1">
            {isActive ? "Đang diễn ra..." : isEnded ? `Cuộc gọi đã kết thúc${duration ? ` • ${formatDuration(duration)}` : ''}` : "Cuộc gọi nhóm"}
          </span>
        </div>
        {isActive && sessionId && conversationId && (
          <button 
            onClick={() => {
              if (isInAnotherCall) {
                alert("Bạn cần kết thúc cuộc gọi hiện tại để tham gia nhóm.");
                return;
              }
              joinGroupCall(sessionId, conversationId, isVideo ? CallType.VIDEO : CallType.VOICE);
            }}
            disabled={isInAnotherCall}
            className={`mt-2 w-full py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isInAnotherCall 
                ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isInAnotherCall ? "Đang trong cuộc gọi khác" : "Tham gia"}
          </button>
        )}
      </div>
    );
  }

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
