import React from "react";
import { View, Text, TouchableOpacity, Linking } from "react-native";
import { Image } from "expo-image";
import { Video, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { formatTime } from "@/utils/format-message-time..util";
import type { MessagesType, ReactionType } from "@/types/messages.type";
import ReactionSummary from "./ReactionSummary";

// --- HELPERS ---
const formatDuration = (seconds: number | null) => {
  if (!seconds || seconds <= 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

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
  const call = message.call;

  const bubbleBg = isHighlighted
    ? "#FFF9C4"
    : isSelected
      ? "#B4CBE7"
      : isMe
        ? "#E5F1FF"
        : "white";

  // --- 1. RENDER LOGIC: TIN NHẮN CUỘC GỌI ---
  const renderCallContent = () => {
    if (!call) return null;
    const isVideo = call.type === "VIDEO";
    let statusText = "";
    let iconName: any = isVideo ? "videocam" : "call";
    let iconColor = isMe ? "#0068ff" : "#4b5563";

    switch (call.status) {
      case "ENDED":
      case "ACCEPTED":
        statusText = `Cuộc gọi ${isVideo ? "video" : "thoại"} (${formatDuration(call.duration)})`;
        break;
      case "MISSED":
        statusText = isMe ? "Đối phương đã lỡ" : "Cuộc gọi nhỡ";
        iconColor = "#ef4444";
        iconName = "call-outline";
        break;
      case "REJECTED":
        statusText = isMe ? "Cuộc gọi bị từ chối" : "Cuộc gọi nhỡ";
        iconColor = "#ef4444";
        break;
      case "BUSY":
        statusText = "Máy bận";
        iconColor = "#f59e0b";
        break;
      default:
        statusText = "Đang thiết lập...";
    }

    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingVertical: 4,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "rgba(255,255,255,0.8)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={iconName} size={20} color={iconColor} />
        </View>
        <View>
          <Text style={{ fontSize: 14, fontWeight: "600" }}>{statusText}</Text>
          <Text style={{ fontSize: 11, color: "#666" }}>
            {isMe ? "Cuộc gọi đi" : "Cuộc gọi đến"}
          </Text>
        </View>
      </View>
    );
  };

  // --- 2. RENDER LOGIC: THU HỒI ---
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
      {/* AVATAR NGƯỜI GỬI */}
      {!isMe &&
        (showAvatar ? (
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
              source={{ uri: message.senderId?.profile?.avatarUrl }}
              style={{ width: 32, height: 32 }}
            />
          </View>
        ) : (
          <View style={{ width: 32, marginRight: 6 }} />
        ))}

      <View
        style={{
          maxWidth: "75%",
          alignItems: isMe ? "flex-end" : "flex-start",
        }}
      >
        {/* TÊN NGƯỜI GỬI */}
        {!isMe && showName && (
          <Text
            style={{
              fontSize: 11,
              color: "#6b7280",
              marginBottom: 2,
              marginLeft: 4,
            }}
          >
            {message.senderId?.profile?.name || "Người dùng"}
          </Text>
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
            borderColor: isMe ? "transparent" : "#e5e7eb",
          }}
        >
          {/* NỘI DUNG CHÍNH */}
          {call ? (
            renderCallContent()
          ) : (
            <>
              {content?.text && (
                <Text style={{ fontSize: 15, color: "#111" }}>
                  {content.text}
                </Text>
              )}

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
            </>
          )}

          {/* THỜI GIAN TRONG BUBBLE */}
          {showTime && (
            <Text
              style={{
                fontSize: 10,
                color: isMe ? "#0068ff" : "#9ca3af",
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

        {/* READ RECEIPTS (FIX CRASH TẠI ĐÂY) */}
        {renderReadReceipts && message.readReceipts?.length > 0 && (
          <View
            style={{
              flexDirection: "row",
              marginTop: 4,
              marginLeft: isMe ? 0 : 4,
            }}
          >
            {message.readReceipts.slice(0, 3).map((rr: any, idx: number) => (
              <Image
                key={rr.userId?._id || idx}
                source={{
                  uri:
                    rr.userId?.profile?.avatarUrl ||
                    "https://via.placeholder.com/150",
                }}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  borderSize: 1,
                  borderColor: "white",
                  marginLeft: idx > 0 ? -4 : 0,
                }}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
