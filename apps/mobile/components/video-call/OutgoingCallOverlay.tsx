import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoCall } from "@/contexts/VideoCallContext";

export default function OutgoingCallOverlay() {
  // Đổi cancelCall thành endCall
  const { isCalling, callData, endCall } = useVideoCall();

  if (!isCalling || !callData) return null;

  return (
    <Modal visible={true} transparent animationType="fade">
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <View className="w-32 h-32 rounded-full bg-blue-600 items-center justify-center mb-8 border-4 border-blue-400 shadow-2xl">
          <Text className="text-white text-5xl font-bold">
            {callData?.toName?.[0]?.toUpperCase() || "Z"}
          </Text>
        </View>

        <Text className="text-white text-3xl font-bold mb-2">
          {callData?.toName || "Đang gọi..."}
        </Text>
        <Text className="text-blue-400 animate-pulse text-xl">
          Đang kết nối...
        </Text>

        <View className="absolute bottom-24 items-center">
          <TouchableOpacity
            onPress={() => endCall()} // Sửa ở đây
            className="w-20 h-20 bg-red-500 rounded-full items-center justify-center shadow-xl"
          >
            <Ionicons
              name="call"
              size={40}
              color="white"
              style={{ transform: [{ rotate: "135deg" }] }}
            />
          </TouchableOpacity>
          <Text className="text-white mt-4 font-medium text-lg">
            Hủy cuộc gọi
          </Text>
        </View>
      </View>
    </Modal>
  );
}
