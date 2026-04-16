import { View, Text, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoCall } from "@/contexts/VideoCallContext";

export default function IncomingCallOverlay() {
  const { isReceiving, callData, rejectCall } = useVideoCall();

  if (!isReceiving) return null;

  return (
    <Modal visible={true} transparent animationType="slide">
      <View className="flex-1 bg-black/90 items-center justify-center">
        <View className="w-24 h-24 rounded-full bg-blue-500 items-center justify-center mb-5">
          <Text className="text-white text-3xl font-bold">
            {callData?.fromName?.[0]}
          </Text>
        </View>
        <Text className="text-white text-xl font-bold mb-2">
          {callData?.fromName || "Người dùng"}
        </Text>
        <Text className="text-gray-400 mb-20">Đang gọi video cho bạn...</Text>

        <View className="flex-row gap-20">
          {/* Nút Từ chối */}
          <TouchableOpacity
            onPress={rejectCall}
            className="w-16 h-16 bg-red-500 rounded-full items-center justify-center"
          >
            <Ionicons name="close" size={32} color="white" />
          </TouchableOpacity>

          {/* Nút Trả lời */}
          <TouchableOpacity className="w-16 h-16 bg-green-500 rounded-full items-center justify-center">
            <Ionicons name="videocam" size={32} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
