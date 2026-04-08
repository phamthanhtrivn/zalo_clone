import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { formatTime } from "@/utils/format-message-time..util";
import type { MessagesType } from "@/types/messages.type";

type Props = {
  message: MessagesType;
  isMe: boolean;
  showAvatar: boolean;
  showName: boolean;
  showTime: boolean;
  onLongPress: () => void;
};

export default function MessageBubble({
  message,
  isMe,
  showAvatar,
  showName,
  showTime,
  onLongPress,
}: Props) {
  const content = message.content;
  const file = content?.file;

  // ===== RECALL =====
  if (message.recalled) {
    return (
      <View
        className={`max-w-[75%] px-3 py-2 rounded-xl ${isMe ? "bg-[#E5F1FF] self-end" : "bg-white self-start"
          }`}
      >
        <Text className="text-gray-500 italic">
          Tin nhắn đã được thu hồi
        </Text>

        {showTime && (
          <Text className="text-[10px] text-gray-400 mt-1 text-right">
            {formatTime(message.createdAt)}
          </Text>
        )}
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onLongPress={onLongPress}
      className={`mb-[2px] ${isMe ? "items-end" : "items-start"}`}
    >
      {/* NAME */}
      {!isMe && showName && (
        <Text className="text-[11px] text-gray-500 mb-[2px] ml-2">
          {message.senderId?.profile.name}
        </Text>
      )}

      {/* BUBBLE */}
      <View
        className={`
          max-w-[75%]
          px-3 py-2
          rounded-2xl
          ${isMe ? "bg-[#E5F1FF]" : "bg-white"}
        `}
      >
        {/* TEXT */}
        {content?.text && (
          <Text className="text-[14px] leading-[18px]">
            {content.text}
          </Text>
        )}

        {/* ICON */}
        {content?.icon && (
          <Text className="text-2xl">{content.icon}</Text>
        )}

        {/* IMAGE */}
        {file?.type === "IMAGE" && (
          <Image
            source={{ uri: file.fileKey }}
            className="w-[200px] h-[200px] rounded-lg mt-1"
            resizeMode="cover"
          />
        )}

        {/* VIDEO (basic) */}
        {file?.type === "VIDEO" && (
          <View className="mt-1">
            <Text className="text-xs text-gray-500">
              🎥 Video (mobile preview chưa build)
            </Text>
          </View>
        )}

        {/* FILE */}
        {file?.type === "FILE" && (
          <View className="flex-row items-center mt-1">
            <View className="flex-1">
              <Text className="text-sm font-medium" numberOfLines={1}>
                {file.fileName}
              </Text>
              <Text className="text-xs text-gray-500">
                {(file.fileSize / 1024).toFixed(1)} KB
              </Text>
            </View>
          </View>
        )}

        {/* TIME */}
        {showTime && (
          <Text className="text-[10px] text-gray-400 mt-1 text-right">
            {formatTime(message.createdAt)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}