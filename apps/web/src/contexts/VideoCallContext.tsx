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
  videoAccepted: boolean;
  isCalling: boolean;
  callEnded: boolean;
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

  const [videoAccepted, setVideoAccepted] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
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

  const stopMediaStream = useCallback(() => {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setStream(undefined);
    setRemoteStream(undefined);
    if (myVideoRef.current) myVideoRef.current.srcObject = null;
    if (userVideoRef.current) userVideoRef.current.srcObject = null;
    [ringtoneRef, dialingRef].forEach((ref) => {
      if (ref.current) {
        ref.current.pause();
        ref.current.currentTime = 0;
      }
    });
  }, [stream]);

  useEffect(() => {
    if (remoteStream && userVideoRef.current) {
      userVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, videoAccepted]);

  const leaveCall = useCallback(
    (reason: CallStatus = CallStatus.ENDED, isRemote: boolean = false) => {
      let finalStatus = reason;

      if (!videoAccepted) {
        if (isCalling)
          finalStatus = CallStatus.MISSED; //người gọi tự huỷ
        else if (videoCallData.isReceiving) finalStatus = CallStatus.REJECTED; // người nghe từ chối
      }

      // CHỈ gửi socket nếu không phải do nhận lệnh từ người kia (isRemote = false)
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

      stopMediaStream();
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }

      setIsCalling(false);
      setVideoAccepted(false);
      setCallEnded(true);
      setVideoCallData({ isReceiving: false, from: "" });

      console.log(`Đã dọn dẹp cuộc gọi (${isRemote ? "Từ xa" : "Tại chỗ"})`);
    },
    [socket, videoCallData, videoAccepted, isCalling, stopMediaStream],
  );

  useEffect(() => {
    if (!socket) return;
    const handleIncomingSignal = (data: any) => {
      if ((isCalling || videoAccepted) && data.signal.type === "offer") {
        socket.emit("call:respond_status", {
          to: data.from,
          status: CallStatus.BUSY,
          conversationId: data.conversationId,
        });
        return;
      }

      if (data.signal.type === "offer") {
        setVideoCallData({
          ...data,
          isReceiving: true,
          from: data.from,
          fromName: data.fromName,
          fromAvatar: data.fromAvatar,
          callType: data.callType,
          conversationId: data.conversationId,
          messageId: data.messageId,
        });
        ringtoneRef.current.play().catch(() => {});
        setPendingSignals([]);
      } else {
        setVideoCallData((prev) => ({
          ...prev,
          signal: data.signal,
        }));
      }

      if (data.messageId && data.signal.type === "offer") {
        messageService.updateCallStatus({
          messageId: data.messageId,
          conversationId: data.conversationId,
          status: CallStatus.RINGING,
        });
      }

      if (peerRef.current) {
        peerRef.current.signal(data.signal);
      } else {
        setPendingSignals((prev) => [...prev, data.signal]);
      }
    };

    const handleCallEnded = () => {
      console.log("Đối phương đã cúp máy/hủy cuộc gọi");
      leaveCall(CallStatus.ENDED, true);
    };

    const handleCallRejected = () => {
      console.log("Đối phương đã từ chối cuộc gọi");
      leaveCall(CallStatus.REJECTED, true);
    };

    socket.on("call:signal", handleIncomingSignal);
    socket.on("call:ended", handleCallEnded);
    socket.on("call:rejected", handleCallRejected);

    return () => {
      socket.off("call:signal", handleIncomingSignal);
      socket.off("call:ended", handleCallEnded);
      socket.off("call:rejected", handleCallRejected);
    };
  }, [socket, isCalling, videoAccepted, leaveCall]);

  // 1. Cập nhật callUser
  const callUser = async (
    targetId: string,
    convId: string,
    type: CallType,
    msgId: string,
    targetName?: string,
    targetAvatar?: string,
  ) => {
    setIsCalling(true);
    setCallEnded(false);
    dialingRef.current.play().catch(() => {});

    // PHẢI lưu targetId vào videoCallData.from ngay lập tức
    setVideoCallData({
      isReceiving: false,
      from: targetId, // Lưu ID người mình đang gọi
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
      setStream(currentStream);
      if (myVideoRef.current) myVideoRef.current.srcObject = currentStream;

      const p = new Peer({
        initiator: true,
        trickle: true,
        stream: currentStream,
        config: ICE_SERVERS,
      });

      p.on("signal", (sig: any) => {
        if (sig.type === "offer") {
          socket?.emit("call:signal", {
            to: targetId,
            signal: sig,
            conversationId: convId,
            callType: type,
            fromName:
              (currentUser as any)?.profile?.name || (currentUser as any)?.name,
            fromAvatar:
              (currentUser as any)?.profile?.avatarUrl ||
              (currentUser as any)?.avatarUrl,
            messageId: msgId,
          });
        } else {
          socket?.emit("call:signal", {
            to: targetId,
            signal: sig,
            conversationId: convId,
          });
        }
      });

      p.on("stream", (remStream: any) => {
        console.log("Người nhận đã trả lời, đang nhận stream...");
        setRemoteStream(remStream);
        setVideoAccepted(true);
        dialingRef.current.pause();
        dialingRef.current.currentTime = 0;
      });

      p.on("connect", () => {
        setVideoAccepted(true);
        dialingRef.current.pause();
      });

      peerRef.current = p;
    } catch (err) {
      setIsCalling(false);
      dialingRef.current.pause();
      setVideoCallData({ isReceiving: false, from: "" });
    }
  };

  const answerCall = async () => {
    setVideoAccepted(true);
    ringtoneRef.current.pause();

    if (videoCallData.messageId) {
      try {
        await messageService.updateCallStatus({
          messageId: videoCallData.messageId,
          conversationId: videoCallData.conversationId!,
          status: CallStatus.ACCEPTED,
        });
        console.log("Đã cập nhật trạng thái ACCEPTED thành công");
      } catch (error) {
        console.error("Lỗi cập nhật ACCEPTED:", error);
      }
    }

    try {
      const currentStream = await navigator.mediaDevices.getUserMedia({
        video: videoCallData.callType === CallType.VIDEO,
        audio: true,
      });
      setStream(currentStream);
      if (myVideoRef.current) myVideoRef.current.srcObject = currentStream;

      const p = new Peer({
        initiator: false,
        trickle: true,
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
      console.error(err);
    }
  };

  return (
    <VideoCallContext.Provider
      value={{
        videoCallData,
        videoAccepted,
        isCalling,
        callEnded,
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
