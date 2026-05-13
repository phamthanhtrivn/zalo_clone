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

export type CallMode = 'NONE' | 'DIRECT' | 'GROUP';
export type CallSessionState = 'IDLE' | 'CALLING' | 'RINGING' | 'CONNECTED' | 'ENDED' | 'IN_GROUP_CALL';

interface VideoCallData {
  isReceiving: boolean;
  from: string;
  fromName?: string;
  fromAvatar?: string;
  signal?: any;
  conversationId?: string;
  callType?: CallType;
  messageId?: string;
  sessionId?: string; // For Group Call
}

interface VideoCallContextType {
  callMode: CallMode;
  videoCallData: VideoCallData;
  sessionState: CallSessionState;
  myVideoRef: React.RefObject<HTMLVideoElement | null>;
  userVideoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | undefined;
  remoteStream: MediaStream | undefined; // For 1-1
  remoteStreams: Record<string, MediaStream>; // For Group
  peersConnecting: Set<string>;
  startDirectCall: (targetId: string, convId: string, type: CallType, targetName?: string, targetAvatar?: string) => void;
  answerDirectCall: () => void;
  startGroupCall: (convId: string, type: CallType) => void;
  joinGroupCall: (sessionId: string, convId: string, type: CallType) => void;
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

  // --- Common State ---
  const [callMode, setCallMode] = useState<CallMode>('NONE');
  const [sessionState, setSessionState] = useState<CallSessionState>('IDLE');
  const sessionStateRef = useRef<CallSessionState>('IDLE');
  const [videoCallData, setVideoCallData] = useState<VideoCallData>({
    isReceiving: false,
    from: "",
  });

  const [stream, setStream] = useState<MediaStream>();
  const streamRef = useRef<MediaStream | undefined>(undefined);
  const myVideoRef = useRef<HTMLVideoElement>(null);

  // --- Direct (1-1) State ---
  const [remoteStream, setRemoteStream] = useState<MediaStream | undefined>(undefined);
  const [pendingSignals, setPendingSignals] = useState<any[]>([]);
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<any>(null);

  // --- Group State ---
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [peersConnecting, setPeersConnecting] = useState<Set<string>>(new Set());
  const peersRef = useRef(new Map<string, any>());

  // --- Audio ---
  const ringtoneRef = useRef<HTMLAudioElement>(new Audio("/sounds/incoming.mp3"));
  const dialingRef = useRef<HTMLAudioElement>(new Audio("/sounds/dialing.mp3"));

  useEffect(() => {
    if (ringtoneRef.current) ringtoneRef.current.loop = true;
    if (dialingRef.current) dialingRef.current.loop = true;
  }, []);

  const updateCallState = useCallback((newState: CallSessionState) => {
    setSessionState(newState);
    sessionStateRef.current = newState;
    console.log(`[CallState] Transition to: ${newState}`);
  }, []);

  const stopMediaStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    setStream(undefined);
    streamRef.current = undefined;
    setRemoteStream(undefined);
    setRemoteStreams({});
    if (myVideoRef.current) myVideoRef.current.srcObject = null;
    if (userVideoRef.current) userVideoRef.current.srcObject = null;

    [ringtoneRef, dialingRef].forEach((ref) => {
      if (ref.current) {
        ref.current.pause();
        ref.current.currentTime = 0;
      }
    });
  }, []);

  const leaveCall = useCallback(
    (reason: CallStatus = CallStatus.ENDED, isRemote: boolean = false) => {
      let finalStatus = reason;
      const currentState = sessionStateRef.current;

      if (currentState !== 'CONNECTED' && currentState !== 'IN_GROUP_CALL') {
        if (currentState === 'CALLING') finalStatus = CallStatus.MISSED;
        else if (currentState === 'RINGING') finalStatus = CallStatus.REJECTED;
      }

      // Cleanup Socket
      if (videoCallData.sessionId) {
        if (!isRemote) {
          socket?.emit("call:group:leave", {
            sessionId: videoCallData.sessionId,
            conversationId: videoCallData.conversationId
          });
        }
      } else if (videoCallData.from) {
        if (!isRemote) {
          if (finalStatus === CallStatus.REJECTED) {
            socket?.emit("call:reject", {
              to: videoCallData.from,
              conversationId: videoCallData.conversationId,
              reason: "Người nghe từ chối cuộc gọi",
              messageId: videoCallData.messageId,
            });
          } else {
            socket?.emit("call:end", {
              to: videoCallData.from,
              conversationId: videoCallData.conversationId,
              status: finalStatus,
              messageId: videoCallData.messageId,
            });
          }
        }
      }

      stopMediaStream();
      
      // Cleanup Peers
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
      peersRef.current.forEach((p) => p.destroy());
      peersRef.current.clear();
      
      setRemoteStreams({});
      setPeersConnecting(new Set());
      setPendingSignals([]);
      updateCallState('ENDED');
      
      setTimeout(() => {
        if (sessionStateRef.current === 'ENDED') {
          updateCallState('IDLE');
          setCallMode('NONE');
          setVideoCallData({ isReceiving: false, from: "" });
        }
      }, 2000);
    },
    [socket, videoCallData, stopMediaStream, updateCallState],
  );

  // --- Group Mesh Logic ---
  const createPeer = useCallback((targetUserId: string, initiator: boolean, sessionId: string) => {
    if (!streamRef.current) return null;

    setPeersConnecting(prev => new Set(prev).add(targetUserId));

    const peer = new Peer({
      initiator,
      trickle: false,
      stream: streamRef.current,
      config: ICE_SERVERS,
    });

    peer.on("signal", (signal: any) => {
      socket?.emit("call:group:signal", {
        toUserId: targetUserId,
        signalData: signal,
        sessionId
      });
    });

    peer.on("stream", (remStream: any) => {
      // ✅ Guard: don't re-enter IN_GROUP_CALL if we've already ended
      const state = sessionStateRef.current;
      if (state === 'IDLE' || state === 'ENDED') return;
      setRemoteStreams(prev => ({ ...prev, [targetUserId]: remStream }));
      setPeersConnecting(prev => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
      if (state !== 'IN_GROUP_CALL') {
        updateCallState('IN_GROUP_CALL');
      }
    });

    peer.on("close", () => {
      setRemoteStreams(prev => {
        const next = { ...prev };
        delete next[targetUserId];
        return next;
      });
      peersRef.current.delete(targetUserId);
    });

    peersRef.current.set(targetUserId, peer);
    return peer;
  }, [socket, updateCallState]);

  // --- Socket Integration ---
  useEffect(() => {
    if (!socket) return;

    // 1-1 Signaling
    const handleIncomingSignal = (data: any) => {
      const currentState = sessionStateRef.current;

      // MUTUAL EXCLUSION (Busy logic)
      if (sessionStateRef.current !== 'IDLE' && sessionStateRef.current !== 'ENDED' && data.signal?.type === 'offer') {
        socket.emit("call:respond_status", {
          to: data.from,
          status: CallStatus.BUSY,
          conversationId: data.conversationId,
        });
        return;
      }

      if (data.signal?.type === "offer") {
        setCallMode('DIRECT');
        setVideoCallData({ ...data, isReceiving: true });
        updateCallState('RINGING');
        ringtoneRef.current?.play().catch(() => {});
        
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
        dialingRef.current?.pause();
      }

      if (data.signal) {
        if (peerRef.current && !peerRef.current.destroyed) {
          try {
            peerRef.current.signal(data.signal);
          } catch (e) {
            console.warn("Signal error (1-1):", e);
          }
        } else if (data.signal.type === "offer") {
          setPendingSignals([data.signal]);
        }
      }
    };

    // Group Signaling
    const handleGroupSignal = (data: { fromUserId: string, signalData: any, sessionId: string }) => {
      // ✅ Strict guard: ignore stale signals after call ends
      const currentState = sessionStateRef.current;
      if (currentState === 'IDLE' || currentState === 'ENDED') return;
      if (currentState !== 'IN_GROUP_CALL' && currentState !== 'CALLING') return;

      let peer = peersRef.current.get(data.fromUserId);
      if (data.signalData.type === 'offer' && !peer) {
        peer = createPeer(data.fromUserId, false, data.sessionId);
      }
      if (peer && !peer.destroyed) {
        try {
          peer.signal(data.signalData);
        } catch (e) {
          console.warn("Signal error:", e);
        }
      }
    };

    const handleGroupLeave = (data: { userId: string }) => {
      const peer = peersRef.current.get(data.userId);
      if (peer) {
        if (!peer.destroyed) peer.destroy();
        peersRef.current.delete(data.userId);
      }
      setRemoteStreams(prev => {
        const next = { ...prev };
        delete next[data.userId];
        return next;
      });
    };

    socket.on("call:signal", handleIncomingSignal);
    socket.on("call:ended", () => leaveCall(CallStatus.ENDED, true));
    socket.on("call:rejected", () => leaveCall(CallStatus.REJECTED, true));
    socket.on("call:group:signal", handleGroupSignal);
    socket.on("call:group:leave", handleGroupLeave);

    return () => {
      socket.off("call:signal");
      socket.off("call:ended");
      socket.off("call:rejected");
      socket.off("call:group:signal");
      socket.off("call:group:leave");
    };
  }, [socket, createPeer, leaveCall, updateCallState]);

  // --- API Triggers ---

  const startDirectCall = async (
    targetId: string,
    convId: string,
    type: CallType,
    targetName?: string,
    targetAvatar?: string,
  ) => {
    setCallMode('DIRECT');
    updateCallState('CALLING');
    dialingRef.current?.play().catch(() => {});

    try {
      const res = await messageService.createCallMessage({
        conversationId: convId,
        senderId: currentUser?.userId || (currentUser as any)?._id,
        type: type as any,
      });
      const msgId = res.data?._id || res._id;

      setVideoCallData({
        isReceiving: false,
        from: targetId,
        conversationId: convId,
        callType: type,
        messageId: msgId,
        fromName: targetName,
        fromAvatar: targetAvatar,
      });

      const currentStream = await navigator.mediaDevices.getUserMedia({
        video: type === CallType.VIDEO,
        audio: true,
      });
      setStream(currentStream);
      streamRef.current = currentStream;
      if (myVideoRef.current) myVideoRef.current.srcObject = currentStream;

      const p = new Peer({ initiator: true, trickle: false, stream: currentStream, config: ICE_SERVERS });
      p.on("signal", (sig: any) => {
        socket?.emit("call:signal", {
          to: targetId,
          signal: sig,
          conversationId: convId,
          callType: type,
          fromName: currentUser?.profile?.name || currentUser?.name,
          fromAvatar: currentUser?.profile?.avatarUrl || currentUser?.avatarUrl,
          messageId: msgId,
        });
      });
      p.on("stream", (remStream: any) => {
        setRemoteStream(remStream);
        updateCallState('CONNECTED');
        dialingRef.current?.pause();
      });
      peerRef.current = p;
    } catch (err) {
      leaveCall();
    }
  };

  const answerDirectCall = async () => {
    updateCallState('CONNECTED');
    ringtoneRef.current?.pause();
    if (videoCallData.messageId) {
      messageService.updateCallStatus({
        messageId: videoCallData.messageId,
        conversationId: videoCallData.conversationId!,
        status: CallStatus.ACCEPTED,
      }).catch(() => {});
    }

    try {
      const currentStream = await navigator.mediaDevices.getUserMedia({
        video: videoCallData.callType === CallType.VIDEO,
        audio: true,
      });
      setStream(currentStream);
      streamRef.current = currentStream;
      if (myVideoRef.current) myVideoRef.current.srcObject = currentStream;

      const p = new Peer({ initiator: false, trickle: false, stream: currentStream, config: ICE_SERVERS });
      p.on("signal", (sig: any) => {
        socket?.emit("call:signal", { to: videoCallData.from, signal: sig, conversationId: videoCallData.conversationId, callType: videoCallData.callType });
      });
      p.on("stream", (remStream: any) => setRemoteStream(remStream));
      pendingSignals.forEach(sig => p.signal(sig));
      setPendingSignals([]);
      peerRef.current = p;
    } catch (err) {
      leaveCall(CallStatus.REJECTED);
    }
  };

  const startGroupCall = async (conversationId: string, type: CallType) => {
    setCallMode('GROUP');
    try {
      const currentStream = await navigator.mediaDevices.getUserMedia({ video: type === CallType.VIDEO, audio: true });
      setStream(currentStream);
      streamRef.current = currentStream;
      if (myVideoRef.current) myVideoRef.current.srcObject = currentStream;

      const res = await messageService.initiateGroupCall({ conversationId, senderId: currentUser?.userId || (currentUser as any)?._id, type });
      const sessionId = res.data?.session?._id || res.session?._id;
      setVideoCallData({ sessionId, conversationId, callType: type, isReceiving: false, from: "" });
      updateCallState('IN_GROUP_CALL');
      // ✅ Don't emit call:group:join here — initiator is already added in initiateGroupCall
      // Just notify others that we are in the call room
      socket?.emit("call:group:join", { sessionId, conversationId });
    } catch (err) {
      leaveCall();
    }
  };

  const joinGroupCall = async (sessionId: string, conversationId: string, type: CallType) => {
    setCallMode('GROUP');
    updateCallState('IN_GROUP_CALL');
    try {
      const currentStream = await navigator.mediaDevices.getUserMedia({ video: type === CallType.VIDEO, audio: true });
      setStream(currentStream);
      streamRef.current = currentStream;
      if (myVideoRef.current) myVideoRef.current.srcObject = currentStream;

      setVideoCallData({ sessionId, conversationId, callType: type, isReceiving: false, from: "" });
      const response = await messageService.joinGroupCall(sessionId);
      const existingParticipants = response.data || response;
      existingParticipants.forEach((pId: string) => createPeer(pId, true, sessionId));
      socket?.emit("call:group:join", { sessionId, conversationId });
    } catch (err) {
      leaveCall();
    }
  };

  return (
    <VideoCallContext.Provider
      value={{
        callMode,
        videoCallData,
        sessionState,
        myVideoRef,
        userVideoRef,
        stream,
        remoteStream,
        remoteStreams,
        peersConnecting,
        startDirectCall,
        answerDirectCall,
        startGroupCall,
        joinGroupCall,
        leaveCall,
      }}
    >
      {children}
    </VideoCallContext.Provider>
  );
};
