import React, { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Move, PhoneOff, Video, VideoOff } from "lucide-react";
import { useCall } from "@/contexts/VideoCallContext";
import { CallType } from "@/constants/types";

// Phase 4: Isolate Re-renders - Separate CallTimer component
function CallTimer({ isOpen }: { isOpen: boolean }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setSeconds(0);
      return;
    }
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [isOpen]);

  const formatDuration = (s: number) => {
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
  };

  return (
    <div className="text-white font-mono text-lg tabular-nums">
      {formatDuration(seconds)}
    </div>
  );
}

export default function VideoCallOverlay() {
  const {
    sessionState,
    myVideoRef,
    userVideoRef,
    stream,
    remoteStream,
    leaveCall,
    videoCallData,
  } = useCall();

  // Phase 4: Simplify visibility logic (PM note #3)
  const isOpen = sessionState === "CONNECTED";

  // Phase 4: Strict CallType Check (Remove defensive hacks)
  const isVideo = videoCallData.callType === CallType.VIDEO;

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const hasSetStream = useRef(false);

  useEffect(() => {
    if (myVideoRef.current && stream && isOpen) {
      if (myVideoRef.current.srcObject !== stream) {
        myVideoRef.current.srcObject = stream;
      }
    }
  }, [stream, isOpen, isVideo]);

  useEffect(() => {
    const videoEl = userVideoRef.current;
    if (videoEl && remoteStream && !hasSetStream.current) {
      videoEl.srcObject = remoteStream;
      hasSetStream.current = true;
      videoEl.play().catch((e) => {
        console.warn("Auto-play interrupted:", e.message);
      });
    }

    return () => {
      if (!isOpen) hasSetStream.current = false;
    };
  }, [remoteStream, isOpen, isVideo]);

  useEffect(() => {
    if (!stream) return;
    setMicOn(stream.getAudioTracks()?.[0]?.enabled ?? false);
    setCamOn(stream.getVideoTracks()?.[0]?.enabled ?? false);
  }, [stream]);

  const toggleMic = () => {
    const track = stream?.getAudioTracks?.()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
    }
  };

  const toggleCam = () => {
    const track = stream?.getVideoTracks?.()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCamOn(track.enabled);
    }
  };

  // Logic Draggable PIP (Phase 4: Optimization)
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    maxX: 0,
    maxY: 0,
  });
  const [pipPos, setPipPos] = useState({ x: 0, y: 0 });

  const onPointerDown = (e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);

    // Phase 4: Cache container bounds (PM note)
    let maxX = 0;
    let maxY = 0;
    if (containerRef.current) {
      const bounds = containerRef.current.getBoundingClientRect();
      maxX = Math.max(0, bounds.width - 236);
      maxY = Math.max(0, bounds.height - 156);
    }

    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: pipPos.x,
      originY: pipPos.y,
      maxX,
      maxY,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    
    const { maxX, maxY, originX, originY } = dragRef.current;

    setPipPos({
      x: Math.min(0, Math.max(-maxX, originX + dx)),
      y: Math.min(maxY, Math.max(0, originY + dy)),
    });
  };

  const onPointerUp = () => {
    dragRef.current.dragging = false;
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-1000 bg-black select-none overflow-hidden"
    >
      {/* 1. MÀN HÌNH CHÍNH (ĐỐI PHƯƠNG) */}
      <div className="absolute inset-0">
        {isVideo ? (
          <video
            ref={userVideoRef}
            playsInline
            autoPlay
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center bg-slate-900">
            <div className="w-32 h-32 rounded-full bg-blue-600 flex items-center justify-center text-4xl text-white font-bold shadow-2xl animate-pulse">
              {videoCallData.fromName?.charAt(0) || "?"}
            </div>
            <div className="mt-6 text-white text-2xl font-medium">
              {videoCallData.fromName || "Người dùng"}
            </div>
            <div className="mt-2 text-white/50">Đang trò chuyện...</div>
          </div>
        )}
      </div>

      {/* 2. MÀN HÌNH NHỎ (CỦA MÌNH - PIP) */}
      {isVideo && (
        <div
          className="absolute top-4 right-4 w-[220px] h-[140px] rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-black cursor-move z-50"
          style={{
            transform: `translate(${pipPos.x}px, ${pipPos.y}px)`,
            touchAction: "none",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <video
            ref={myVideoRef}
            autoPlay
            muted
            playsInline
            className="object-cover w-full h-full scale-x-[-1]"
          />
          {!camOn && (
            <div className="absolute inset-0 bg-slate-800 flex items-center justify-center text-white text-xs">
              Camera đang tắt
            </div>
          )}
          <div className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/50 text-white text-[10px] px-2 py-0.5">
            <Move className="h-3 w-3" /> Bạn
          </div>
        </div>
      )}

      {/* 3. THANH ĐIỀU KHIỂN */}
      <div className="absolute left-0 right-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="mx-auto w-full max-w-xl rounded-3xl bg-white/10 backdrop-blur-2xl border border-white/10 px-6 py-4 flex items-center justify-between shadow-2xl">
          <CallTimer isOpen={isOpen} />

          <div className="flex items-center gap-4">
            <button
              onClick={toggleMic}
              className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${micOn ? "bg-white/10 text-white" : "bg-red-500 text-white"}`}
            >
              {micOn ? <Mic size={24} /> : <MicOff size={24} />}
            </button>

            {isVideo && (
              <button
                onClick={toggleCam}
                className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${camOn ? "bg-white/10 text-white" : "bg-red-500 text-white"}`}
              >
                {camOn ? <Video size={24} /> : <VideoOff size={24} />}
              </button>
            )}

            <button
              onClick={() => leaveCall()}
              className="h-12 w-12 rounded-full bg-red-600 flex items-center justify-center text-white hover:bg-red-700 transition-all shadow-lg shadow-red-600/30"
            >
              <PhoneOff size={24} />
            </button>
          </div>
          <div className="w-10" />
        </div>
      </div>
    </div>
  );
}
