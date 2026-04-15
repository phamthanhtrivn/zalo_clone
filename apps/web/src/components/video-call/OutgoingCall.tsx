import React, { useEffect, useMemo } from "react";
import { Phone, PhoneOff, Video } from "lucide-react"; // Thêm icon Phone
import { useParams } from "react-router-dom";
import { useAppSelector } from "@/store";
import { useCall } from "@/contexts/VideoCallContext";
import { CallType } from "@/constants/types";

export default function OutgoingCall() {
  const { id } = useParams();
  const {
    isCalling,
    videoAccepted,
    callEnded,
    myVideoRef,
    stream,
    leaveCall,
    videoCallData,
  } = useCall();

  // Kiểm tra loại cuộc gọi
  const isVideo = videoCallData.callType === CallType.VIDEO;

  useEffect(() => {
    const el = myVideoRef.current;
    if (!el || !isVideo) return; // Chỉ gắn stream vào video nếu là cuộc gọi VIDEO
    el.srcObject = stream ?? null;
  }, [stream, isVideo]);

  const isOpen = isCalling && !videoAccepted && !callEnded;

  const conversations = useAppSelector(
    (state) => state.conversation.conversations,
  );

  const recipient = useMemo(() => {
    return conversations.find(
      (c) =>
        String(c.conversationId) === String(id) ||
        String((c as any)?._id ?? "") === String(id) ||
        String((c as any)?.id ?? "") === String(id),
    );
  }, [conversations, id]);

  const recipientName = recipient?.name || "Người dùng";
  const recipientAvatar = (recipient as any)?.avatarUrl || "";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-1000 bg-slate-900">
      {/* Nền hiển thị */}
      <div className="absolute inset-0">
        {isVideo ? (
          /* Nếu là VIDEO: Hiện camera của mình */
          <>
            <video
              ref={myVideoRef}
              autoPlay
              muted
              playsInline
              className="object-cover w-full h-full"
            />
            <div className="absolute inset-0 bg-black/30" />
          </>
        ) : (
          /* Nếu là VOICE: Hiện nền tối hoặc Avatar mờ */
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-slate-800 to-slate-950">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl animate-pulse">
                {recipientAvatar ? (
                  <img
                    src={recipientAvatar}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-blue-600 flex items-center justify-center text-4xl text-white font-bold">
                    {recipientName.charAt(0)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-black/20" />
      </div>

      {/* Center status */}
      <div className="relative h-full w-full flex flex-col items-center justify-center px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 backdrop-blur px-4 py-2 text-white/90">
          {/* Icon thay đổi theo CallType */}
          {isVideo ? (
            <Video className="h-4 w-4" />
          ) : (
            <Phone className="h-4 w-4" />
          )}
          {isVideo ? "Video call" : "Voice call"}
        </div>

        <div className="mt-6 text-3xl font-semibold text-white truncate max-w-[90vw]">
          {recipientName}
        </div>

        <div className="mt-2 text-base text-white/70">
          {isVideo ? "Đang gọi video..." : "Đang gọi thoại..."}
        </div>

        {/* Có thể thêm dòng "Đang đổ chuông..." khi nhận được tín hiệu từ server */}
        <div className="mt-1 text-sm text-blue-400 animate-pulse">
          Đang kết nối...
        </div>
      </div>

      {/* Bottom actions */}
      <div className="absolute left-0 right-0 bottom-0 p-10">
        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={leaveCall}
            className="h-16 w-16 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/40 transition-transform hover:scale-110 active:scale-90"
          >
            <PhoneOff className="h-8 w-8" />
          </button>
          <span className="text-white/60 text-sm font-medium">Hủy</span>
        </div>
      </div>
    </div>
  );
}
