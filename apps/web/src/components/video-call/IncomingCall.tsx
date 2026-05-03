import { useMemo } from "react";
import { Phone, PhoneIncoming, PhoneOff, Video } from "lucide-react"; // Thêm Video icon
import { useCall } from "@/contexts/VideoCallContext";
import { useAppSelector } from "@/store";
import { CallType } from "@/constants/types"; // Đảm bảo import enum này

function getInitial(nameOrId: string) {
  const s = (nameOrId || "").trim();
  return (s[0] || "?").toUpperCase();
}

export default function IncomingCall() {
  const { videoCallData, answerCall, leaveCall, sessionState } = useCall();
  const conversations = useAppSelector((state) => state.conversation.conversations);

  // Phase 4: Simplify visibility logic (PM note #3)
  const isOpen = sessionState === "RINGING";

  // Kiểm tra xem là cuộc gọi Video hay Voice
  const isVideo = videoCallData?.callType === CallType.VIDEO;

  const currentConversation = useMemo(() => {
    if (!videoCallData?.conversationId) return null;
    return conversations.find(
      (c) => String(c.conversationId) === String(videoCallData.conversationId) || 
             String((c as any)?._id) === String(videoCallData.conversationId)
    );
  }, [conversations, videoCallData?.conversationId]);

  const callerName = useMemo(() => {
    return videoCallData?.fromName || currentConversation?.name || "Người dùng";
  }, [videoCallData?.fromName, currentConversation]);

  const callerAvatar = useMemo(() => {
    return (
      videoCallData?.fromAvatar ||
      (currentConversation as any)?.avatarUrl ||
      currentConversation?.avatar ||
      ""
    );
  }, [videoCallData?.fromAvatar, currentConversation]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />

      <div className="relative h-full w-full flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white/85 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.35)] border border-white/60 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-linear-to-br from-[#0068ff] to-[#00c2ff] grid place-items-center text-white font-semibold text-xl shadow-lg overflow-hidden">
                  {callerAvatar ? (
                    <img
                      src={callerAvatar}
                      alt={callerName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{getInitial(String(callerName))}</span>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-white shadow grid place-items-center">
                  {/* Icon thay đổi theo loại cuộc gọi */}
                  {isVideo ? (
                    <Video className="h-4 w-4 text-[#0068ff]" />
                  ) : (
                    <PhoneIncoming className="h-4 w-4 text-[#0068ff]" />
                  )}
                </div>
              </div>

              <div className="min-w-0">
                {/* Thay đổi text hiển thị */}
                <div className="text-sm text-slate-600">
                  Cuộc gọi {isVideo ? "video" : "thoại"} đến
                </div>
                <div className="text-xl font-semibold text-slate-900 truncate">
                  {String(callerName)}
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={leaveCall}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-3 shadow-lg shadow-red-600/25 transition"
              >
                <PhoneOff className="h-5 w-5" />
                Từ chối
              </button>

              <button
                type="button"
                onClick={answerCall}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-3 shadow-lg shadow-emerald-600/25 transition relative overflow-hidden"
              >
                <span className="absolute inset-0 opacity-20 animate-pulse bg-white/30" />
                <span className="relative inline-flex items-center gap-2">
                  {/* Icon nút Trả lời cũng nên linh hoạt */}
                  {isVideo ? (
                    <Video className="h-5 w-5 animate-bounce" />
                  ) : (
                    <Phone className="h-5 w-5 animate-bounce" />
                  )}
                  Trả lời
                </span>
              </button>
            </div>

            <div className="mt-4 text-xs text-slate-500 text-center">
              Nhấn “Trả lời” để bắt đầu cuộc trò chuyện.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
