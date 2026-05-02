import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
// @ts-ignore
import Peer from "simple-peer/simplepeer.min.js";
import { useSocket } from "./SocketContext";
import { useAppSelector } from "@/store";
import { ICE_SERVERS } from "@/constants/webrtc";
import { CallStatus, CallType } from "@/constants/types";
import { messageService } from "@/services/message.service";

export type CallSessionState = 'IDLE' | 'CALLING' | 'RINGING' | 'CONNECTED' | 'ENDED';

interface VideoCallData {
  isReceiving: boolean;
  from: string;
  fromName?: string;
  fromAvatar?: string;
  signal?: any;
  conversationId?: string;
  callType?: CallType;
  messageId?: string;
}

interface VideoCallContextType {
  videoCallData: VideoCallData;
  sessionState: CallSessionState;
  myVideoRef: React.RefObject<HTMLVideoElement | null>;
  userVideoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | undefined;
  remoteStream: MediaStream | undefined;
  callUser: (
    targetId: string,
    convId: string,
    type: CallType,
    msgId: string,
    targetName?: string,
    targetAvatar?: string,
  ) => void;
  answerCall: () => void;
  leaveCall: (reason?: CallStatus) => void;
}

const VideoCallContext = createContext<VideoCallContextType | null>(null);

export const useCall = () => {
  const context = useContext(VideoCallContext);
  if (!context) throw new Error("useCall must be used within CallProvider");
  return context;
};

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { socket } = useSocket();
  const currentUser = useAppSelector((state) => state.auth.user);

  // Phase 2: Introduce State Machine
  const [sessionState, setSessionState] = useState<CallSessionState>('IDLE');
  const sessionStateRef = useRef<CallSessionState>('IDLE');

  const [stream, setStream] = useState<MediaStream>();
  const [remoteStream, setRemoteStream] = useState<MediaStream | undefined>(
    undefined,
  );
  const [pendingSignals, setPendingSignals] = useState<any[]>([]);

  const [videoCallData, setVideoCallData] = useState<VideoCallData>({
    isReceiving: false,
    from: "",
  });

  const myVideoRef = useRef<HTMLVideoElement>(null);
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<any>(null);

  const ringtoneRef = useRef<HTMLAudioElement>(
    new Audio("/sounds/incoming.mp3"),
  );
  const dialingRef = useRef<HTMLAudioElement>(new Audio("/sounds/dialing.mp3"));

  useEffect(() => {
    if (ringtoneRef.current) ringtoneRef.current.loop = true;
    if (dialingRef.current) dialingRef.current.loop = true;
  }, []);

  // Helper to update both state and ref (PM note #2)
  const updateCallState = useCallback((newState: CallSessionState) => {
    setSessionState(newState);
    sessionStateRef.current = newState;
    console.log(`[CallState] Transition to: ${newState}`);
  }, []);

  const stopMediaStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    setStream(undefined);
    setRemoteStream(undefined);
    if (myVideoRef.current) myVideoRef.current.srcObject = null;
    if (userVideoRef.current) userVideoRef.current.srcObject = null;

    [ringtoneRef, dialingRef].forEach((ref) => {
      if (ref.current) {
        // Phase 3: Fix DOM Exception on Audio (PM note: handle play promise)
        const playPromise = ref.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            ref.current!.pause();
            ref.current!.currentTime = 0;
          }).catch(e => console.warn("Audio pause interrupted:", e));
        } else {
          ref.current.pause();
          ref.current.currentTime = 0;
        }
      }
    });
  }, [stream]);

  useEffect(() => {
    if (remoteStream && userVideoRef.current) {
      userVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const leaveCall = useCallback(
    (reason: CallStatus = CallStatus.ENDED, isRemote: boolean = false) => {
      let finalStatus = reason;
      const currentState = sessionStateRef.current;

      if (currentState !== 'CONNECTED') {
        if (currentState === 'CALLING') finalStatus = CallStatus.MISSED;
        else if (currentState === 'RINGING') finalStatus = CallStatus.REJECTED;
      }

      if (!isRemote) {
        // Phase 3: Fix "Ghost Call" Target Bug
        const partnerId = videoCallData.from;

        if (finalStatus === CallStatus.REJECTED) {
          socket?.emit("call:reject", {
            to: partnerId,
            conversationId: videoCallData.conversationId,
            reason: "Người nghe từ chối cuộc gọi",
            messageId: videoCallData.messageId,
          });
        } else {
          socket?.emit("call:end", {
            to: partnerId,
            conversationId: videoCallData.conversationId,
            status: finalStatus,
            messageId: videoCallData.messageId,
          });
        }
      }

      stopMediaStream();
      
      // Phase 3: Prevent Memory Leaks
      if (peerRef.current) {
        peerRef.current.destroy();
        if (peerRef.current.removeAllListeners) {
          peerRef.current.removeAllListeners();
        }
        peerRef.current = null;
      }
      
      setPendingSignals([]);
      updateCallState('ENDED');
      
      // Cleanup UI state after delay
      setTimeout(() => {
        if (sessionStateRef.current === 'ENDED') {
          updateCallState('IDLE');
          setVideoCallData({ isReceiving: false, from: "" });
        }
      }, 2000);

      console.log(`Đã dọn dẹp cuộc gọi (${isRemote ? "Từ xa" : "Tại chỗ"})`);
    },
    [socket, videoCallData, stopMediaStream, updateCallState],
  );

  // Phase 2: Fix Socket Dependency Hell - use sessionStateRef
  useEffect(() => {
    if (!socket) return;

    const handleIncomingSignal = (data: any) => {
      const currentState = sessionStateRef.current;

      if ((currentState === 'CALLING' || currentState === 'CONNECTED' || currentState === 'RINGING') && data.signal?.type === "offer") {
        socket.emit("call:respond_status", {
          to: data.from,
          status: CallStatus.BUSY,
          conversationId: data.conversationId,
        });
        return;
      }

      if (data.signal?.type === "offer") {
        console.log("[WebRTC] Received Offer Payload:", data);
        console.log("Web nhận cuộc gọi, hiện Popup...");
        setVideoCallData({
          ...data,
          isReceiving: true,
          from: data.from,
        });
        updateCallState('RINGING');
        
        const ringtonePromise = ringtoneRef.current.play();
        if (ringtonePromise !== undefined) {
          ringtonePromise.catch(e => console.warn("Ringtone play failed:", e));
        }

        if (data.messageId) {
          messageService.updateCallStatus({
            messageId: data.messageId,
            conversationId: data.conversationId,
            status: CallStatus.RINGING,
          });
        }
      }

      if (data.signal?.type === "answer") {
        updateCallState('CONNECTED');
        const dialingPromise = dialingRef.current.play();
        if (dialingPromise !== undefined) {
           dialingPromise.then(() => {
             dialingRef.current.pause();
           }).catch(() => {});
        } else {
           dialingRef.current.pause();
        }
      }

      try {
        if (data.signal) {
          console.log("🚀 [WebRTC Web] Signaling incoming data:", data.signal.type || "candidate");
          if (peerRef.current) {
            peerRef.current.signal(data.signal);
          } else if (data.signal.type === "offer") {
            setPendingSignals([data.signal]);
          }
        }
      } catch (err) {
        console.warn("Peer signal error:", err.message);
      }
    };

    const handleCallEnded = () => leaveCall(CallStatus.ENDED, true);
    const handleCallRejected = () => leaveCall(CallStatus.REJECTED, true);

    socket.on("call:signal", handleIncomingSignal);
    socket.on("call:ended", handleCallEnded);
    socket.on("call:rejected", handleCallRejected);

    return () => {
      socket.off("call:signal", handleIncomingSignal);
      socket.off("call:ended", handleCallEnded);
      socket.off("call:rejected", handleCallRejected);
    };
  }, [socket, leaveCall, updateCallState]);

  const callUser = async (
    targetId: string,
    convId: string,
    type: CallType,
    msgId: string,
    targetName?: string,
    targetAvatar?: string,
  ) => {
    updateCallState('CALLING');
    
    const dialingPromise = dialingRef.current.play();
    if (dialingPromise !== undefined) {
      dialingPromise.catch(() => {});
    }

    setVideoCallData({
      isReceiving: false,
      from: targetId,
      conversationId: convId,
      callType: type,
      messageId: msgId,
      fromName: targetName,
      fromAvatar: targetAvatar,
    });

    try {
      const currentStream = await navigator.mediaDevices.getUserMedia({
        video: type === CallType.VIDEO,
        audio: true,
      });
      
      currentStream.getVideoTracks().forEach(track => {
        track.enabled = true;
      });

      setStream(currentStream);
      if (myVideoRef.current) myVideoRef.current.srcObject = currentStream;

      const p = new Peer({
        initiator: true,
        trickle: false,
        stream: currentStream,
        config: ICE_SERVERS,
      });

      p.on("signal", (sig: any) => {
        if (sig.type === "offer") {
          const offerPayload = {
            to: targetId,
            signal: sig,
            conversationId: convId,
            callType: type,
            fromName: (currentUser as any)?.profile?.name || (currentUser as any)?.name,
            fromAvatar: (currentUser as any)?.profile?.avatarUrl || (currentUser as any)?.avatarUrl,
            messageId: msgId,
          };
          console.log("[WebRTC] Sending Offer Payload:", offerPayload);
          socket?.emit("call:signal", offerPayload);
        } else {
          socket?.emit("call:signal", {
            to: targetId,
            signal: sig,
            conversationId: convId,
          });
        }
      });

      p.on("stream", (remStream: any) => {
        setRemoteStream(remStream);
        updateCallState('CONNECTED');
        dialingRef.current.pause();
      });

      p.on("connect", () => {
        updateCallState('CONNECTED');
        dialingRef.current.pause();
      });

      peerRef.current = p;
    } catch (err) {
      // Phase 3: Handle Media Permissions Rejection
      console.error("Media error:", err);
      socket?.emit("call:end", {
        to: targetId,
        conversationId: convId,
        status: CallStatus.MISSED,
        messageId: msgId,
      });
      stopMediaStream();
      updateCallState('IDLE');
    }
  };

  const answerCall = async () => {
    updateCallState('CONNECTED');
    ringtoneRef.current.pause();

    if (videoCallData.messageId) {
      try {
        await messageService.updateCallStatus({
          messageId: videoCallData.messageId,
          conversationId: videoCallData.conversationId!,
          status: CallStatus.ACCEPTED,
        });
      } catch (error) {
        console.error("Lỗi cập nhật ACCEPTED:", error);
      }
    }

    try {
      const currentStream = await navigator.mediaDevices.getUserMedia({
        video: videoCallData.callType === CallType.VIDEO,
        audio: true,
      });

      currentStream.getVideoTracks().forEach(track => {
        track.enabled = true;
      });

      setStream(currentStream);
      if (myVideoRef.current) myVideoRef.current.srcObject = currentStream;

      const p = new Peer({
        initiator: false,
        trickle: false,
        stream: currentStream,
        config: ICE_SERVERS,
      });

      p.on("signal", (sig: any) => {
        socket?.emit("call:signal", {
          to: videoCallData.from,
          signal: sig,
          conversationId: videoCallData.conversationId,
          callType: videoCallData.callType,
        });
      });

      p.on("stream", (remStream: any) => setRemoteStream(remStream));
      
      pendingSignals.forEach((sig) => p.signal(sig));
      setPendingSignals([]);
      peerRef.current = p;
    } catch (err) {
      console.error("Answer media error:", err);
      leaveCall(CallStatus.REJECTED);
    }
  };

  return (
    <VideoCallContext.Provider
      value={{
        videoCallData,
        sessionState,
        myVideoRef,
        userVideoRef,
        stream,
        callUser,
        answerCall,
        remoteStream,
        leaveCall,
      }}
    >
      {children}
    </VideoCallContext.Provider>
  );
};
