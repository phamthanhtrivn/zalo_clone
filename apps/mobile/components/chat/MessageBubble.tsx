import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  Dimensions,
  Modal,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { Video, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";

import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { formatTime } from "@/utils/format-message-time..util";
import type { MessagesType, ReactionType } from "@/types/messages.type";
import ReactionSummary from "./ReactionSummary";
import { truncateFileName } from "@/utils/render-file";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// --- HELPERS ---
const formatDuration = (seconds: number | null) => {
  if (!seconds || seconds <= 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const TextWithLinks = ({ text }: { text: string }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return (
    <Text style={{ fontSize: 15, lineHeight: 22, color: "#111" }}>
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
        ),
      )}
    </Text>
  );
};

const getFileIconName = (fileName: string): { name: any; color: string } => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf"))
    return { name: "document-text", color: "#ef4444" };
  if (lower.endsWith(".doc") || lower.endsWith(".docx"))
    return { name: "document", color: "#3b82f6" };
  if (lower.endsWith(".xls") || lower.endsWith(".xlsx"))
    return { name: "grid", color: "#22c55e" };
  if (lower.endsWith(".zip") || lower.endsWith(".rar"))
    return { name: "archive", color: "#f59e0b" };
  return { name: "document-outline", color: "#6b7280" };
};

const formatFileSize = (bytes: number) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  onReplyPress?: (messageId: string) => void;
  isGroup: boolean;
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
  onReplyPress,
  isGroup,
}: Props) {
  const content = message.content;
  const call = message.call;
  // Hợp nhất dữ liệu file: hỗ trợ cả file đơn (HEAD) và mảng files (KhongVanTam)
  const allFiles = content?.files || (content?.file ? [content.file] : []);

  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);

  const mediaFiles = allFiles.filter(
    (f: any) => f.type === "IMAGE" || f.type === "VIDEO",
  );
  const docFiles = allFiles.filter((f: any) => f.type === "FILE");

  const handleDownload = async (file: any) => {
    try {
      setDownloading(true);
      const safeFileName = decodeURIComponent(file.fileName || "file");
      const fileUri = FileSystem.documentDirectory + safeFileName;
      const { uri } = await FileSystem.downloadAsync(file.fileKey, fileUri);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: file.mimeType,
          dialogTitle: safeFileName,
        });
      } else {
        Alert.alert("Thành công", `Đã tải: ${safeFileName}`);
      }
    } catch (err) {
      Alert.alert("Lỗi", "Không thể tải file.");
    } finally {
      setDownloading(false);
    }
  };

  const bubbleBg = isHighlighted
    ? "#FFF9C4"
    : isSelected
      ? "#B4CBE7"
      : isMe
        ? "#E5F1FF"
        : "white";

  // --- LOGIC TIN NHẮN HẾT HẠN / THU HỒI (Merge HEAD & KVT) ---
  if (message.expired || message.recalled) {
    const isRecall = message.recalled;
    return (
      <View
        style={[
          styles.container,
          { flexDirection: isMe ? "row-reverse" : "row" },
        ]}
      >
        {!isMe &&
          (showAvatar ? (
            <View style={styles.avatarWrap}>
              <Image
                source={{ uri: message.senderId?.profile?.avatarUrl }}
                style={styles.avatarImg}
              />
            </View>
          ) : (
            <View style={{ width: 32, marginRight: 6 }} />
          ))}
        <View
          style={[
            styles.bubbleBase,
            { backgroundColor: bubbleBg, borderColor: "#e5e7eb" },
          ]}
        >
          <Text style={styles.italicText}>
            {isRecall ? "Tin nhắn đã được thu hồi" : "Tin nhắn đã hết hạn"}
          </Text>
        </View>
      </View>
    );
  }

  // --- RENDER LOGIC: CUỘC GỌI (Từ HEAD) ---
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
      case "REJECTED":
        statusText = isMe ? "Đối phương đã lỡ" : "Cuộc gọi nhỡ";
        iconColor = "#ef4444";
        iconName = "call-outline";
        break;
      case "BUSY":
        statusText = "Máy bận";
        iconColor = "#f59e0b";
        break;
      default:
        statusText = "Đang thiết lập...";
    }

    return (
      <View style={styles.callContent}>
        <View style={styles.callIconCircle}>
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

  return (
    <View
      style={[
        styles.container,
        { flexDirection: isMe ? "row-reverse" : "row" },
      ]}
    >
      {!isMe &&
        (showAvatar ? (
          <View style={styles.avatarWrap}>
            <Image
              source={{ uri: message.senderId?.profile?.avatarUrl }}
              style={styles.avatarImg}
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
        {!isMe && isGroup && showName && (
          <Text style={styles.senderName}>
            {message.senderId?.profile?.name}
          </Text>
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          onLongPress={onLongPress}
          onPress={onPress}
          style={[
            styles.bubbleBase,
            {
              backgroundColor: bubbleBg,
              borderColor: isMe ? "transparent" : "#e5e7eb",
            },
          ]}
        >
          {/* REPLY BOX (Khôi phục từ KVT) */}
          {message.repliedId && (
            <TouchableOpacity
              onPress={() => onReplyPress?.(message.repliedId?._id || "")}
              style={styles.replyBox}
            >
              <Text numberOfLines={1} style={styles.replySender}>
                {message.repliedId.senderId?.profile?.name || "Người dùng"}
              </Text>
              <Text numberOfLines={1} style={styles.replyText}>
                {message.repliedId.content?.text ||
                  (message.repliedId.content?.files?.length > 0
                    ? "[Tệp đính kèm]"
                    : "[Biểu cảm]")}
              </Text>
            </TouchableOpacity>
          )}

          {call ? (
            renderCallContent()
          ) : (
            <>
              {content?.text && <TextWithLinks text={content.text} />}
              {content?.icon && (
                <Text style={{ fontSize: 32 }}>{content.icon}</Text>
              )}

              {/* MEDIA GRID (Khôi phục từ KVT) */}
              {mediaFiles.length > 0 && (
                <View style={styles.mediaGrid}>
                  {mediaFiles.map((file: any, index: number) => {
                    const imgSize =
                      mediaFiles.length === 1
                        ? 200
                        : (SCREEN_WIDTH * 0.75 - 40) /
                          (mediaFiles.length >= 3 ? 3 : 2);
                    return (
                      <TouchableOpacity
                        key={index}
                        onPress={() =>
                          setPreviewIndex(mediaFiles.indexOf(file))
                        }
                        style={{
                          width: imgSize,
                          height: 110,
                          borderRadius: 8,
                          overflow: "hidden",
                        }}
                      >
                        {file.type === "IMAGE" ? (
                          <Image
                            source={{ uri: file.fileKey }}
                            style={styles.fullSize}
                          />
                        ) : (
                          <View style={styles.fullSize}>
                            <Video
                              source={{ uri: file.fileKey }}
                              style={styles.fullSize}
                              resizeMode={ResizeMode.COVER}
                            />
                            <View style={styles.playIcon}>
                              <Ionicons name="play" size={18} color="white" />
                            </View>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* DOC FILES (Khôi phục từ KVT) */}
              {docFiles.map((file: any, index: number) => (
                <View
                  key={index}
                  style={[
                    styles.docRow,
                    {
                      backgroundColor: isMe
                        ? "rgba(255,255,255,0.6)"
                        : "#f3f4f6",
                    },
                  ]}
                >
                  <Ionicons
                    name={getFileIconName(file.fileName).name}
                    size={22}
                    color={getFileIconName(file.fileName).color}
                  />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={styles.docName}>
                      {truncateFileName(file.fileName, 17)}
                    </Text>
                    <Text style={styles.docSize}>
                      {formatFileSize(file.fileSize)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDownload(file)}
                    style={styles.downloadBtn}
                  >
                    {downloading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Ionicons
                        name="download-outline"
                        size={17}
                        color="white"
                      />
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {showTime && (
            <Text
              style={[styles.timeText, { color: isMe ? "#0068ff" : "#9ca3af" }]}
            >
              {formatTime(message.createdAt)}
            </Text>
          )}
        </TouchableOpacity>

        {/* FOOTER */}
        {message.reactions?.length > 0 && (
          <ReactionSummary
            reactions={message.reactions}
            onClick={() => onOpenReactionModal?.(message.reactions)}
          />
        )}
        {renderReadReceipts && message.readReceipts?.length > 0 && (
          <View style={styles.receiptsWrap}>
            {message.readReceipts.slice(0, 3).map((rr: any, idx: number) => (
              <Image
                key={idx}
                source={{ uri: rr.userId?.profile?.avatarUrl }}
                style={[styles.receiptAvatar, { marginLeft: idx > 0 ? -4 : 0 }]}
              />
            ))}
          </View>
        )}
      </View>

      {/* MEDIA PREVIEW MODAL (Khôi phục từ KVT) */}
      <Modal visible={previewIndex !== null} transparent animationType="fade">
        <View style={styles.previewOverlay}>
          <TouchableOpacity
            style={styles.closePreview}
            onPress={() => setPreviewIndex(null)}
          >
            <Ionicons name="close-circle" size={34} color="white" />
          </TouchableOpacity>
          {previewIndex !== null &&
          mediaFiles[previewIndex]?.type === "IMAGE" ? (
            <Image
              source={{ uri: mediaFiles[previewIndex].fileKey }}
              style={styles.previewContent}
              contentFit="contain"
            />
          ) : (
            <Video
              source={{ uri: mediaFiles[previewIndex]?.fileKey }}
              style={styles.previewContent}
              resizeMode={ResizeMode.CONTAIN}
              useNativeControls
              autoPlay
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "flex-end", marginBottom: 2, paddingHorizontal: 8 },
  avatarWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
    marginRight: 6,
  },
  avatarImg: { width: 32, height: 32 },
  bubbleBase: {
    maxWidth: "100%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  senderName: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 2,
    marginLeft: 4,
  },
  italicText: { fontSize: 13, color: "#9ca3af", fontStyle: "italic" },
  callContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  callIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  replyBox: {
    backgroundColor: "rgba(0,0,0,0.05)",
    borderLeftWidth: 3,
    borderLeftColor: "#0068ff",
    padding: 6,
    borderRadius: 4,
    marginBottom: 6,
  },
  replySender: { fontSize: 11, fontWeight: "bold", color: "#0068ff" },
  replyText: { fontSize: 12, color: "#4b5563" },
  mediaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 1, marginTop: 6 },
  fullSize: { width: "100%", height: "100%" },
  playIcon: {
    position: "absolute",
    alignSelf: "center",
    top: "40%",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 5,
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
    gap: 8,
    minWidth: 230,
  },
  docName: { fontSize: 13, fontWeight: "600", color: "#111827" },
  docSize: { fontSize: 11, color: "#6b7280" },
  downloadBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0068ff",
    justifyContent: "center",
    alignItems: "center",
  },
  timeText: { fontSize: 10, marginTop: 4, textAlign: "right" },
  receiptsWrap: { flexDirection: "row", marginTop: 4 },
  receiptAvatar: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "white",
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  closePreview: { position: "absolute", top: 50, right: 20, zIndex: 10 },
  previewContent: { width: "95%", height: "80%" },
});
