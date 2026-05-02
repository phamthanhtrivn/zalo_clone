import { Ionicons } from "@expo/vector-icons";
import { View, Text, Image } from "react-native";

function FriendItem({ item, isOnline }: any) {
  return (
    <View className="flex-row items-center px-4 py-3 active:bg-gray-100">
      {/* Khối Avatar */}
      <View className="relative">
        <Image
          source={{ 
            uri: item?.avatarUrl
          }}
          className="w-14 h-14 rounded-full border border-gray-200"
          resizeMode="cover"
        />
        
        {/* Chấm xanh Online */}
        {isOnline && (
          <View className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
        )}
      </View>

      {/* Tên User */}
      <Text className="ml-4 flex-1 text-[17px] font-medium text-gray-800">
        {item?.name}
      </Text>

      {/* Cụm Icon Call & Video */}
      <View className="flex-row gap-x-6 items-center pr-1">
        <Ionicons name="call-outline" size={22} color="#555" />
        <Ionicons name="videocam-outline" size={25} color="#555" />
      </View>
    </View>
  );
}

export default FriendItem;