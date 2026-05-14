import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { Alert } from "react-native";
import { Camera } from "expo-camera";
import { Audio } from "expo-av";
import { useSocket } from "./SocketContext";
import { useAppSelector } from "@/store/store";
import { messageService } from "@/services/message.service";

let WebRTC: any = {};
try {
  WebRTC = require("react-native-webrtc");
} catch (e) {
  console.warn("WebRTC native module not found.");
}

const {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
} = WebRTC;

const isWebRTCSupported = !!RTCPeerConnection;

export type CallMode = 'NONE' | 'DIRECT' | 'GROUP';
export type CallSessionState = 'IDLE' | 'CALLING' | 'RINGING' | 'CONNECTED' | 'ENDED' | 'IN_GROUP_CALL';

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const VideoCallContext = createContext<any>(null);

export const VideoCallProvider = ({ children }: { children: React.ReactNode }) => {
  const { socket } = useSocket();
  const currentUser = useAppSelector((state) => state.auth.user);

  // --- Common State ---
  const [callMode, _setCallMode] = useState<CallMode>('NONE');
  const [sessionState, _setSessionState] = useState<CallSessionState>('IDLE');
  const sessionStateRef = useRef<CallSessionState>('IDLE');

  const setCallMode = (mode: CallMode) => {
    console.log("📱 [VideoCallContext] setCallMode:", mode);
    _setCallMode(mode);
  };

  const [videoCallData, setVideoCallData] = useState<any>({
    isReceiving: false,
    from: "",
  });

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // --- Direct (1-1) State ---
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerRef = useRef<any>(null);

  // --- Group State ---
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const peersRef = useRef(new Map<string, any>());
  
  // 📝 Persistent Name Resolver (Map) to prevent "User_ID" bug
  const participantNamesRef = useRef(new Map<string, string>());

  // --- Audio ---
  const soundRef = useRef<Audio.Sound | null>(null);

  const updateCallState = useCallback((newState: CallSessionState) => {
    console.log("📱 [VideoCallContext] updateCallState:", newState);
    _setSessionState(newState);
    sessionStateRef.current = newState;
  }, []);

  const stopSound = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (e) { }
      soundRef.current = null;
    }
  };

  const playSound = async (type: "incoming" | "dialing") => {
    await stopSound();
    try {
      const { sound } = await Audio.Sound.createAsync(
        type === "incoming"
          ? require("@/assets/sounds/incoming.mp3")
          : require("@/assets/sounds/dialing.mp3"),
      );
      soundRef.current = sound;
      await sound.setIsLoopingAsync(true);
      await sound.playAsync();
    } catch (e) { }
  };

  const stopMediaStream = useCallback(() => {
    if (localStreamRef.current) {
      console.log("📱 [VideoCallContext] Stopping all local tracks...");
      localStreamRef.current.getTracks().forEach((track: any) => {
        track.enabled = false;
        track.stop();
      });
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setRemoteStreams({});
  }, []);

  const cleanupCall = useCallback(() => {
    console.log("📱 [VideoCallContext] Full Cleanup Initiated");
    stopMediaStream();
    stopSound();
    
    if (peerRef.current) {
      peerRef.current.ontrack = null;
      peerRef.current.onicecandidate = null;
      peerRef.current.close();
      peerRef.current = null;
    }

    peersRef.current.forEach((pc, uid) => {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.close();
      console.log(`📱 [VideoCallContext] Purged peer: ${uid}`);
    });
    peersRef.current.clear();
    participantNamesRef.current.clear();
    
    setVideoCallData({ isReceiving: false, from: "" });
  }, [stopMediaStream]);

  const leaveCall = useCallback((reason = "ENDED", isRemote = false) => {
    let finalStatus = reason;
    const currentState = sessionStateRef.current;

    if (currentState !== 'CONNECTED' && currentState !== 'IN_GROUP_CALL') {
      if (currentState === 'CALLING') finalStatus = 'MISSED';
      else if (currentState === 'RINGING') finalStatus = 'REJECTED';
    }

    if (videoCallData.sessionId) {
      if (!isRemote) {
        socket?.emit("call:group:leave", {
          sessionId: videoCallData.sessionId,
          conversationId: videoCallData.conversationId
        });
      }
    } else if (videoCallData.from || videoCallData.to) {
      const partnerId = videoCallData.isReceiving ? videoCallData.from : videoCallData.to;

      if (!isRemote) {
        const event = (finalStatus === "REJECTED") ? "call:reject" : "call:end";
        socket?.emit(event, {
          to: partnerId,
          conversationId: videoCallData.conversationId,
          messageId: videoCallData.messageId,
          status: finalStatus,
        });
      }
    }

    setRemoteStreams({}); 
    cleanupCall();
    updateCallState('ENDED');
    setTimeout(() => {
      if (sessionStateRef.current === 'ENDED') {
        updateCallState('IDLE');
        setCallMode('NONE');
      }
    }, 2000);
  }, [socket, videoCallData, cleanupCall, updateCallState]);

  // --- Helper: ICE Gathering ---
  const waitForICE = (pc: any) => new Promise<void>((resolve) => {
    if (pc.iceGatheringState === 'complete') resolve();
    else {
      const checkState = () => {
        if (pc.iceGatheringState === 'complete') {
          pc.removeEventListener('icegatheringstatechange', checkState);
          resolve();
        }
      };
      pc.addEventListener('icegatheringstatechange', checkState);
      setTimeout(resolve, 2000);
    }
  });

  // --- 1-1 Legacy Helper ---
  const createDirectPC = useCallback((partnerId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pc.ontrack = (event: any) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        if (sessionStateRef.current !== 'CONNECTED') {
          updateCallState('CONNECTED');
          stopSound();
        }
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        leaveCall("ENDED", true);
      }
    };
    peerRef.current = pc;
    return pc;
  }, [updateCallState, leaveCall]);

  // --- Group Mesh Helper ---
  const createGroupPeer = useCallback(async (targetUserId: string, initiator: boolean, sessionId: string) => {
    if (!localStreamRef.current) return null;

    // ♻️ [WebRTC] Peer Deduplication
    if (peersRef.current.has(targetUserId)) {
      console.log(`♻️ [WebRTC] Cleaning up stale peer for ${targetUserId} before re-creating`);
      const oldPc = peersRef.current.get(targetUserId);
      oldPc.ontrack = null;
      oldPc.onicecandidate = null;
      oldPc.close();
      peersRef.current.delete(targetUserId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    localStreamRef.current.getTracks().forEach((track: any) => pc.addTrack(track, localStreamRef.current));

    pc.onicecandidate = (event: any) => {
      if (event.candidate) {
        socket?.emit("call:group:signal", { toUserId: targetUserId, signalData: { type: "candidate", candidate: event.candidate }, sessionId });
      }
    };

    pc.ontrack = (event: any) => {
      if (event.streams && event.streams[0]) {
        // ✅ Only update state if we are still actively in a group call
        const state = sessionStateRef.current;
        if (state === 'IDLE' || state === 'ENDED') return;
        setRemoteStreams(prev => ({ ...prev, [targetUserId]: event.streams[0] }));
        if (state !== 'IN_GROUP_CALL') {
          updateCallState('IN_GROUP_CALL');
          stopSound();
        }
      }
    };

    peersRef.current.set(targetUserId, pc);
    if (initiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket?.emit("call:group:signal", { toUserId: targetUserId, signalData: pc.localDescription, sessionId });
    }
    return pc;
  }, [socket, updateCallState]);

  // --- Socket Listeners ---
  useEffect(() => {
    if (!socket) return;

    const handleIncomingSignal = async (data: any) => {
      // Busy Logic
      if (sessionStateRef.current !== 'IDLE' && sessionStateRef.current !== 'ENDED' && data.signal?.type === 'offer') {
        socket.emit("call:respond_status", { to: data.from, status: "BUSY", conversationId: data.conversationId });
        return;
      }
      // 📝 Capture name from signal if available
      if (data.from && data.fromName) {
        participantNamesRef.current.set(String(data.from), data.fromName);
      }

      if (data.signal?.type === "offer") {
        setCallMode('DIRECT');
        setVideoCallData({ ...data, isReceiving: true });
        updateCallState('RINGING');
        playSound("incoming");
        if (data.messageId) {
          messageService.updateCallStatus({ messageId: data.messageId, status: "RINGING", conversationId: data.conversationId }).catch(() => {});
        }
      }

      if (data.signal?.type === "answer") {
        if (peerRef.current && peerRef.current.signalingState !== 'closed') {
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.signal)).catch(e => console.warn(e));
          updateCallState('CONNECTED');
          stopSound();
        }
      }

      if (data.signal?.candidate) {
        if (peerRef.current && peerRef.current.signalingState !== 'closed') {
          await peerRef.current.addIceCandidate(new RTCIceCandidate(data.signal)).catch(() => {});
        }
      }
    };

    const handleGroupSignal = async (data: any) => {
      // ✅ Strict guard: ignore signals if we've already ended or are idle
      const currentState = sessionStateRef.current;
      if (currentState === 'IDLE' || currentState === 'ENDED') return;
      if (currentState !== 'IN_GROUP_CALL' && currentState !== 'CALLING') return;
      
      let pc = peersRef.current.get(data.fromUserId);
      if (pc && pc.signalingState === 'closed') {
        peersRef.current.delete(data.fromUserId);
        pc = null;
      }

      // 📝 Capture name from group signal if available
      if (data.fromUserId && data.fromName) {
        participantNamesRef.current.set(String(data.fromUserId), data.fromName);
      }

      if (data.signalData.type === 'offer') {
        if (!pc) pc = await createGroupPeer(data.fromUserId, false, data.sessionId);
        if (pc && pc.signalingState !== 'closed') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.signalData)).catch(e => console.warn("setRemoteDescription error", e));
          const answer = await pc.createAnswer();
          if (pc.signalingState !== 'closed') {
            await pc.setLocalDescription(answer).catch(e => console.warn("setLocalDescription error", e));
            socket.emit("call:group:signal", { toUserId: data.fromUserId, signalData: pc.localDescription, sessionId: data.sessionId });
          }
        }
      } else if (data.signalData.type === 'answer') {
        if (pc && pc.signalingState !== 'closed') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.signalData)).catch(e => console.warn("setRemoteDescription error", e));
        }
      } else if (data.signalData.type === 'candidate') {
        if (pc && pc.signalingState !== 'closed' && data.signalData.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data.signalData.candidate)).catch(() => {});
        }
      }
    };

    // ✅ When a new user joins, existing members set up peer handlers but do NOT initiate.
    // The JOINER is always the initiator (sends offer via joinGroupCall).
    // Existing peers just wait for the offer via handleGroupSignal.
    const handleGroupJoin = async (data: { userId: string; sessionId: string; conversationId: string }) => {
      const state = sessionStateRef.current;
      if (state === 'IDLE' || state === 'ENDED') return;
      if (state !== 'IN_GROUP_CALL' && state !== 'CALLING') return;
      if (!data.userId || data.userId === currentUser?.userId) return; // skip self

      console.log("📱 [GroupCall] New participant joined, setting up receiver peer:", data.userId);
      // initiator: false — we wait for the joiner's offer, no collision
      await createGroupPeer(data.userId, false, data.sessionId);
    };

    socket.on("call:signal", handleIncomingSignal);
    socket.on("call:ended", () => leaveCall("ENDED", true));
    socket.on("call:rejected", () => leaveCall("REJECTED", true));
    socket.on("call:group:signal", handleGroupSignal);
    socket.on("call:group:join", handleGroupJoin);
    socket.on("call:group:leave", (data) => {
      const pc = peersRef.current.get(data.userId);
      if (pc) {
        pc.close();
        peersRef.current.delete(data.userId);
        setRemoteStreams(prev => {
          const next = { ...prev };
          delete next[data.userId];
          return next;
        });
      }
    });

    return () => {
      socket.off("call:signal");
      socket.off("call:ended");
      socket.off("call:rejected");
      socket.off("call:group:signal");
      socket.off("call:group:join");
      socket.off("call:group:leave");
    };
  }, [socket, createGroupPeer, leaveCall, updateCallState, currentUser]);

  // --- API Actions ---

  const startDirectCall = async (targetId: string, convId: string, type: string, targetName?: string, targetAvatar?: string) => {
    if (!isWebRTCSupported) return;
    const cameraStatus = await Camera.requestCameraPermissionsAsync();
    const audioStatus = await Audio.requestPermissionsAsync();
    if (cameraStatus.status !== 'granted' || audioStatus.status !== 'granted') return;

    setCallMode('DIRECT');
    updateCallState('CALLING');
    playSound("dialing");

    try {
      // Configure Audio for VoIP
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: true,
        playThroughEarpieceAndroid: false, 
      });

      const res = await messageService.createCallMessage({ conversationId: convId, senderId: currentUser?.userId || currentUser?._id, type: type.toUpperCase() as any });
      const msgId = res.data?._id || res._id;
      const stream = await mediaDevices.getUserMedia({ audio: true, video: type.toUpperCase() === "VIDEO" ? { facingMode: "user" } : false });
      setLocalStream(stream);
      localStreamRef.current = stream;

      const pc = createDirectPC(targetId);
      stream.getTracks().forEach((track: any) => pc.addTrack(track, stream));

      const offer = await pc.createOffer({});
      await pc.setLocalDescription(offer);
      await waitForICE(pc);

      const offerPayload = { to: targetId, signal: pc.localDescription, conversationId: convId, callType: type.toUpperCase(), fromName: currentUser?.profile?.name || currentUser?.name, fromAvatar: currentUser?.profile?.avatarUrl || currentUser?.avatarUrl, messageId: msgId };
      setVideoCallData({ ...offerPayload, isReceiving: false, to: targetId, fromName: targetName, fromAvatar: targetAvatar });
      socket?.emit("call:signal", offerPayload);
    } catch (error) {
      leaveCall();
    }
  };

  const answerDirectCall = async () => {
    if (!isWebRTCSupported || !videoCallData.signal) return;
    const cameraStatus = await Camera.requestCameraPermissionsAsync();
    const audioStatus = await Audio.requestPermissionsAsync();
    if (cameraStatus.status !== 'granted' || audioStatus.status !== 'granted') return;

    stopSound();
    updateCallState('CONNECTED');
    try {
      // Configure Audio for VoIP
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: true,
        playThroughEarpieceAndroid: false, 
      });

      const stream = await mediaDevices.getUserMedia({ audio: true, video: videoCallData.callType === "VIDEO" ? { facingMode: "user" } : false });
      setLocalStream(stream);
      localStreamRef.current = stream;

      const pc = createDirectPC(videoCallData.from);
      stream.getTracks().forEach((track: any) => pc.addTrack(track, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(videoCallData.signal));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitForICE(pc);

      socket?.emit("call:signal", { to: videoCallData.from, signal: pc.localDescription, conversationId: videoCallData.conversationId, messageId: videoCallData.messageId });
      if (videoCallData.messageId) {
        messageService.updateCallStatus({ messageId: videoCallData.messageId, status: "ACCEPTED", conversationId: videoCallData.conversationId }).catch(() => {});

      }
    } catch (error) {
      leaveCall();
    }
  };

  const startGroupCall = async (conversationId: string, type: "VIDEO" | "VOICE") => {
    console.log("📱 [VideoCallContext] startGroupCall:", conversationId, type);
    setRemoteStreams({}); 
    if (!isWebRTCSupported) return;
    const cameraStatus = await Camera.requestCameraPermissionsAsync();
    const audioStatus = await Audio.requestPermissionsAsync();
    if (cameraStatus.status !== 'granted' || audioStatus.status !== 'granted') return;

    setCallMode('GROUP');
    updateCallState('CALLING');
    try {
      // Configure Audio for VoIP
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: true,
        playThroughEarpieceAndroid: false, 
      });


      const stream = await mediaDevices.getUserMedia({ audio: true, video: type === "VIDEO" ? { facingMode: "user" } : false });
      setLocalStream(stream);
      localStreamRef.current = stream;

      const res = await messageService.initiateGroupCall({ conversationId, senderId: currentUser?.userId, type });
      const sessionId = res.data?.session?._id || res.session?._id;
      setVideoCallData({ sessionId, conversationId, callType: type });
      updateCallState('IN_GROUP_CALL');
      socket?.emit("call:group:join", { sessionId, conversationId });
    } catch (err) {
      leaveCall();
    }
  };

  const joinGroupCall = async (sessionId: string, conversationId: string, type: "VIDEO" | "VOICE") => {
    console.log("♻️ [WebRTC] Starting fresh session, previous peers cleared");
    cleanupCall();
    setRemoteStreams({}); 

    if (!isWebRTCSupported) return;
    const cameraStatus = await Camera.requestCameraPermissionsAsync();
    const audioStatus = await Audio.requestPermissionsAsync();
    if (cameraStatus.status !== 'granted' || audioStatus.status !== 'granted') return;

    setCallMode('GROUP');
    updateCallState('IN_GROUP_CALL');
    try {
      // Configure Audio for VoIP
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: true,
        playThroughEarpieceAndroid: false, 
      });

      const stream = await mediaDevices.getUserMedia({ audio: true, video: type === "VIDEO" ? { facingMode: "user" } : false });
      setLocalStream(stream);
      localStreamRef.current = stream;

      setVideoCallData({ sessionId, conversationId, callType: type });
      const res = await messageService.joinGroupCall(sessionId);
      const existingParticipants = res.data || res;
      for (const pId of existingParticipants) await createGroupPeer(pId, true, sessionId);
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
        localStream,
        remoteStream,
        remoteStreams,
        startDirectCall,
        answerDirectCall,
        startGroupCall,
        joinGroupCall,
        leaveCall,
        participantNamesRef,
      }}
    >
      {children}
    </VideoCallContext.Provider>
  );
};

export const useVideoCall = () => useContext(VideoCallContext);