import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons, MaterialIcons, AntDesign } from "@expo/vector-icons";
import GroupAvatar from "../ui/GroupAvatar";
import Header from "../common/Header";
import { moderateScale } from "@/utils/responsive";

interface ChatHeaderProps {
  conversation: any;
  isFriend: boolean | null;
  handleVideoCall: () => void;
  router: any;
  id: string;
  setShowInfoSheet: (val: boolean) => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation, isFriend, handleVideoCall, router, id, setShowInfoSheet
}) => {
  return (
    <Header
      back
      gradient
      leftChild={
        <GroupAvatar
          uri={conversation?.avatar}
          name={conversation?.name || ""}
          size={38}
        />
      }
      centerChild={
        <View>
          <View className="flex-row items-center">
            <Text
              className="text-white text-base font-medium"
              numberOfLines={1}
            >
              {conversation?.name}
            </Text>
            {conversation?.type === "AI" && (
              <MaterialIcons
                name="verified"
                size={14}
                color="white"
                className="ml-1"
              />
            )}
          </View>
          {isFriend === false && (
            <View className="flex-row mt-0.5">
              <View className="bg-white/20 px-1.5 py-px rounded-[10px]">
                <Text className="text-white text-[10px] font-semibold">
                  Người lạ
                </Text>
              </View>
            </View>
          )}
        </View>
      }
      rightChild={
        <View className="flex-row items-center gap-3">
          <TouchableOpacity className="p-1" onPress={handleVideoCall}>
            <Ionicons name="videocam-outline" size={moderateScale(24)} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            className="p-1"
            onPress={() =>
              router.push({
                pathname: "/private/search",
                params: { conversationId: id },
              })
            }
          >
            <Ionicons name="search-outline" size={moderateScale(24)} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            className="p-1"
            onPress={() => setShowInfoSheet(true)}
          >
            <AntDesign name="unordered-list" size={moderateScale(24)} color="white" />
          </TouchableOpacity>
        </View>
      }
    />
  );
};

export default ChatHeader;
