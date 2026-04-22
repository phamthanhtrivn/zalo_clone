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
import { Audio } from "expo-av";
import { messageService } from "@/services/message.service";

const VideoCallContext = createContext<any>(null);

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

  const resetCall = useCallback(() => {
    setCallData(null);
    setIsCalling(false);
    setIsReceiving(false);
    setVideoAccepted(false);
    stopSound();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleSignal = (data: any) => {
      // LUỒNG NHẬN CUỘC GỌI TỪ WEB (OFFER)
      if (data.signal?.type === "offer") {
        // Kiểm tra: Nếu mình KHÔNG phải người gọi thì mới hiện màn hình và update RINGING
        const myId = String(user?.userId || user?._id);
        if (String(data.from) !== myId) {
          setCallData(data);
          setIsReceiving(true);
          playSound("incoming");

          // FIX QUAN TRỌNG: Truyền Object { ... } thay vì 3 tham số rời
          if (data.messageId) {
            messageService
              .updateCallStatus({
                messageId: data.messageId,
                status: "RINGING",
                conversationId: data.conversationId,
              })
              .catch((err) => console.log("Lỗi update RINGING:", err.message));
          }
        }
      }

      // FIX CHO LUỒNG MOBILE GỌI WEB: Khi Web nhấn "Trả lời" (ANSWER)
      if (data.signal?.type === "answer") {
        console.log("Web đã trả lời Mobile, chuyển sang Đàm thoại");
        setVideoAccepted(true);
        setIsCalling(false);
        stopSound();
        // Cập nhật thông tin đối phương (Web) để hiện tên
        setCallData((prev: any) => ({
          ...prev,
          fromName: data.fromName || prev?.toName || "Người dùng Web",
        }));
      }
    };

    socket.on("call:signal", handleSignal);
    socket.on("call:rejected", resetCall);
    socket.on("call:ended", resetCall);
    return () => {
      socket.off("call:signal");
      socket.off("call:rejected");
      socket.off("call:ended");
    };
  }, [socket, resetCall]);

  // HÀM GỌI ĐI
  const startCall = async (
    targetId: string,
    targetName: string,
    convId: string,
    type: string,
  ) => {
    setIsCalling(true);
    playSound("dialing");

    try {
      // 1. Tạo bản ghi message cuộc gọi
      const res = await messageService.createCallMessage({
        conversationId: convId,
        senderId: user?.userId || user?._id,
        type: type.toUpperCase() as any,
      });

      const msgId = res.data?._id || res._id;

      // 2. Signaling
      const payload = {
        to: targetId,
        toName: targetName,
        conversationId: convId,
        callType: type.toUpperCase(),
        messageId: msgId,
        from: user?.userId || user?._id,
        // Gửi fromName để Web hiện: "Hà Thanh Tuấn đang gọi..."
        fromName: user?.profile?.name || "Người dùng Mobile",
        // SDP giả nhưng đúng cấu trúc khởi đầu v=0 để tránh lỗi parse nghiêm trọng
        signal: {
          type: "offer",
          sdp: "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n",
        },
      };

      setCallData(payload);
      socket?.emit("call:signal", payload);
    } catch (error) {
      console.log("Lỗi gọi đi:", error);
      resetCall();
    }
  };

  // HÀM TRẢ LỜI (Mobile nghe Web)
  const answerCall = async () => {
    if (!callData) return;
    setVideoAccepted(true);
    setIsReceiving(false);
    stopSound();

    // Gửi tín hiệu về Web (kèm thông tin profile của mình)
    socket?.emit("call:signal", {
      to: callData.from,
      conversationId: callData.conversationId,
      messageId: callData.messageId,
      fromName: user?.profile?.name || "Người dùng Mobile",
      fromAvatar: user?.profile?.avatarUrl,
      signal: { type: "answer", sdp: "v=0\r\no=-..." },
    });

    // FIX 2: Truyền Object vào Service
    if (callData.messageId) {
      messageService
        .updateCallStatus({
          messageId: callData.messageId,
          status: "ACCEPTED",
          conversationId: callData.conversationId,
        })
        .catch((err) => console.log("Lỗi ACCEPTED:", err.message));
    }
  };

  const endCall = (status = "ENDED") => {
    if (callData) {
      const myId = String(user?.userId || user?._id);
      const callerId = String(callData.from || "");
      const isInitiator = myId === callerId;

      const target = isInitiator ? callData.to : callData.from;

      socket?.emit(status === "REJECTED" ? "call:reject" : "call:end", {
        to: target,
        conversationId: callData.conversationId,
        messageId: callData.messageId,
        status: isCalling && !videoAccepted ? "MISSED" : status,
      });
    }
    resetCall();
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
        endCall,
      }}
    >
      {children}
    </VideoCallContext.Provider>
  );
};

export const useVideoCall = () => useContext(VideoCallContext);

// Build co video
// import React, {
//   createContext,
//   useContext,
//   useState,
//   useEffect,
//   useRef,
//   useCallback,
// } from "react";
// import { useSocket } from "./SocketContext";
// import { useAppSelector } from "@/store/store";
// import { Audio } from "expo-av";
// import { messageService } from "@/services/message.service";
// import { mediaDevices, MediaStream } from "react-native-webrtc"; // RTCView sẽ dùng ở file Overlay

// const VideoCallContext = createContext<any>(null);

// export const VideoCallProvider = ({
//   children,
// }: {
//   children: React.ReactNode;
// }) => {
//   const { socket } = useSocket();
//   const user = useAppSelector((state) => state.auth.user);

//   const [callData, setCallData] = useState<any>(null);
//   const [isCalling, setIsCalling] = useState(false);
//   const [isReceiving, setIsReceiving] = useState(false);
//   const [videoAccepted, setVideoAccepted] = useState(false);
//   const [localStream, setLocalStream] = useState<MediaStream | null>(null);

//   const soundRef = useRef<Audio.Sound | null>(null);

//   // Hàm lấy Camera
//   const getCameraStream = async () => {
//     try {
//       const stream = await mediaDevices.getUserMedia({
//         audio: true,
//         video: {
//           facingMode: "user",
//           width: 640,
//           height: 480,
//           frameRate: 30,
//         },
//       });
//       setLocalStream(stream as any);
//       return stream;
//     } catch (err) {
//       console.error("Lỗi lấy Camera:", err);
//       return null;
//     }
//   };

//   const stopSound = async () => {
//     if (soundRef.current) {
//       try {
//         await soundRef.current.stopAsync();
//         await soundRef.current.unloadAsync();
//       } catch (e) {}
//       soundRef.current = null;
//     }
//   };

//   const playSound = async (type: "incoming" | "dialing") => {
//     await stopSound();
//     try {
//       const { sound } = await Audio.Sound.createAsync(
//         type === "incoming"
//           ? require("@/assets/sounds/incoming.mp3")
//           : require("@/assets/sounds/dialing.mp3"),
//       );
//       soundRef.current = sound;
//       await sound.setIsLoopingAsync(true);
//       await sound.playAsync();
//     } catch (e) {}
//   };

//   const resetCall = useCallback(() => {
//     // QUAN TRỌNG: Tắt camera khi kết thúc để giải phóng phần cứng
//     if (localStream) {
//       localStream.getTracks().forEach((track) => track.stop());
//       setLocalStream(null);
//     }
//     setCallData(null);
//     setIsCalling(false);
//     setIsReceiving(false);
//     setVideoAccepted(false);
//     stopSound();
//   }, [localStream]);

//   useEffect(() => {
//     if (!socket) return;
//     const handleSignal = (data: any) => {
//       if (data.signal?.type === "offer") {
//         const myId = String(user?.userId || user?._id);
//         if (String(data.from) !== myId) {
//           setCallData(data);
//           setIsReceiving(true);
//           playSound("incoming");
//           if (data.messageId) {
//             messageService
//               .updateCallStatus({
//                 messageId: data.messageId,
//                 status: "RINGING",
//                 conversationId: data.conversationId,
//               })
//               .catch(console.log);
//           }
//         }
//       }
//       if (data.signal?.type === "answer") {
//         setVideoAccepted(true);
//         setIsCalling(false);
//         stopSound();
//         setCallData((prev: any) => ({
//           ...prev,
//           fromName: data.fromName || prev?.toName || "Người dùng Web",
//         }));
//       }
//     };
//     socket.on("call:signal", handleSignal);
//     socket.on("call:rejected", resetCall);
//     socket.on("call:ended", resetCall);
//     return () => {
//       socket.off("call:signal");
//       socket.off("call:rejected");
//       socket.off("call:ended");
//     };
//   }, [socket, resetCall, user]);

//   const startCall = async (
//     targetId: string,
//     targetName: string,
//     convId: string,
//     type: string,
//   ) => {
//     setIsCalling(true);
//     playSound("dialing");
//     const stream = await getCameraStream(); // Mở camera ngay khi gọi

//     try {
//       const res = await messageService.createCallMessage({
//         conversationId: convId,
//         senderId: user?.userId || user?._id,
//         type: type.toUpperCase() as any,
//       });
//       const msgId = res.data?._id || res._id;
//       const payload = {
//         to: targetId,
//         toName: targetName,
//         conversationId: convId,
//         callType: type.toUpperCase(),
//         messageId: msgId,
//         from: user?.userId || user?._id,
//         fromName: user?.profile?.name || "Người dùng Mobile",
//         signal: {
//           type: "offer",
//           sdp: "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n",
//         },
//       };
//       setCallData(payload);
//       socket?.emit("call:signal", payload);
//     } catch (error) {
//       console.log("Lỗi gọi đi:", error);
//       resetCall();
//     }
//   };

//   const answerCall = async () => {
//     if (!callData) return;
//     await getCameraStream(); // Mở camera khi nghe
//     setVideoAccepted(true);
//     setIsReceiving(false);
//     stopSound();
//     socket?.emit("call:signal", {
//       to: callData.from,
//       conversationId: callData.conversationId,
//       messageId: callData.messageId,
//       fromName: user?.profile?.name || "Người dùng Mobile",
//       signal: { type: "answer", sdp: "v=0\r\no=-..." },
//     });
//     if (callData.messageId) {
//       messageService
//         .updateCallStatus({
//           messageId: callData.messageId,
//           status: "ACCEPTED",
//           conversationId: callData.conversationId,
//         })
//         .catch(console.log);
//     }
//   };

//   const endCall = (status = "ENDED") => {
//     if (callData) {
//       const target = isCalling ? callData.to : callData.from;
//       socket?.emit(status === "REJECTED" ? "call:reject" : "call:end", {
//         to: target,
//         conversationId: callData.conversationId,
//         messageId: callData.messageId,
//         status: isCalling && !videoAccepted ? "MISSED" : status,
//       });
//     }
//     resetCall();
//   };

//   return (
//     <VideoCallContext.Provider
//       value={{
//         callData,
//         isCalling,
//         isReceiving,
//         videoAccepted,
//         localStream,
//         startCall,
//         answerCall,
//         endCall,
//       }}
//     >
//       {children}
//     </VideoCallContext.Provider>
//   );
// };

// export const useVideoCall = () => useContext(VideoCallContext);
