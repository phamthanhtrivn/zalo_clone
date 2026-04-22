import React from "react";
import { Modal, TouchableOpacity, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoCall } from "@/contexts/VideoCallContext";
import { useAppSelector } from "@/store/store";

export default function ActiveCallOverlay() {
  const { videoAccepted, callData, endCall } = useVideoCall();
  const user = useAppSelector((state) => state.auth.user);

  if (!videoAccepted || !callData) return null;

  const myId = String(user?.userId || user?._id || "");
  const callerId = String(callData.from || "");

  const isIinitator = myId === callerId;
  const displayName = isIinitator ? callData.toName : callData.fromName;
  return (
    <Modal visible={true} fullScreen animationType="fade">
      <View className="flex-1 bg-black items-center justify-center">
        <View className="flex-1 w-full items-center justify-center">
          <Text className="text-gray-400 text-lg mb-2">Đang đàm thoại với</Text>
          <Text className="text-blue-400 text-3xl font-bold px-6 text-center uppercase">
            {displayName}
          </Text>
        </View>

        <View className="absolute bottom-16 items-center">
          <TouchableOpacity
            onPress={() => endCall("ENDED")}
            className="w-20 h-20 bg-red-500 rounded-full items-center justify-center shadow-2xl"
          >
            <Ionicons
              name="call"
              size={35}
              color="white"
              style={{ transform: [{ rotate: "135deg" }] }}
            />
          </TouchableOpacity>
          <Text className="text-white mt-3 font-medium">Kết thúc</Text>
        </View>
      </View>
    </Modal>
  );
}

// Build co video
// import React from "react";
// import { Modal, TouchableOpacity, View, Text } from "react-native";
// import { Ionicons } from "@expo/vector-icons";
// import { useVideoCall } from "@/contexts/VideoCallContext";
// import { useAppSelector } from "@/store/store";
// import { RTCView } from "react-native-webrtc";

// export default function ActiveCallOverlay() {
//   const { videoAccepted, callData, endCall, localStream } = useVideoCall();
//   const user = useAppSelector((state) => state.auth.user);

//   if (!videoAccepted || !callData) return null;

//   const myId = String(user?.userId || user?._id || "");
//   const callerId = String(callData.from || "");
//   const isInitiator = myId === callerId;
//   const displayName = isInitiator ? callData.toName : callData.fromName;

//   return (
//     <Modal visible={true} fullScreen animationType="fade">
//       <View className="flex-1 bg-black">
//         {/* HIỂN THỊ HÌNH ẢNH CAMERA */}
//         {localStream ? (
//           <RTCView
//             streamURL={localStream.toURL()}
//             style={{ flex: 1 }}
//             objectFit="cover"
//             mirror={true} // Soi gương cho camera trước
//           />
//         ) : (
//           <View className="flex-1 items-center justify-center">
//             <Text className="text-white text-xl">Đang kết nối camera...</Text>
//           </View>
//         )}

//         {/* OVERLAY THÔNG TIN NGƯỜI ĐANG CHAT (Nằm đè lên Video) */}
//         <View className="absolute top-16 w-full items-center">
//           <View className="bg-black/40 px-6 py-2 rounded-full border border-white/20">
//             <Text className="text-white text-xl font-bold uppercase">
//               {displayName}
//             </Text>
//           </View>
//           <Text className="text-blue-400 mt-2 font-semibold">
//             Đang đàm thoại...
//           </Text>
//         </View>

//         {/* THANH ĐIỀU KHIỂN DƯỚI CÙNG */}
//         <View className="absolute bottom-16 w-full items-center">
//           <TouchableOpacity
//             onPress={() => endCall("ENDED")}
//             className="w-20 h-20 bg-red-500 rounded-full items-center justify-center shadow-2xl border-4 border-white/20"
//           >
//             <Ionicons
//               name="call"
//               size={35}
//               color="white"
//               style={{ transform: [{ rotate: "135deg" }] }}
//             />
//           </TouchableOpacity>
//           <Text className="text-white mt-3 font-medium text-lg">Kết thúc</Text>
//         </View>
//       </View>
//     </Modal>
//   );
// }
