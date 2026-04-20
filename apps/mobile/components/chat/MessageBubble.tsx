
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  Dimensions,
  Modal,
  Alert,
  ActivityIndicator,
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
  if (lower.endsWith(".mp3") || lower.endsWith(".wav"))
    return { name: "musical-notes", color: "#8b5cf6" };
  return { name: "document-outline", color: "#6b7280" };
};

const formatFileSize = (bytes: number) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getIsExpired = (expired?: boolean, expiresAt?: string | null) => {
  if (expired) return true;
  if (!expiresAt) return false;

  const expiresAtMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresAtMs)) return Boolean(expired);

  return expiresAtMs <= Date.now();
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
  const files = content?.files || [];

  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [isExpired, setIsExpired] = useState(() =>
    getIsExpired(message.expired, message.expiresAt),
  );

  const mediaFiles = files.filter(
    (f: any) => f.type === "IMAGE" || f.type === "VIDEO",
  );
  const docFiles = files.filter((f: any) => f.type === "FILE");

  useEffect(() => {
    if (message.expired) {
      setIsExpired(true);
      return;
    }

    if (!message.expiresAt) {
      setIsExpired(false);
      return;
    }

    const expiresAtMs = new Date(message.expiresAt).getTime();
    if (Number.isNaN(expiresAtMs)) {
      setIsExpired(Boolean(message.expired));
      return;
    }

    const remainingMs = expiresAtMs - Date.now();
    if (remainingMs <= 0) {
      setIsExpired(true);
      return;
    }

    setIsExpired(false);
    const timeoutId = setTimeout(() => setIsExpired(true), remainingMs + 50);

    return () => clearTimeout(timeoutId);
  }, [message.expired, message.expiresAt]);

  const handleDownload = async (file: any) => {
    try {
      setDownloading(true);

      const safeFileName = decodeURIComponent(file.fileName || "file");

      const downloadUrl = encodeURI(file.fileKey);

      const fileUri = FileSystem.documentDirectory + safeFileName;

      const { uri } = await FileSystem.downloadAsync(downloadUrl, fileUri);

      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: file.mimeType || "application/octet-stream",
          dialogTitle: safeFileName,
        });
      } else {
        Alert.alert("Thành công", `Đã tải: ${safeFileName}`);
      }
    } catch (err: any) {
      console.error("Download error:", err?.response || err);

      Alert.alert(
        "Lỗi",
        "Không thể tải file. Có thể do link hết hạn hoặc cần đăng nhập.",
      );
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
  if (isExpired) {
    return (
      <View
        style={{
          flexDirection: isMe ? "row-reverse" : "row",
          alignItems: "flex-end",
          paddingHorizontal: 8,
          marginBottom: 2,
        }}
      >
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
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: "#f0f0f0",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
            maxWidth: "75%",
          }}
        >
          <Ionicons name="information-circle-outline" size={14} color="#9ca3af" />
          <Text style={{ fontSize: 13, color: "#9ca3af", fontStyle: "italic" }}>
            Tin nhắn đã hết hạn
          </Text>
        </View>
      </View>
    );
  }

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
                source={{ uri: (message.senderId as any)?.profile?.avatarUrl }}
                style={{ width: 32, height: 32 }}
              />
            </View>
          ) : (
            <View style={{ width: 32, marginRight: 6 }} />
          ))}

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
      {/* AVATAR */}
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
              source={{ uri: message.senderId?.profile.avatarUrl }}
              style={{ width: 32, height: 32 }}
            />
          </View>
        ) : (
          <View style={{ width: 32, marginRight: 6 }} />
        ))}

      {/* BUBBLE */}
      <View
        style={{
          maxWidth: "75%",
          alignItems: isMe ? "flex-end" : "flex-start",
        }}
      >
        {/* NAME */}
        {!isMe && isGroup && showName && (
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
          {/* REPLY PREVIEW */}
          {message.repliedId && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onReplyPress?.(message.repliedId?._id || "")}
              style={{
                backgroundColor: "rgba(0,0,0,0.05)",
                borderLeftWidth: 3,
                borderLeftColor: "#0068ff",
                padding: 6,
                borderRadius: 4,
                marginBottom: 6,
                minWidth: 100,
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 11,
                  fontWeight: "bold",
                  color: "#0068ff",
                  marginBottom: 2,
                }}
              >
                {message.repliedId.senderId?.profile?.name || "Người dùng"}
              </Text>
              <Text
                numberOfLines={1}
                style={{ fontSize: 12, color: "#4b5563" }}
              >
                {message.repliedId.content?.text ||
                  (message.repliedId.content?.files.length > 0
                    ? message.repliedId.content.files[0].fileName
                    : "[Tệp đính kèm]")}
              </Text>
            </TouchableOpacity>
          )}

          {/* TEXT */}
          {content?.text && <TextWithLinks text={content.text} />}

          {/* ICON */}
          {content?.icon && (
            <Text style={{ fontSize: 32 }}>{content.icon}</Text>
          )}

          {/* MEDIA GRID (Images + Videos) */}
          {mediaFiles.length > 0 && (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 1,
                marginTop: 6,
              }}
            >
              {mediaFiles.map((file: any, index: number) => {
                const cols =
                  mediaFiles.length === 1 ? 1 : mediaFiles.length === 2 ? 2 : 3;
                const imgSize =
                  mediaFiles.length === 1
                    ? 200
                    : (SCREEN_WIDTH * 0.75 - 40) / cols;

                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.85}
                    onPress={() => setPreviewIndex(mediaFiles.indexOf(file))}
                    style={{
                      width: imgSize,
                      height: 110,
                      borderRadius: 8,
                      overflow: "hidden",
                      backgroundColor: "#000",
                    }}
                  >
                    {file.type === "IMAGE" ? (
                      <Image
                        source={{ uri: file.fileKey }}
                        style={{ width: imgSize, height: 110 }}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        style={{
                          width: imgSize,
                          height: 110,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Video
                          source={{ uri: file.fileKey }}
                          style={{ width: imgSize, height: 110 }}
                          resizeMode={ResizeMode.COVER}
                        />
                        <View
                          style={{
                            position: "absolute",
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: "rgba(0,0,0,0.5)",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <Ionicons name="play" size={18} color="white" />
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* DOCUMENT FILES */}
          {docFiles.map((file: any, index: number) => {
            const { name: iconName, color: iconColor } = getFileIconName(
              file.fileName,
            );
            return (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: isMe ? "rgba(255,255,255,0.6)" : "#f3f4f6",
                  borderRadius: 8,
                  padding: 8,
                  marginTop: 6,
                  gap: 8,
                  minWidth: 230,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    backgroundColor: iconColor + "20",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name={iconName} size={22} color={iconColor} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: "#111827",
                    }}
                  >
                    {truncateFileName(file.fileName, 17)}
                  </Text>
                  {file.fileSize != null && (
                    <Text
                      style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}
                    >
                      {formatFileSize(file.fileSize)}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  onPress={() => handleDownload(file)}
                  disabled={downloading}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "#0068ff",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {downloading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="download-outline" size={17} color="white" />
                  )}
                </TouchableOpacity>
              </View>
            );
          })}

          {/* MEDIA PREVIEW MODAL */}
          <Modal
            visible={previewIndex !== null}
            transparent
            animationType="fade"
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.95)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {/* Close */}
              <TouchableOpacity
                style={{ position: "absolute", top: 48, right: 20, zIndex: 10 }}
                onPress={() => setPreviewIndex(null)}
              >
                <Ionicons name="close-circle" size={34} color="white" />
              </TouchableOpacity>

              {/* Download in preview */}
              <TouchableOpacity
                style={{ position: "absolute", top: 48, left: 20, zIndex: 10 }}
                onPress={() =>
                  previewIndex !== null &&
                  handleDownload(mediaFiles[previewIndex])
                }
                disabled={downloading}
              >
                {downloading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Ionicons name="download-outline" size={28} color="white" />
                )}
              </TouchableOpacity>

              {/* Counter */}
              {mediaFiles.length > 1 && (
                <View
                  style={{
                    position: "absolute",
                    top: 56,
                    alignSelf: "center",
                    backgroundColor: "rgba(0,0,0,0.5)",
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ color: "white", fontSize: 13 }}>
                    {(previewIndex ?? 0) + 1} / {mediaFiles.length}
                  </Text>
                </View>
              )}

              {/* Prev */}
              {(previewIndex ?? 0) > 0 && (
                <TouchableOpacity
                  style={{
                    position: "absolute",
                    left: 20,
                    top: "90%",
                    zIndex: 10,
                  }}
                  onPress={() => setPreviewIndex((previewIndex ?? 1) - 1)}
                >
                  <Ionicons name="chevron-back" size={36} color="white" />
                </TouchableOpacity>
              )}

              {/* Next */}
              {(previewIndex ?? 0) < mediaFiles.length - 1 && (
                <TouchableOpacity
                  style={{
                    position: "absolute",
                    right: 20,
                    top: "90%",
                    zIndex: 10,
                  }}
                  onPress={() => setPreviewIndex((previewIndex ?? 0) + 1)}
                >
                  <Ionicons name="chevron-forward" size={36} color="white" />
                </TouchableOpacity>
              )}

              {/* Content */}
              {previewIndex !== null &&
                mediaFiles[previewIndex] &&
                (mediaFiles[previewIndex].type === "IMAGE" ? (
                  <Image
                    source={{ uri: mediaFiles[previewIndex].fileKey }}
                    style={{ width: "90%", height: "70%" }}
                    contentFit="contain"
                  />
                ) : (
                  <Video
                    source={{ uri: mediaFiles[previewIndex].fileKey }}
                    style={{ width: "90%", height: "70%" }}
                    resizeMode={ResizeMode.CONTAIN}
                    useNativeControls
                  />
                ))}
            </View>
          </Modal>

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
