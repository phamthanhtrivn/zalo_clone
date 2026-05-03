import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, Modal, Image, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoCall } from "@/contexts/VideoCallContext";

export default function OutgoingCallOverlay() {
  const { videoCallData, leaveCall, sessionState } = useVideoCall();

  const isOpen = sessionState === "CALLING";

  if (!isOpen) return null;

  const recipientName = videoCallData?.fromName || "Người dùng";
  const recipientAvatar = videoCallData?.fromAvatar || "";
  const isVideo = videoCallData?.callType === "VIDEO";

  return (
    <Modal visible={isOpen} transparent animationType="fade">
      <View className="flex-1 bg-slate-900">
        <SafeAreaView className="flex-1 items-center justify-between py-20 px-6">
          <View className="items-center">
            <View className="w-32 h-32 rounded-full bg-blue-600 items-center justify-center mb-8 border-4 border-blue-400 shadow-2xl overflow-hidden">
              {recipientAvatar ? (
                <Image source={{ uri: recipientAvatar }} className="w-full h-full" />
              ) : (
                <Text className="text-white text-5xl font-bold">
                  {recipientName.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>

            <Text className="text-white text-3xl font-bold mb-2 text-center">
              {recipientName}
            </Text>
            <Text className="text-blue-400 animate-pulse text-xl">
              {isVideo ? "Đang gọi video..." : "Đang gọi thoại..."}
            </Text>
          </View>

          <View className="items-center">
            <TouchableOpacity
              onPress={() => leaveCall()}
              className="w-20 h-20 bg-red-500 rounded-full items-center justify-center shadow-2xl shadow-red-500/40"
            >
              <Ionicons
                name="call"
                size={40}
                color="white"
                style={{ transform: [{ rotate: "135deg" }] }}
              />
            </TouchableOpacity>
            <Text className="text-white mt-4 font-medium text-lg">
              Hủy
            </Text>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
