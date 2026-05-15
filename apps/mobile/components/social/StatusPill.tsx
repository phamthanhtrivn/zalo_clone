import { Pressable, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function StatusPill({
  onPress,
}: {
  onPress?: () => void;
}) {
  return (
    <View className="bg-white px-4 py-3">
      <Pressable
        onPress={onPress}
        className="border border-dashed border-[#d1d5db] rounded-full px-4 py-3 flex-row items-center justify-between"
      >
        <View className="flex-row items-center">
          <Ionicons name="happy-outline" size={24} color="#9ca3af" />
          <Text className="text-[#9ca3af] text-[16px] ml-2">
            Cập nhật trạng thái 24 giờ
          </Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons name="flame-outline" size={20} color="#6b7280" />
          <Text className="ml-1 text-[#374151] text-[16px]">0</Text>
          <Ionicons name="chevron-down" size={18} color="#6b7280" />
        </View>
      </Pressable>
    </View>
  );
}
