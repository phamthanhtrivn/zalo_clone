import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface FriendBannerProps {
  isFriend: boolean | null;
  friendStatus: string | null;
  handleAcceptFriend: () => void;
  handleAddFriend: () => void;
}

const FriendBanner: React.FC<FriendBannerProps> = ({
  isFriend, friendStatus, handleAcceptFriend, handleAddFriend
}) => {
  if (isFriend !== false) return null;

  return (
    <View className="bg-white py-2.5 px-4 flex-row items-center justify-center border-b border-[#f3f4f6]">
      <TouchableOpacity
        onPress={friendStatus === "PENDING" ? undefined : (friendStatus === "REQUESTED" ? handleAcceptFriend : handleAddFriend)}
        className="flex-row items-center gap-2"
      >
        <Ionicons
          name={friendStatus === "PENDING" ? "time-outline" : "person-add-outline"}
          size={20}
          color="#0068ff"
        />
        <Text className="text-[#0068ff] font-semibold text-sm">
          {friendStatus === "PENDING"
            ? "Đã gửi lời mời"
            : (friendStatus === "REQUESTED" ? "Chấp nhận lời mời" : "Kết bạn")}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default FriendBanner;
