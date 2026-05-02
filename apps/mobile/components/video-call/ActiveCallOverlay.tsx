import React, { useEffect, useRef, useState } from "react";
import { 
  Modal, 
  TouchableOpacity, 
  View, 
  Text, 
  Dimensions, 
  Animated, 
  PanResponder,
  SafeAreaView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoCall } from "@/contexts/VideoCallContext";

// Safe WebRTC Import
let RTCView: any = View;
try {
  RTCView = require("react-native-webrtc").RTCView;
} catch (e) {}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

function CallTimer({ isOpen }: { isOpen: boolean }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setSeconds(0);
      return;
    }
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isOpen]);

  const formatDuration = (s: number) => {
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
  };

  return (
    <Text className="text-white font-mono text-lg tabular-nums">
      {formatDuration(seconds)}
    </Text>
  );
}

export default function ActiveCallOverlay() {
  const { 
    sessionState, 
    videoCallData, 
    localStream, 
    remoteStream, 
    leaveCall 
  } = useVideoCall();

  const isOpen = sessionState === "CONNECTED";
  const isVideo = videoCallData?.callType === "VIDEO";

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  // Draggable PIP Logic
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        pan.extractOffset();
      },
    })
  ).current;

  useEffect(() => {
    if (localStream) {
      setMicOn(localStream.getAudioTracks()?.[0]?.enabled ?? false);
      setCamOn(localStream.getVideoTracks()?.[0]?.enabled ?? false);
    }
  }, [localStream]);

  const toggleMic = () => {
    if (localStream) {
      const track = localStream.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setMicOn(track.enabled);
      }
    }
  };

  const toggleCam = () => {
    if (localStream) {
      const track = localStream.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setCamOn(track.enabled);
      }
    }
  };

  if (!isOpen) return null;

  const displayName = videoCallData.fromName || "Người dùng";

  return (
    <Modal visible={isOpen} animationType="fade" transparent={false}>
      <View className="flex-1 bg-black">
        {/* 1. REMOTE VIDEO (FULL SCREEN) */}
        <View className="flex-1 bg-slate-900">
          {isVideo && remoteStream ? (
            <RTCView
              streamURL={remoteStream.toURL()}
              className="flex-1"
              objectFit="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <View className="w-32 h-32 rounded-full bg-blue-600 items-center justify-center shadow-2xl">
                <Text className="text-4xl text-white font-bold">
                  {displayName.charAt(0)}
                </Text>
              </View>
              <Text className="text-white text-2xl font-medium mt-6">
                {displayName}
              </Text>
              <Text className="text-white/50 mt-2">Đang trò chuyện...</Text>
            </View>
          )}
        </View>

        {/* 2. LOCAL VIDEO (DRAGGABLE PIP) */}
        {isVideo && localStream && (
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              {
                position: "absolute",
                top: 60,
                right: 20,
                width: 120,
                height: 180,
                borderRadius: 16,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.2)",
                backgroundColor: "black",
                zIndex: 50,
                transform: [{ translateX: pan.x }, { translateY: pan.y }],
              },
            ]}
          >
            {camOn ? (
              <RTCView
                streamURL={localStream.toURL()}
                className="flex-1"
                objectFit="cover"
                mirror={true}
              />
            ) : (
              <View className="flex-1 items-center justify-center bg-slate-800">
                <Ionicons name="videocam-off" size={24} color="white" />
              </View>
            )}
          </Animated.View>
        )}

        {/* 3. CONTROLS */}
        <SafeAreaView className="absolute bottom-0 w-full">
          <View className="mx-6 mb-10 p-6 bg-white/10 rounded-[32px] border border-white/10 backdrop-blur-2xl flex-row items-center justify-between shadow-2xl">
            <CallTimer isOpen={isOpen} />

            <View className="flex-row items-center gap-4">
              <TouchableOpacity
                onPress={toggleMic}
                className={`w-12 h-12 rounded-full items-center justify-center ${micOn ? "bg-white/10" : "bg-red-500"}`}
              >
                <Ionicons name={micOn ? "mic" : "mic-off"} size={24} color="white" />
              </TouchableOpacity>

              {isVideo && (
                <TouchableOpacity
                  onPress={toggleCam}
                  className={`w-12 h-12 rounded-full items-center justify-center ${camOn ? "bg-white/10" : "bg-red-500"}`}
                >
                  <Ionicons name={camOn ? "videocam" : "videocam-off"} size={24} color="white" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => leaveCall()}
                className="w-12 h-12 rounded-full bg-red-600 items-center justify-center shadow-lg shadow-red-600/30"
              >
                <Ionicons name="call" size={24} color="white" style={{ transform: [{ rotate: "135deg" }] }} />
              </TouchableOpacity>
            </View>
            <View className="w-10" />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
