import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "@/constants/colors";
import type { MessagesType } from "@/types/messages.type";

interface PinnedMessagesBarProps {
  pinnedMessages: MessagesType[];
  onUnpin: (messageId: string) => void;
  onJumpToMessage: (messageId: string) => void;
}

const PinnedMessagesBar: React.FC<PinnedMessagesBarProps> = ({
  pinnedMessages,
  onUnpin,
  onJumpToMessage,
}) => {
  if (!pinnedMessages || pinnedMessages.length === 0) return null;

  const first = pinnedMessages[0];
  const remaining = pinnedMessages.length - 1;

  const getPreviewText = (msg: MessagesType) => {
    if (msg.content.text) return msg.content.text;
    if (msg.content.file) return msg.content.file.fileName;
    return "Tin nhắn";
  };

  return (
    <View className="bg-white px-3 py-2 border-b border-gray-100 flex-row items-center justify-between">
      <TouchableOpacity 
        className="flex-row items-center flex-1"
        onPress={() => onJumpToMessage(first._id)}
      >
        <View className="bg-blue-50 p-1.5 rounded-full mr-3">
          <MaterialCommunityIcons name="pin-outline" size={20} color={COLORS.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-[12px] font-bold text-gray-500">Tin nhắn đã ghim</Text>
          <Text className="text-[13px] text-gray-800" numberOfLines={1}>
            <Text className="font-semibold">{first.senderId.profile.name}: </Text>
            {getPreviewText(first)}
          </Text>
        </View>
      </TouchableOpacity>

      <View className="flex-row items-center">
        {remaining > 0 && (
          <TouchableOpacity className="px-2 py-1 bg-gray-100 rounded-md mr-2">
            <Text className="text-[10px] text-gray-500">+{remaining} ghim</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => onUnpin(first._id)}>
          <MaterialCommunityIcons name="pin-off-outline" size={20} color="red" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PinnedMessagesBar;
