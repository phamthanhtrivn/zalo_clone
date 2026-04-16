import { View, Text, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoCall } from "@/contexts/VideoCallContext";

export default function OutgoingCallOverlay() {
  const { isCalling, callData, cancelCall } = useVideoCall();

  if (!isCalling) return null;

  return (
    <Modal visible={true} transparent animationType="fade">
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <View className="w-32 h-32 rounded-full bg-blue-600 items-center justify-center mb-6 border-4 border-blue-400">
          <Text className="text-white text-4xl font-bold">
            {callData?.toName?.[0] || "Z"}
          </Text>
        </View>

        <Text className="text-white text-2xl font-bold mb-2">
          Đang gọi cho đối phương...
        </Text>
        <Text className="text-blue-400 animate-pulse text-lg">
          Đang kết nối...
        </Text>

        <View className="absolute bottom-20">
          <TouchableOpacity
            onPress={cancelCall}
            className="w-20 h-20 bg-red-500 rounded-full items-center justify-center shadow-xl"
          >
            <Ionicons
              name="call-outline"
              size={40}
              color="white"
              style={{ transform: [{ rotate: "135deg" }] }}
            />
          </TouchableOpacity>
          <Text className="text-white text-center mt-2 font-medium">Hủy</Text>
        </View>
      </View>
    </Modal>
  );
}
