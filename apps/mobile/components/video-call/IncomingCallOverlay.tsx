import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, Modal, Image, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoCall } from "@/contexts/VideoCallContext";
import { useAppSelector } from "@/store/store";

export default function IncomingCallOverlay() {
  const { videoCallData, leaveCall, answerCall, sessionState } = useVideoCall();
  const conversations = useAppSelector((state) => state.conversation.conversations);

  const isOpen = sessionState === "RINGING";

  const currentConversation = useMemo(() => {
    if (!videoCallData?.conversationId) return null;
    return conversations.find(
      (c) => String(c.conversationId) === String(videoCallData.conversationId)
    );
  }, [conversations, videoCallData?.conversationId]);

  const callerName = useMemo(() => {
    return videoCallData?.fromName || currentConversation?.name || "Người dùng";
  }, [videoCallData?.fromName, currentConversation]);

  const callerAvatar = useMemo(() => {
    return videoCallData?.fromAvatar || currentConversation?.avatar || "";
  }, [videoCallData?.fromAvatar, currentConversation]);

  if (!isOpen) return null;

  const isVideo = videoCallData?.callType === "VIDEO";

  return (
    <Modal visible={isOpen} transparent animationType="slide">
      <View className="flex-1 bg-black/40">
        <View className="absolute inset-0 bg-black/60 blur-md" />
        
        <SafeAreaView className="flex-1 items-center justify-center px-6">
          <View className="w-full bg-white/90 backdrop-blur-3xl rounded-[32px] p-8 shadow-2xl items-center border border-white/20">
            <View className="relative mb-6">
              <View className="w-24 h-24 rounded-full bg-blue-500 items-center justify-center border-4 border-white overflow-hidden shadow-lg">
                {callerAvatar ? (
                  <Image source={{ uri: callerAvatar }} className="w-full h-full" />
                ) : (
                  <Text className="text-white text-4xl font-bold">
                    {callerName.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <View className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white items-center justify-center shadow">
                <Ionicons 
                  name={isVideo ? "videocam" : "call"} 
                  size={16} 
                  color="#0068ff" 
                />
              </View>
            </View>

            <Text className="text-gray-500 text-sm mb-1">
              Cuộc gọi {isVideo ? "video" : "thoại"} đến
            </Text>
            <Text className="text-slate-900 text-2xl font-bold mb-10 text-center">
              {callerName}
            </Text>

            <View className="flex-row w-full gap-4">
              <TouchableOpacity
                onPress={() => leaveCall("REJECTED")}
                className="flex-1 h-16 bg-red-500 rounded-2xl items-center justify-center shadow-lg shadow-red-500/20"
              >
                <View className="flex-row items-center gap-2">
                  <Ionicons name="close" size={24} color="white" />
                  <Text className="text-white font-bold text-lg">Từ chối</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={answerCall}
                className="flex-1 h-16 bg-emerald-500 rounded-2xl items-center justify-center shadow-lg shadow-emerald-500/20"
              >
                <View className="flex-row items-center gap-2">
                  <Ionicons name={isVideo ? "videocam" : "call"} size={24} color="white" />
                  <Text className="text-white font-bold text-lg">Trả lời</Text>
                </View>
              </TouchableOpacity>
            </View>

            <Text className="text-gray-400 text-xs mt-6">
              Nhấn “Trả lời” để bắt đầu trò chuyện
            </Text>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
