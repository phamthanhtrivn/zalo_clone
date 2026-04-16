import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useSocket } from "./SocketContext";
import { useAppSelector } from "@/store/store";
import { Alert } from "react-native";
import { Audio } from "expo-av";
import { messageService } from "@/services/message.service";

interface VideoCallContextType {
  callData: any;
  isCalling: boolean;
  isReceiving: boolean;
  videoAccepted: boolean;
  startCall: (
    targetId: string,
    convId: string,
    type: string,
    msgId: string,
  ) => void;
  answerCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  cancelCall: () => void;
}

const VideoCallContext = createContext<VideoCallContextType | null>(null);

export const VideoCallProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { socket } = useSocket();
  const user = useAppSelector((state) => state.auth.user);

  const [callData, setCallData] = useState<any>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [videoAccepted, setVideoAccepted] = useState(false);

  const soundRef = useRef<Audio.Sound | null>(null);

  // --- LOGIC ÂM THANH ---
  const playSound = async (type: "incoming" | "dialing") => {
    try {
      await stopSound(); // Dừng âm thanh cũ nếu có
      const { sound } = await Audio.Sound.createAsync(
        type === "incoming"
          ? require("@/assets/sounds/incoming.mp3")
          : require("@/assets/sounds/dialing.mp3"),
      );
      soundRef.current = sound;
      await sound.setIsLoopingAsync(true);
      await sound.playAsync();
    } catch (error) {
      console.log("Lỗi âm thanh:", error);
    }
  };

  const stopSound = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
  };

  // --- RESET STATE ---
  const resetCallState = useCallback(() => {
    setCallData(null);
    setIsCalling(false);
    setIsReceiving(false);
    setVideoAccepted(false);
    stopSound();
  }, []);

  // --- SOCKET LISTENERS ---
  useEffect(() => {
    if (!socket) return;

    socket.on("call:signal", (data) => {
      // 1. Nhận tín hiệu gọi đến (OFFER)
      if (data.signal.type === "offer") {
        setCallData(data);
        setIsReceiving(true);
        playSound("incoming");

        // Cập nhật trạng thái RINGING vào DB
        if (data.messageId) {
          messageService
            .updateCallStatus(data.messageId, "RINGING", data.conversationId)
            .catch((err) => console.log("Lỗi update RINGING:", err));
        }
      }

      // 2. Nhận tín hiệu chấp nhận (ANSWER) - Khi Web trả lời Mobile
      if (data.signal.type === "answer") {
        console.log("Web đã trả lời, chuyển sang đàm thoại");
        setVideoAccepted(true);
        setIsCalling(false);
        stopSound();
      }
    });

    socket.on("call:rejected", (data) => {
      Alert.alert("Thông báo", data.reason || "Đối phương đang bận");
      resetCallState();
    });

    socket.on("call:ended", () => {
      console.log("Cuộc gọi đã kết thúc");
      resetCallState();
    });

    return () => {
      socket.off("call:signal");
      socket.off("call:rejected");
      socket.off("call:ended");
    };
  }, [socket, resetCallState]);

  // --- ACTIONS ---

  // 1. Gọi đi
  const startCall = (
    targetId: string,
    convId: string,
    type: string,
    msgId: string,
  ) => {
    setIsCalling(true);
    playSound("dialing");

    const payload = {
      to: targetId,
      conversationId: convId,
      callType: type,
      messageId: msgId,
      from: user?.userId,
      fromName: user?.profile?.name || "Bạn",
      fromAvatar: user?.profile?.avatarUrl,
      signal: { type: "offer", sdp: "mobile-initiator-sdp" },
    };

    setCallData(payload);
    socket?.emit("call:signal", payload);
  };

  // 2. Trả lời (Answer)
  const answerCall = async () => {
    if (!callData) return;
    setVideoAccepted(true);
    setIsReceiving(false);
    stopSound();

    socket?.emit("call:signal", {
      to: callData.from,
      conversationId: callData.conversationId,
      callType: callData.callType,
      signal: { type: "answer", sdp: "mobile-receiver-sdp" },
    });

    try {
      await messageService.updateCallStatus(
        callData.messageId,
        "ACCEPTED",
        callData.conversationId,
      );
    } catch (err) {
      console.log("Lỗi update ACCEPTED:", err);
    }
  };

  // 3. Từ chối (Reject)
  const rejectCall = () => {
    if (callData) {
      socket?.emit("call:reject", {
        to: callData.from,
        conversationId: callData.conversationId,
        messageId: callData.messageId,
      });
    }
    resetCallState();
  };

  // 4. Cúp máy (End)
  const endCall = () => {
    if (callData) {
      const targetId = isCalling ? callData.to : callData.from;
      socket?.emit("call:end", {
        to: targetId,
        conversationId: callData.conversationId,
        messageId: callData.messageId,
        status: "ENDED",
      });
    }
    resetCallState();
  };

  // 5. Hủy gọi (Cancel)
  const cancelCall = () => {
    if (callData) {
      socket?.emit("call:end", {
        to: callData.to,
        conversationId: callData.conversationId,
        messageId: callData.messageId,
        status: "MISSED",
      });
    }
    resetCallState();
  };

  return (
    <VideoCallContext.Provider
      value={{
        callData,
        isCalling,
        isReceiving,
        videoAccepted,
        startCall,
        answerCall,
        rejectCall,
        endCall,
        cancelCall,
      }}
    >
      {children}
    </VideoCallContext.Provider>
  );
};

export const useVideoCall = () => useContext(VideoCallContext)!;
