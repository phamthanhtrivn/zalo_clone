import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoCall } from "@/contexts/VideoCallContext";

export default function IncomingCallOverlay() {
  // Đổi rejectCall thành endCall
  const { isReceiving, callData, endCall, answerCall } = useVideoCall();

  if (!isReceiving || !callData) return null;

  return (
    <Modal visible={true} transparent animationType="slide">
      <View className="flex-1 bg-black/95 items-center justify-center">
        <View className="w-28 h-28 rounded-full bg-blue-500 items-center justify-center mb-6 border-4 border-white/20">
          <Text className="text-white text-4xl font-bold">
            {callData?.fromName?.[0]?.toUpperCase() || "Z"}
          </Text>
        </View>
        <Text className="text-white text-2xl font-bold mb-2">
          {callData?.fromName || "Người dùng"}
        </Text>
        <Text className="text-blue-400 mb-28 animate-pulse text-lg">
          Đang gọi video cho bạn...
        </Text>

        <View className="flex-row gap-20">
          {/* Nút Từ chối */}
          <TouchableOpacity
            onPress={() => endCall("REJECTED")} // Sửa ở đây
            className="w-18 h-18 bg-red-500 rounded-full items-center justify-center shadow-lg"
          >
            <Ionicons name="close" size={40} color="white" />
          </TouchableOpacity>

          {/* Nút Trả lời */}
          <TouchableOpacity
            onPress={answerCall}
            className="w-18 h-18 bg-green-500 rounded-full items-center justify-center shadow-lg"
          >
            <Ionicons name="videocam" size={40} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
