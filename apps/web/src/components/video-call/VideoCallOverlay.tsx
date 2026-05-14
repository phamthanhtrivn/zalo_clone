import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff, Loader2 } from "lucide-react";
import { useCall } from "@/contexts/VideoCallContext";
import { CallType } from "@/constants/types";
import { conversationService } from "@/services/conversation.service";

// --- Sub-components ---

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
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  };

  return <div className="text-white font-mono text-lg">{formatDuration(seconds)}</div>;
}

const VideoRenderer = ({ stream, isLocal }: { stream: MediaStream | undefined, isLocal?: boolean }) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [stream]);
  if (!stream) return <div className="bg-slate-800 w-full h-full flex items-center justify-center"><VideoOff size={48} className="text-white/20" /></div>;
  return <video ref={ref} autoPlay playsInline muted={isLocal} className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`} />;
};

// --- Layouts ---

const DirectCallLayout = ({ stream, remoteStream, partnerName, isVideo }: any) => {
  return (
    <div className="relative flex-1 flex items-center justify-center p-4">
      {/* Remote Video (Full Screen) */}
      <div className="relative w-full max-w-5xl aspect-video rounded-3xl overflow-hidden bg-slate-900 shadow-2xl border border-white/5">
        <VideoRenderer stream={remoteStream} isLocal={false} />
        <div className="absolute bottom-6 left-6 bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl text-white font-medium border border-white/10">
          {partnerName}
        </div>
      </div>

      {/* Local Video (PiP) */}
      <div className="absolute top-10 right-10 w-48 aspect-video rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 z-10 bg-slate-800">
        <VideoRenderer stream={stream} isLocal={true} />
        <div className="absolute bottom-2 left-2 bg-black/40 px-2 py-0.5 rounded-lg text-white text-[10px]">Bạn</div>
      </div>
    </div>
  );
};

const GroupCallLayout = ({ stream, remoteStreams, peersConnecting, getName, isVideo }: any) => {
  const remoteEntries = Object.entries(remoteStreams);
  const totalCount = remoteEntries.length + 1 + peersConnecting.size; 
  const gridClass = totalCount === 1 ? "grid-cols-1" : totalCount <= 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-2 lg:grid-cols-3";

  return (
    <div className={`flex-1 p-4 grid gap-4 ${gridClass} items-center justify-center auto-rows-fr overflow-y-auto`}>
      {/* Local */}
      <div className="relative w-full h-full min-h-[200px] rounded-2xl overflow-hidden bg-slate-900 border border-white/10 shadow-xl flex items-center justify-center">
        <VideoRenderer stream={stream} isLocal={true} />
        <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1.5 rounded-full text-white text-sm font-medium">Bạn</div>
      </div>
      {/* Remotes */}
      {remoteEntries.map(([uid, rStream]: any) => (
        <div key={uid} className="relative w-full h-full min-h-[200px] rounded-2xl overflow-hidden bg-slate-900 border border-white/10 shadow-xl flex items-center justify-center">
          <VideoRenderer stream={rStream} isLocal={false} />
          <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1.5 rounded-full text-white text-sm font-medium">{getName(uid)}</div>
        </div>
      ))}
      {/* Connecting */}
      {Array.from(peersConnecting).map((uid: any) => (
        <div key={uid} className="relative w-full h-full min-h-[200px] rounded-2xl overflow-hidden bg-slate-800 border border-white/10 shadow-xl flex flex-col gap-4 items-center justify-center">
          <Loader2 size={40} className="text-blue-500 animate-spin" />
          <div className="text-white text-sm font-medium">Đang kết nối... {getName(uid)}</div>
        </div>
      ))}
    </div>
  );
};

// --- Main Overlay ---

export default function VideoCallOverlay() {
  const {
    callMode,
    sessionState,
    stream,
    remoteStream,
    remoteStreams,
    peersConnecting,
    leaveCall,
    videoCallData,
  } = useCall();

  const [members, setMembers] = useState<any[]>([]);
  const isOpen = sessionState === "CONNECTED" || sessionState === "IN_GROUP_CALL";
  const isVideo = videoCallData?.callType === CallType.VIDEO;

  useEffect(() => {
    if (isOpen && videoCallData?.conversationId) {
      conversationService.getListMembers(videoCallData.conversationId)
        .then((res: any) => setMembers(res?.data || res))
        .catch(() => {});
    }
  }, [isOpen, videoCallData?.conversationId]);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  useEffect(() => {
    if (!stream) return;
    setMicOn(stream.getAudioTracks()?.[0]?.enabled ?? false);
    setCamOn(stream.getVideoTracks()?.[0]?.enabled ?? false);
  }, [stream]);

  const toggleMic = () => {
    const track = stream?.getAudioTracks?.()[0];
    if (track) { track.enabled = !track.enabled; setMicOn(track.enabled); }
  };
  const toggleCam = () => {
    const track = stream?.getVideoTracks?.()[0];
    if (track) { track.enabled = !track.enabled; setCamOn(track.enabled); }
  };

  const getName = (id: string) => {
    if (!id) return "Người dùng";
    const mid = String(id);
    const member = members.find((m: any) => 
      String(m.userId) === mid || 
      String(m._id) === mid || 
      String(m.user?._id) === mid
    );
    return member?.profile?.name || member?.name || member?.user?.profile?.name || `User_${mid.substring(mid.length - 4)}`;
  };

  if (!isOpen || callMode === 'NONE') return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-[#0a0f18] select-none overflow-hidden flex flex-col pb-28">
      {/* Layout Content */}
      {callMode === 'DIRECT' ? (
        <DirectCallLayout 
          stream={stream} 
          remoteStream={remoteStream} 
          partnerName={videoCallData.fromName || getName(videoCallData.from)} 
          isVideo={isVideo} 
        />
      ) : (
        <GroupCallLayout 
          stream={stream} 
          remoteStreams={remoteStreams} 
          peersConnecting={peersConnecting} 
          getName={getName} 
          isVideo={isVideo} 
        />
      )}

      {/* SHARED CONTROLS */}
      <div className="absolute left-0 right-0 bottom-0 p-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <div className="mx-auto w-full max-w-md rounded-[2.5rem] bg-white/10 backdrop-blur-3xl border border-white/10 px-8 py-5 flex items-center justify-between shadow-2xl">
          <CallTimer isOpen={isOpen} />

          <div className="flex items-center gap-5">
            <button
              onClick={toggleMic}
              className={`h-14 w-14 rounded-full flex items-center justify-center transition-all ${micOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500 text-white shadow-lg shadow-red-500/20"}`}
            >
              {micOn ? <Mic size={24} /> : <MicOff size={24} />}
            </button>

            {isVideo && (
              <button
                onClick={toggleCam}
                className={`h-14 w-14 rounded-full flex items-center justify-center transition-all ${camOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500 text-white shadow-lg shadow-red-500/20"}`}
              >
                {camOn ? <Video size={24} /> : <VideoOff size={24} />}
              </button>
            )}

            <button
              onClick={() => leaveCall()}
              className="h-14 w-14 rounded-full bg-red-600 flex items-center justify-center text-white hover:bg-red-700 transition-all shadow-xl shadow-red-600/40 transform hover:scale-105 active:scale-95"
            >
              <PhoneOff size={24} />
            </button>
          </div>
          <div className="w-8" />
        </div>
      </div>
    </div>
  );
}
