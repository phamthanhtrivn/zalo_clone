import { ScrollView, View, Text, TouchableOpacity } from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import FriendItem from "./FriendItem";
import { useEffect, useState } from "react";
import { userService } from "@/services/user.service";
import { router } from "expo-router";

export default function FriendsTab() {
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const response = await userService.getListFriends();
        setFriends(response.users);
      } catch (error) {
        console.error("Lỗi khi lấy danh sách bạn bè:", error);
      }
    };

    fetchFriends();
  }, []);

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Các mục chức năng đầu trang */}
      <TouchableOpacity onPress={() => router.push('/private/friend-requests')}>
        <View className="px-4 py-3 flex-row items-center">
          <View className="w-10 h-10 bg-blue-500 rounded-xl items-center justify-center">
            <MaterialIcons name="person-add" size={20} color="white" />
          </View>
          <Text className="ml-4 text-base flex-1">Lời mời kết bạn</Text>
        </View>
      </TouchableOpacity>

      <View className="px-4 py-3 flex-row items-center">
        <View className="w-10 h-10 bg-blue-100 rounded-xl items-center justify-center">
          <Ionicons name="calendar" size={20} color="#3b82f6" />
        </View>
        <View className="ml-4 flex-1">
          <Text className="text-base">Sinh nhật</Text>
          <Text className="text-gray-500 text-sm">
            Hôm nay là sinh nhật Tro Lê
          </Text>
        </View>
      </View>
      <View className="h-2 bg-gray-100" />
      {/* Bộ lọc */}
      <View className="flex-row p-4 gap-x-5">
        <TouchableOpacity className="px-4 py-1.5 rounded-full border border-gray-300 bg-gray-50">
          <Text className="text-gray-600">Tất cả 126</Text>
        </TouchableOpacity>
        <TouchableOpacity className="px-4 py-1.5 rounded-full bg-gray-200">
          <Text className="font-bold">Mới truy cập 15</Text>
        </TouchableOpacity>
      </View>

      {friends?.map((group: any, index: number) => (
        <View key={index}>
          <View className="px-4 py-2 bg-white">
            <Text className="font-bold text-sm text-black uppercase">
              {group.key}
            </Text>
          </View>
          <View>
            {group.friends.map((friend: any) => (
              <FriendItem key={friend.friendId} item={friend} isOnline={true} />
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
