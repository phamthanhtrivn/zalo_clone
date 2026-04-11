import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import { Video, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { formatTime } from "@/utils/format-message-time..util";
import type { MessagesType, ReactionType } from "@/types/messages.type";
import ReactionSummary from "./ReactionSummary";

type Props = {
  message: MessagesType;
  isMe: boolean;
  showAvatar: boolean;
  showName: boolean;
  showTime: boolean;
  isSelected?: boolean;
  isSelectMode?: boolean;
  onLongPress: () => void;
  onPress?: () => void;
  onOpenReactionModal?: (reactions: ReactionType[]) => void;
  renderReadReceipts?: boolean;
  isHighlighted?: boolean;
};

const TextWithLinks = ({ text }: { text: string }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return (
    <Text style={{ fontSize: 14, lineHeight: 20, color: "#111" }}>
      {parts.map((part, i) =>
        urlRegex.test(part) ? (
          <Text
            key={i}
            onPress={() => Linking.openURL(part)}
            style={{ color: "#0068ff", textDecorationLine: "underline" }}
          >
            {part}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        )
      )}
    </Text>
  );
};

const getFileIcon = (fileName: string) => {
  const lower = fileName.toLowerCase();

  const iconStyle = {
    width: 24,
    height: 24,
  };

  if (lower.endsWith(".pdf")) {
    return (
      <Image
        source="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/pdf/default.svg"
        style={iconStyle}
      />
    );
  }

  if (lower.endsWith(".doc") || lower.endsWith(".docx")) {
    return (
      <Image
        source="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/microsoft-word/default.svg"
        style={iconStyle}
      />
    );
  }

  if (lower.endsWith(".xls") || lower.endsWith(".xlsx")) {
    return (
      <Image
        source="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/microsoft-excel/default.svg"
        style={iconStyle}
      />
    );
  }

  return (
    <Image
      source="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/files/default.svg"
      style={iconStyle}
    />
  );
}

export default function MessageBubble({
  message,
  isMe,
  showAvatar,
  showName,
  showTime,
  isSelected = false,
  isSelectMode = false,
  onLongPress,
  onPress,
  onOpenReactionModal,
  renderReadReceipts = true,
  isHighlighted = false,
}: Props) {
  const content = message.content;
  const file = content?.file;

  const bubbleBg = isHighlighted
    ? "#FFF9C4"
    : isSelected
      ? "#B4CBE7"
      : isMe
        ? "#E5F1FF"
        : "white";

  if (message.recalled) {
    return (
      <View
        style={{
          flexDirection: isMe ? "row-reverse" : "row",
          alignItems: "flex-end",
          marginBottom: 2,
          paddingHorizontal: 8,
        }}
      >
        {!isMe && <View style={{ width: 32, marginRight: 6 }} />}

        <View
          style={{
            maxWidth: "75%",
            backgroundColor: bubbleBg,
            borderRadius: 16,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderWidth: 1,
            borderColor: "#e5e7eb",
          }}
        >
          <Text style={{ color: "#9ca3af", fontStyle: "italic", fontSize: 13 }}>
            Tin nhắn đã được thu hồi
          </Text>

          {showTime && (
            <Text style={{ fontSize: 10, color: "#9ca3af", marginTop: 4, textAlign: "right" }}>
              {formatTime(message.createdAt)}
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: isMe ? "row-reverse" : "row",
        alignItems: "flex-end",
        marginBottom: 2,
        paddingHorizontal: 8,
      }}
    >
      {/* AVATAR */}
      {!isMe && (
        showAvatar ? (
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              overflow: "hidden",
              backgroundColor: "#e5e7eb",
              marginRight: 6,
            }}
          >
            <Image
              source={{ uri: message.senderId?.profile.avatarUrl }}
              style={{ width: 32, height: 32 }}
            />
          </View>
        ) : (
          <View style={{ width: 32, marginRight: 6 }} />
        )
      )}

      {/* BUBBLE */}
      <View style={{ maxWidth: "75%", alignItems: isMe ? "flex-end" : "flex-start" }}>
        {/* NAME */}
        {!isMe && showName && (
          <Text style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>
            {message.senderId?.profile.name}
          </Text>
        )}

        {/* SELECT MODE */}
        {isSelectMode && (
          <View style={{ marginBottom: 4 }}>
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: isSelected ? "#0068ff" : "#d1d5db",
                backgroundColor: isSelected ? "#0068ff" : "white",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isSelected && (
                <Text style={{ color: "white", fontSize: 11 }}>✓</Text>
              )}
            </View>
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          onLongPress={onLongPress}
          onPress={onPress}
          style={{
            backgroundColor: bubbleBg,
            borderRadius: 16,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderWidth: 1,
            borderColor: "#e5e7eb",
          }}
        >
          {/* TEXT */}
          {content?.text && <TextWithLinks text={content.text} />}

          {/* ICON */}
          {content?.icon && (
            <Text style={{ fontSize: 32 }}>{content.icon}</Text>
          )}

          {/* IMAGE */}
          {file?.type === "IMAGE" && (
            <Image
              source={{ uri: file.fileKey }}
              style={{
                width: 200,
                height: 200,
                borderRadius: 10,
                marginTop: content?.text ? 6 : 0,
              }}
              contentFit="cover"
            />
          )}

          {/* VIDEO */}
          {file?.type === "VIDEO" && (
            <Video
              source={{ uri: file.fileKey }}
              style={{
                width: 220,
                height: 140,
                borderRadius: 10,
                marginTop: content?.text ? 6 : 0,
              }}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
            />
          )}

          {/* FILE */}
          {file?.type === "FILE" && (
            <TouchableOpacity
              onPress={() => Linking.openURL(file.fileKey)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 10,
                borderRadius: 12,
                backgroundColor: isMe ? "#E5F1FF" : "#F3F4F6",
                alignSelf: isMe ? "flex-end" : "flex-start",
              }}
            >
              {/* ICON giống web */}
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: "#fff",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {getFileIcon(file.fileName)}
              </View>

              {/* INFO */}
              <View style={{ flex: 1 }}>
                <Text numberOfLines={2} style={{ fontSize: 13, fontWeight: "600" }}>
                  {file.fileName}
                </Text>

                <Text style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                  {(file.fileSize / 1024).toFixed(1)} KB
                </Text>
              </View>

              {/* ICON DOWNLOAD */}
              <Ionicons name="download-outline" size={18} color="#6b7280" />
            </TouchableOpacity>
          )}

          {/* TIME */}
          {showTime && (
            <Text
              style={{
                fontSize: 10,
                color: "#9ca3af",
                marginTop: 4,
                textAlign: "right",
              }}
            >
              {formatTime(message.createdAt)}
            </Text>
          )}
        </TouchableOpacity>

        {/* REACTIONS */}
        {message.reactions?.length > 0 && (
          <View style={{ marginTop: 4 }}>
            <ReactionSummary
              reactions={message.reactions}
              onClick={() => onOpenReactionModal?.(message.reactions)}
            />
          </View>
        )}

        {/* READ RECEIPTS */}
        {renderReadReceipts && message.readReceipts?.length > 0 && (
          <View style={{ flexDirection: "row", gap: -8, marginTop: 4 }}>
            {message.readReceipts.slice(0, 3).map((rr) => (
              <Image
                key={rr.userId._id}
                source={{ uri: rr.userId.profile.avatarUrl }}
                style={{ width: 14, height: 14, borderRadius: 7 }}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}