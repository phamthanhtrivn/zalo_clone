import { Text, TouchableOpacity, View } from "react-native";

function GroupItem({ name, lastMsg, time }: any) {
  return (
    <TouchableOpacity className="flex-row items-center px-4 py-3 border-b border-gray-50">
      <View className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden flex-wrap flex-row p-0.5">
        {/* Giả lập avatar nhóm gồm nhiều người */}
        {[1,2,3,4].map(i => <View key={i} className="w-[48%] h-[48%] bg-gray-400 m-[1%]" />)}
      </View>
      <View className="ml-4 flex-1">
        <View className="flex-row justify-between">
          <Text className="text-base font-bold" numberOfLines={1}>{name}</Text>
          <Text className="text-gray-400 text-xs">{time}</Text>
        </View>
        <Text className="text-gray-500 text-sm mt-0.5" numberOfLines={1}>{lastMsg}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default GroupItem;