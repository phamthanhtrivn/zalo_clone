import React, { useMemo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import type { ConversationItemType } from "@/types/conversation-item.type";

import { Feather, MaterialIcons } from "@expo/vector-icons";
import { formatMessageTime } from "@/utils/format-message-time..util";

interface ConversationItemProps {
  conversation: ConversationItemType;
  currentUserId: string;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  currentUserId,
}) => {
  const router = useRouter();

  const handlePress = () => {
    router.push(`/private/chat/${conversation.conversationId}`);
  };

  const lastMessage = conversation.lastMessage;

  const preview = useMemo(() => {
    const content = lastMessage?.content;
    const recalled = lastMessage?.recalled;

    if (recalled) {
      return {
        icon: null,
        text: "Tin nhắn đã được thu hồi",
      };
    }

    if (!content) return { icon: null, text: "" };

    if (content.text && /https?:\/\//.test(content.text)) {
      return {
        icon: <Feather name="link" size={14} color="#6b7280" />,
        text: content.text,
      };
    }

    if (content.icon) {
      return {
        icon: (
          <MaterialIcons name="emoji-emotions" size={14} color="#6b7280" />
        ),
        text: "Sticker",
      };
    }

    if (content.file) {
      switch (content.file.type) {
        case "IMAGE":
          return {
            icon: <MaterialIcons name="image" size={14} color="#6b7280" />,
            text: "Hình ảnh",
          };
        case "VIDEO":
          return {
            icon: <MaterialIcons name="videocam" size={14} color="#6b7280" />,
            text: "Video",
          };
        case "FILE":
          return {
            icon: <MaterialIcons name="attach-file" size={14} color="#6b7280" />,
            text: content.file.fileName,
          };
        default:
          return { icon: null, text: "" };
      }
    }

    if (content.text) {
      return {
        icon: null,
        text: content.text,
      };
    }

    return { icon: null, text: "" };
  }, [lastMessage]);

  const isOwn =
    lastMessage?.senderId === currentUserId ||
    lastMessage?.senderName === "Bạn";

  return (
    <TouchableOpacity
      onPress={handlePress}
      className="flex-row items-center px-4 py-3 pb-6 bg-white active:bg-gray-100 border-b border-gray-100"
    >
      {/* ✅ AVATAR FIX */}
      <View className="w-14 h-14 rounded-full overflow-hidden bg-gray-200 mr-5">
        <Image
          source={{ uri: conversation.avatar }}
          style={{ width: 56, height: 56, borderRadius: 999 }}
        />
      </View>

      {/* Content */}
      <View className="flex-1 ml-3">
        {/* Top */}
        <View className="flex-row justify-between items-center mb-0.5">
          <View className="flex-row items-center flex-1 mr-2">
            {conversation.type === "GROUP" && (
              <MaterialIcons
                name="groups"
                size={18}
                color="#6b7280"
                style={{ marginRight: 6 }}
              />
            )}

            <Text
              className="text-sm font-medium text-gray-900 flex-1"
              numberOfLines={1}
            >
              {conversation.name}
            </Text>
          </View>

          <Text className="text-[11px] text-gray-400">
            {formatMessageTime(conversation.lastMessageAt)}
          </Text>
        </View>

        {/* ✅ BOTTOM FIX CHUẨN WEB */}
        <View className="flex-row items-center mt-1">
          {/* sender */}
          <Text className="text-[13px] text-gray-500">
            {conversation.type === "PRIVATE" && !isOwn
              ? ""
              : `${isOwn ? "Bạn" : lastMessage?.senderName}: `}
          </Text>

          {/* preview */}
          <View className="flex-row items-center flex-1 ml-1">
            {preview.icon && (
              <View className="mr-1 justify-center">
                {preview.icon}
              </View>
            )}

            <Text
              numberOfLines={1}
              className="text-[13px] text-gray-500 flex-1"
            >
              {preview.text}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default React.memo(ConversationItem);