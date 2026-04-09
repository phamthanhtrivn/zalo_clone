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
import { useAppSelector } from "@/store/store";

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
};

/** Render text with clickable links */
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
}: Props) {
  const content = message.content;
  const file = content?.file;

  const bubbleBg = isSelected
    ? "#B4CBE7"
    : isMe
    ? "#E5F1FF"
    : "white";

  // ===== RECALLED =====
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
            backgroundColor: isMe ? "#E5F1FF" : "white",
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
      {/* Left avatar area (non-me) */}
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

      {/* Bubble + reaction summary */}
      <View style={{ maxWidth: "75%", alignItems: isMe ? "flex-end" : "flex-start" }}>
        {/* sender name */}
        {!isMe && showName && (
          <Text style={{ fontSize: 11, color: "#6b7280", marginBottom: 2, marginLeft: 2 }}>
            {message.senderId?.profile.name}
          </Text>
        )}

        {/* select mode indicator */}
        {isSelectMode && (
          <View style={{ flexDirection: isMe ? "row-reverse" : "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
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
              {isSelected && <Text style={{ color: "white", fontSize: 11 }}>✓</Text>}
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

          {/* ICON/STICKER */}
          {content?.icon && (
            <Text style={{ fontSize: 32 }}>{content.icon}</Text>
          )}

          {/* IMAGE */}
          {file?.type === "IMAGE" && (
            <Image
              source={{ uri: file.fileKey }}
              style={{ width: 200, height: 200, borderRadius: 10, marginTop: content?.text ? 6 : 0 }}
              contentFit="cover"
            />
          )}

          {/* VIDEO */}
          {file?.type === "VIDEO" && (
            <Video
              source={{ uri: file.fileKey }}
              style={{ width: 220, height: 140, borderRadius: 10, marginTop: content?.text ? 6 : 0 }}
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
                gap: 10,
                marginTop: content?.text ? 6 : 0,
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  backgroundColor: isMe ? "rgba(0,104,255,0.15)" : "#f3f4f6",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 9, fontWeight: "800", color: isMe ? "#0068ff" : "#374151" }}>
                  {file.fileName.split(".").pop()?.toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "500" }}>
                  {file.fileName}
                </Text>
                <Text style={{ fontSize: 11, color: "#6b7280" }}>
                  {(file.fileSize / 1024).toFixed(1)} KB
                </Text>
              </View>
              <Ionicons name="download-outline" size={18} color="#6b7280" />
            </TouchableOpacity>
          )}

          {/* TIME */}
          {showTime && (
            <Text style={{ fontSize: 10, color: "#9ca3af", marginTop: 4, textAlign: "right" }}>
              {formatTime(message.createdAt)}
            </Text>
          )}
        </TouchableOpacity>

        {/* REACTION SUMMARY */}
        {message.reactions && message.reactions.length > 0 && (
          <View style={{ marginTop: 4, marginLeft: isMe ? 0 : 4, marginRight: isMe ? 4 : 0 }}>
            <ReactionSummary
              reactions={message.reactions}
              onClick={() => onOpenReactionModal?.(message.reactions)}
            />
          </View>
        )}

        {/* READ RECEIPTS AVATARS */}
        {renderReadReceipts && message.readReceipts && message.readReceipts.length > 0 && (
          <View
            style={{
              flexDirection: "row-reverse",
              marginTop: 4,
              gap: -8, // Overlap avatars
              paddingRight: isMe ? 4 : 0,
              paddingLeft: isMe ? 0 : 4,
            }}
          >
            {message.readReceipts.slice(0, 3).map((rr, idx) => (
              <View
                key={rr.userId._id}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  borderWidth: 1,
                  borderColor: "white",
                  overflow: "hidden",
                  backgroundColor: "#e5e7eb",
                  zIndex: 3 - idx,
                }}
              >
                <Image
                  source={{ uri: rr.userId.profile.avatarUrl }}
                  style={{ width: 14, height: 14 }}
                />
              </View>
            ))}
            {message.readReceipts.length > 3 && (
              <View
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: "#9ca3af",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 0,
                }}
              >
                <Text style={{ fontSize: 7, color: "white", fontWeight: "bold" }}>
                  +{message.readReceipts.length - 3}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}