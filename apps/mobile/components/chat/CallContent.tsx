import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatDuration } from "@/utils/format-message-time.util";

interface Props {
  type: "VIDEO" | "VOICE";
  status: string;
  duration: number | null;
  isMe: boolean;
  isGroupCall?: boolean;
  isGroupChat?: boolean;
  sessionId?: string | null;
  onJoin?: (sessionId: string) => void;
}

const CallContent: React.FC<Props> = ({
  type,
  status,
  duration,
  isMe,
  isGroupCall,
  isGroupChat,
  sessionId,
  onJoin,
}) => {
  const isVideo = type === "VIDEO";

  if (isGroupCall) {
    const isActive =
      status === "ACTIVE" || status === "RINGING" || status === "CALLING";
    const isEnded = status === "ENDED";
    const iconName = isGroupChat
      ? "people"
      : isVideo
        ? "videocam"
        : "call";

    return (
      <View style={styles.groupContainer}>
        <View style={styles.iconCircle}>
          <Ionicons name={iconName as any} size={28} color="#0068ff" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            Cuộc gọi {isGroupChat ? "nhóm " : ""}{isVideo ? "video" : "thoại"}
          </Text>
          <Text style={styles.subtitle}>
            {isActive
              ? "Đang diễn ra..."
              : isEnded
                ? `Cuộc gọi đã kết thúc${duration ? ` • ${formatDuration(duration)}` : ""}`
                : "Cuộc gọi nhóm"}
          </Text>
        </View>
        {isActive && sessionId && (
          <TouchableOpacity
            onPress={() => onJoin?.(sessionId)}
            style={styles.joinButton}
          >
            <Text style={styles.joinButtonText}>Tham gia</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  let statusText = "";
  let iconName = isVideo ? "videocam" : "call";
  let iconColor = isMe ? "#0068ff" : "#4b5563";

  switch (status) {
    case "ENDED":
    case "ACCEPTED":
      statusText = `Cuộc gọi ${isVideo ? "video" : "thoại"} (${formatDuration(duration)})`;
      iconColor = "#0068ff";
      break;
    case "MISSED":
      statusText = isMe ? "Đối phương đã lỡ" : "Cuộc gọi nhỡ";
      iconName = "close-circle";
      iconColor = "#ef4444";
      break;
    case "REJECTED":
      statusText = isMe ? "Cuộc gọi bị từ chối" : "Cuộc gọi nhỡ";
      iconName = "close-circle";
      iconColor = "#ef4444";
      break;
    case "BUSY":
      statusText = "Máy bận";
      iconName = isVideo ? "videocam" : "call";
      iconColor = "#f97316";
      break;
    default:
      statusText = `Đang thiết lập...`;
  }

  return (
    <View style={styles.directContainer}>
      <View style={[styles.smallIconCircle, { backgroundColor: "rgba(255,255,255,0.6)" }]}>
        <Ionicons name={iconName as any} size={20} color={iconColor} />
      </View>
      <View style={styles.directTextContainer}>
        <Text
          numberOfLines={1}
          style={[
            styles.directTitle,
            { color: iconColor },
          ]}
        >
          {statusText}
        </Text>
        <Text style={styles.directSubtitle}>
          {isMe ? "Cuộc gọi đi" : "Cuộc gọi đến"}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  groupContainer: {
    alignItems: "center",
    paddingVertical: 12,
    width: 200,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  textContainer: {
    alignItems: "center",
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    textAlign: "center",
  },
  joinButton: {
    marginTop: 14,
    backgroundColor: "#0068ff",
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 22,
    width: "90%",
    alignItems: "center",
    shadowColor: "#0068ff",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  joinButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
  directContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 2,
    minWidth: 140,
  },
  smallIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  directTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
  directTitle: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  directSubtitle: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
});

export default React.memo(CallContent);
