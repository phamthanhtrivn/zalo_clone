import { useVideoCall } from "@/contexts/VideoCallContext";
import { Ionicons } from "@expo/vector-icons";
import { Modal, TouchableOpacity, View } from "react-native";

export default function ActiveCallOverlay() {
  const { videoAccepted, callData, endCall } = useVideoCall();

  if (!videoAccepted) return null;

  return (
    <Modal visible={true} fullScreen animationType="fade">
      <View className="flex-1 bg-black items-center justify-center">
        {/* Sau này luồng Video sẽ hiện ở đây */}
        <Text className="text-white text-xl">
          Đang đàm thoại với {callData?.fromName || callData?.toName}
        </Text>

        <TouchableOpacity
          onPress={endCall}
          className="absolute bottom-10 w-16 h-16 bg-red-500 rounded-full items-center justify-center"
        >
          <Ionicons
            name="call-outline"
            size={30}
            color="white"
            style={{ transform: [{ rotate: "135deg" }] }}
          />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
