import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  Alert
} from "react-native";
import { Camera } from "expo-camera";
import { Audio } from "expo-av";
import { useSocket } from "./SocketContext";
import { useAppSelector } from "@/store/store";
import { messageService } from "@/services/message.service";

// Safe WebRTC Import for Expo Go compatibility
let WebRTC: any = {};
try {
  WebRTC = require("react-native-webrtc");
} catch (e) {
  console.warn("WebRTC native module not found. Use Development Build to enable video calls.");
}

const {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
} = WebRTC;

const isWebRTCSupported = !!RTCPeerConnection;

export type CallSessionState = 'IDLE' | 'CALLING' | 'RINGING' | 'CONNECTED' | 'ENDED';

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

  const [sessionState, setSessionState] = useState<CallSessionState>('IDLE');
  const sessionStateRef = useRef<CallSessionState>('IDLE');

  const [videoCallData, setVideoCallData] = useState<any>({
    isReceiving: false,
    from: "",
  });

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const updateCallState = useCallback((newState: CallSessionState) => {
    setSessionState(newState);
    sessionStateRef.current = newState;
    console.log(`[Mobile-CallState] Transition to: ${newState}`);
  }, []);

  const stopSound = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (e) {}
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
    } catch (e) {}
  };

  const stopMediaStream = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
  }, [localStream]);

  const cleanupCall = useCallback(() => {
    stopMediaStream();
    stopSound();
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    setVideoCallData({ isReceiving: false, from: "" });
  }, [stopMediaStream]);

  const leaveCall = useCallback((reason = "ENDED", isRemote = false) => {
    if (videoCallData.from || videoCallData.to) {
      const partnerId = videoCallData.isReceiving ? videoCallData.from : videoCallData.to;
      
      if (!isRemote) {
        const event = (reason === "REJECTED") ? "call:reject" : "call:end";
        socket?.emit(event, {
          to: partnerId,
          conversationId: videoCallData.conversationId,
          messageId: videoCallData.messageId,
          status: (sessionStateRef.current === 'CALLING' && !isRemote) ? 'MISSED' : reason,
        });
      }
    }

    cleanupCall();
    updateCallState('ENDED');
    setTimeout(() => {
      if (sessionStateRef.current === 'ENDED') {
        updateCallState('IDLE');
      }
    }, 2000);
  }, [socket, videoCallData, cleanupCall, updateCallState]);

  const createPeerConnection = useCallback((partnerId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // In No-Trickle mode, we don't emit individual candidates via socket.
    // They will be gathered into the final localDescription (SDP).
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("🚀 [Mobile-ICE] Gathered candidate:", event.candidate.candidate.substring(0, 30) + "...");
      }
    };

    pc.ontrack = (event) => {
      console.log("🚀 [Mobile-WebRTC] Received remote track:", event.track.kind);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        // Transition to CONNECTED if we were RINGING or CALLING
        if (sessionStateRef.current !== 'CONNECTED') {
          updateCallState('CONNECTED');
          stopSound();
        }
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
        leaveCall("ENDED", true);
      }
    };

    peerRef.current = pc;
    return pc;
  }, [socket, videoCallData.conversationId, leaveCall]);

  // Helper to wait for ICE gathering to complete (No-Trickle)
  const waitForICE = (pc: any) => new Promise<void>((resolve) => {
    if (pc.iceGatheringState === 'complete') {
      resolve();
    } else {
      const checkState = () => {
        if (pc.iceGatheringState === 'complete') {
          pc.removeEventListener('icegatheringstatechange', checkState);
          resolve();
        }
      };
      pc.addEventListener('icegatheringstatechange', checkState);
      // Fallback timeout
      setTimeout(resolve, 2000);
    }
  });

  const startCall = async (targetId: string, convId: string, type: string, targetName?: string, targetAvatar?: string) => {
    if (!isWebRTCSupported) {
      Alert.alert(
        "Không hỗ trợ",
        "Tính năng gọi Video yêu cầu Development Build (Native Module). Vui lòng chạy 'npm run android' hoặc 'npm run ios' thay vì Expo Go.",
        [{ text: "Đã hiểu" }]
      );
      return;
    }

    const cameraStatus = await Camera.requestCameraPermissionsAsync();
    const audioStatus = await Audio.requestPermissionsAsync();

    if (cameraStatus.status !== 'granted' || audioStatus.status !== 'granted') {
      console.warn("Permissions not granted");
      return;
    }

    updateCallState('CALLING');
    playSound("dialing");

    try {
      console.log("🚀 [DEBUG API CALL] Payload:", {
        conversationId: convId,
        senderId: currentUser?.userId || currentUser?._id,
        type: type.toUpperCase()
      });

      const res = await messageService.createCallMessage({
        conversationId: convId,
        senderId: currentUser?.userId || currentUser?._id,
        type: type.toUpperCase() as any,
      });

      const msgId = res.data?._id || res._id;
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: type.toUpperCase() === "VIDEO" ? { facingMode: "user" } : false,
      });
      setLocalStream(stream);

      const pc = createPeerConnection(targetId);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      console.log("🚀 [Mobile-WebRTC] Gathering ICE candidates...");
      await waitForICE(pc);

      const offerPayload = {
        to: targetId,
        signal: pc.localDescription, // Use localDescription after ICE is complete
        conversationId: convId,
        callType: type.toUpperCase(),
        fromName: currentUser?.profile?.name || currentUser?.name || "Người dùng Mobile",
        fromAvatar: currentUser?.profile?.avatarUrl || currentUser?.avatarUrl,
        messageId: msgId,
      };

      setVideoCallData({
        ...offerPayload,
        isReceiving: false,
        to: targetId,
        fromName: targetName,
        fromAvatar: targetAvatar,
      });

      socket?.emit("call:signal", offerPayload);
    } catch (error) {
      console.error("Error starting call:", error);
      leaveCall();
    }
  };

  const answerCall = async () => {
    if (!isWebRTCSupported) {
      Alert.alert(
        "Không hỗ trợ",
        "Tính năng gọi Video yêu cầu Development Build (Native Module). Vui lòng chạy 'npm run android' hoặc 'npm run ios' thay vì Expo Go.",
        [{ text: "Đã hiểu" }]
      );
      return;
    }

    if (!videoCallData.signal || sessionStateRef.current !== 'RINGING') return;

    const cameraStatus = await Camera.requestCameraPermissionsAsync();
    const audioStatus = await Audio.requestPermissionsAsync();

    if (cameraStatus.status !== 'granted' || audioStatus.status !== 'granted') return;

    stopSound();
    updateCallState('CONNECTED');

    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: videoCallData.callType === "VIDEO" ? { facingMode: "user" } : false,
      });
      setLocalStream(stream);

      const pc = createPeerConnection(videoCallData.from);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(videoCallData.signal));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      console.log("🚀 [Mobile-WebRTC] Gathering ICE candidates for Answer...");
      await waitForICE(pc);

      socket?.emit("call:signal", {
        to: videoCallData.from,
        signal: pc.localDescription, // Use localDescription after ICE is complete
        conversationId: videoCallData.conversationId,
        messageId: videoCallData.messageId,
      });

      if (videoCallData.messageId) {
        messageService.updateCallStatus({
          messageId: videoCallData.messageId,
          status: "ACCEPTED",
          conversationId: videoCallData.conversationId,
        }).catch(() => {});
      }
    } catch (error) {
      console.error("Error answering call:", error);
      leaveCall();
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleIncomingSignal = async (data: any) => {
      const currentState = sessionStateRef.current;

      // Handle ICE Candidate
      if (data.signal?.candidate || data.signal?.sdpMid) {
        if (peerRef.current) {
          try {
            await peerRef.current.addIceCandidate(new RTCIceCandidate(data.signal));
          } catch (e) {}
        }
        return;
      }

      // Handle Offer
      if (data.signal?.type === "offer") {
        if (currentState !== 'IDLE' && currentState !== 'ENDED') {
          socket.emit("call:respond_status", { to: data.from, status: "BUSY", conversationId: data.conversationId });
          return;
        }

        setVideoCallData({ ...data, isReceiving: true });
        updateCallState('RINGING');
        playSound("incoming");

        if (data.messageId) {
          messageService.updateCallStatus({
            messageId: data.messageId,
            status: "RINGING",
            conversationId: data.conversationId,
          }).catch(() => {});
        }
      }

      // Handle Answer
      if (data.signal?.type === "answer") {
        if (peerRef.current) {
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.signal));
          updateCallState('CONNECTED');
          stopSound();
        }
      }
    };

    const handleCallEnded = () => leaveCall("ENDED", true);
    const handleCallRejected = () => leaveCall("REJECTED", true);

    socket.on("call:signal", handleIncomingSignal);
    socket.on("call:ended", handleCallEnded);
    socket.on("call:rejected", handleCallRejected);

    return () => {
      socket.off("call:signal", handleIncomingSignal);
      socket.off("call:ended", handleCallEnded);
      socket.off("call:rejected", handleCallRejected);
    };
  }, [socket, leaveCall, updateCallState, createPeerConnection]);

  return (
    <VideoCallContext.Provider
      value={{
        videoCallData,
        sessionState,
        localStream,
        remoteStream,
        startCall,
        answerCall,
        leaveCall,
      }}
    >
      {children}
    </VideoCallContext.Provider>
  );
};

export const useVideoCall = () => useContext(VideoCallContext);
