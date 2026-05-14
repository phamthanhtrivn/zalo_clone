import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  Dimensions,
  Modal,
  StyleSheet,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { Image } from "expo-image";
import { Video, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import GroupAvatar from "../ui/GroupAvatar";
import PollMessage from "./PollMessage";
import { formatTime } from "@/utils/format-message-time.util";
import type { MessagesType, ReactionType } from "@/types/messages.type";
import ReactionSummary from "./ReactionSummary";
import CallContent from "./CallContent";
import { formatFileSize } from "@/utils/format-file.util";

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
  onJoinGroupCall?: (
    sessionId: string,
    conversationId: string,
    type: "VIDEO" | "VOICE",
  ) => void;
  onOpenStoryLink?: (storyId: string) => void;
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

const MessageBubble = ({
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
  onJoinGroupCall,
  onOpenStoryLink,
}: Props) => {
  const content = message.content;
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const mediaFiles = useMemo(
    () => (content?.files || []).filter((f: any) => f.type === "IMAGE" || f.type === "VIDEO"),
    [content?.files],
  );

  const documentFiles = useMemo(
    () =>
      (content?.files || []).filter(
        (f: any) => f.type === "FILE" || (!["IMAGE", "VIDEO", "VOICE"].includes(f.type)),
      ),
    [content?.files],
  );

  const bubbleBg = isHighlighted
    ? "#FFF9C4"
    : isSelected
      ? "#B4CBE7"
      : isMe
        ? "#E5F1FF"
        : "white";

  const renderText = () => {
    if (!content?.text) return null;
    const processed = content.text.replace(/<br\s*\/?>/gi, "\n");
    const hasMarkdown = /\|[-:]+\||#|\*\*|`|\[.*\]\(.*\)/.test(processed);
    if (hasMarkdown) {
      return (
        <Markdown
          style={{
            body: { fontSize: 14, lineHeight: 20, color: "#111" },
            paragraph: { marginTop: 0, marginBottom: 0 },
          }}
        >
          {processed}
        </Markdown>
      );
    }
    return <TextWithLinks text={processed} />;
  };

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
          <View style={{ marginRight: 6 }}>
            <GroupAvatar
              uri={message.senderId?.profile?.avatarUrl}
              name={message.senderId?.profile?.name || "U"}
              size={32}
            />
          </View>
        ) : (
          <View style={{ width: 32, marginRight: 6 }} />
        ))}

      <View style={{ maxWidth: "75%", alignItems: isMe ? "flex-end" : "flex-start" }}>
        {!isMe && isGroup && showName && (
          <Text style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>
            {message.senderId?.profile?.name}
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
            borderColor: "#e5e7eb",
          }}
        >
          {message.call || message.type === "GROUP_CALL" || message.callSessionId ? (
            <View style={{ minWidth: 180 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "rgba(0,104,255,0.12)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name={
                      isGroup
                        ? "people"
                        : (message.call?.type || "VIDEO") === "VIDEO"
                          ? "videocam"
                          : "call"
                    }
                    size={18}
                    color="#0068ff"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>
                    Cuộc gọi {isGroup ? "nhóm " : ""}
                    {(message.call?.type || "VIDEO") === "VIDEO" ? "video" : "thoại"}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    {message.type === "GROUP_CALL" || message.callSessionId
                      ? message.call?.status === "ENDED"
                        ? `Cuộc gọi đã kết thúc${message.call?.duration ? ` • ${message.call.duration}s` : ""}`
                        : "Đang diễn ra..."
                      : message.call?.status === "MISSED"
                        ? "Cuộc gọi nhỡ"
                        : message.call?.status === "REJECTED"
                          ? "Cuộc gọi bị từ chối"
                          : message.call?.status === "BUSY"
                            ? "Máy bận"
                            : message.call?.status === "ENDED"
                              ? `Cuộc gọi đã kết thúc${message.call?.duration ? ` • ${message.call.duration}s` : ""}`
                              : "Đang thiết lập..."}
                  </Text>
                </View>
              </View>

              {(message.type === "GROUP_CALL" || message.callSessionId) &&
                message.call?.status !== "ENDED" &&
                message.callSessionId &&
                onJoinGroupCall && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() =>
                      onJoinGroupCall(
                        message.callSessionId as string,
                        message.conversationId,
                        message.call?.type || "VIDEO",
                      )
                    }
                    style={{
                      marginTop: 10,
                      alignSelf: "stretch",
                      backgroundColor: "#0068ff",
                      paddingVertical: 9,
                      borderRadius: 10,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "white", fontSize: 13, fontWeight: "600" }}>
                      Tham gia
                    </Text>
                  </TouchableOpacity>
                )}
            </View>
          ) : (
            <>
          {message.repliedId && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onReplyPress?.((message.repliedId as any)?._id || "")}
              style={{
                backgroundColor: "rgba(0,0,0,0.05)",
                borderLeftWidth: 3,
                borderLeftColor: "#0068ff",
                padding: 6,
                borderRadius: 4,
                marginBottom: 6,
              }}
            >
              <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: "bold", color: "#0068ff" }}>
                {(message.repliedId as any)?.senderId?.profile?.name || "Người dùng"}
              </Text>
              <Text numberOfLines={1} style={{ fontSize: 12, color: "#4b5563" }}>
                {(message.repliedId as any)?.content?.text || "[Đính kèm]"}
              </Text>
            </TouchableOpacity>
          )}

          {message.type === "POLL" && (
            <PollMessage
              pollId={(message.pollId as any) || ""}
              conversationId={message.conversationId}
              initialPoll={message.poll}
            />
          )}

          {(message.call || message.type === "GROUP_CALL") && (
            <CallContent
              type={message.call?.type || "VIDEO"}
              status={message.call?.status || "ACTIVE"}
              duration={message.call?.duration || null}
              isMe={isMe}
              isGroupCall={message.type === "GROUP_CALL"}
              isGroupChat={isGroup}
              sessionId={(message as any).callSessionId}
              onJoin={onJoinGroupCall}
            />
          )}

          {renderText()}
          {content?.storyLink?.storyId ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onOpenStoryLink?.(content.storyLink?.storyId || "")}
              style={{
                marginTop: 8,
                width: 180,
                borderRadius: 16,
                overflow: "hidden",
                backgroundColor: "#0f172a",
                borderWidth: 1,
                borderColor: "#dbeafe",
              }}
            >
              {content.storyLink.previewImage ? (
                <View>
                  <Image
                    source={{ uri: content.storyLink.previewImage }}
                    style={{ width: 180, height: 170 }}
                    contentFit="cover"
                  />
                  <View
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundColor: "rgba(15,23,42,0.18)",
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      top: 10,
                      left: 10,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 999,
                      backgroundColor: "rgba(15,23,42,0.72)",
                    }}
                  >
                    <Text style={{ fontSize: 11, color: "white", fontWeight: "700" }}>
                      Story
                    </Text>
                  </View>
                </View>
              ) : (
                <View
                  style={{
                    width: "100%",
                    height: 170,
                    padding: 14,
                    justifyContent: "space-between",
                    backgroundColor: "#2563eb",
                  }}
                >
                  <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.82)", fontWeight: "700" }}>
                    Story
                  </Text>
                  <Text numberOfLines={3} style={{ fontSize: 18, color: "white", fontWeight: "700" }}>
                    {content.storyLink.previewText || "Xem lai story"}
                  </Text>
                </View>
              )}
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: content.storyLink.previewImage ? "rgba(15,23,42,0.92)" : "#0f172a",
                }}
              >
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: "rgba(255,255,255,0.92)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 10,
                  }}
                >
                  <Ionicons name="play" size={15} color="#2563eb" />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#93c5fd",
                      fontWeight: "700",
                    }}
                  >
                    Tra loi story
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 12,
                      color: "white",
                      marginTop: 2,
                      fontWeight: "500",
                    }}
                  >
                    Xem story
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 999,
                    backgroundColor: "#1d4ed8",
                  }}
                >
                  <Text style={{ fontSize: 11, color: "white", fontWeight: "700" }}>
                    Xem
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ) : null}
          {content?.icon ? <Text style={{ fontSize: 32 }}>{content.icon}</Text> : null}

          {documentFiles.length > 0 && (
            <View style={{ marginTop: 6, gap: 4 }}>
              {documentFiles.map((file: any, index: number) => (
                <TouchableOpacity
                  key={`doc-${index}`}
                  activeOpacity={0.7}
                  onPress={() => Linking.openURL(file.fileKey)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: isMe ? "rgba(255,255,255,0.5)" : "#f3f4f6",
                    padding: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: "rgba(0,0,0,0.05)",
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      backgroundColor: "#fff",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 10,
                    }}
                  >
                    <Ionicons name="document-text" size={24} color="#0068ff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "500", color: "#111" }}>
                      {file.fileName}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                      {formatFileSize(file.fileSize)}
                    </Text>
                  </View>
                  <Ionicons name="download-outline" size={20} color="#6b7280" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {mediaFiles.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
              {mediaFiles.map((file: any, index: number) => {
                const cols = mediaFiles.length === 1 ? 1 : mediaFiles.length === 2 ? 2 : 3;
                const imgSize = mediaFiles.length === 1 ? 200 : (SCREEN_WIDTH * 0.75 - 40) / cols;
                return (
                  <TouchableOpacity
                    key={`media-${index}`}
                    activeOpacity={0.85}
                    onPress={() => setPreviewIndex(index)}
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
                      <View style={{ width: imgSize, height: 110, justifyContent: "center", alignItems: "center" }}>
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
            </>
          )}

          {showTime && (
            <Text style={{ fontSize: 10, color: "#9ca3af", marginTop: 4, textAlign: "right" }}>
              {formatTime(message.createdAt)}
            </Text>
          )}
        </TouchableOpacity>

        {message.reactions?.length > 0 && (
          <View style={{ marginTop: 4 }}>
            <ReactionSummary
              reactions={message.reactions}
              onClick={() => onOpenReactionModal?.(message.reactions)}
            />
          </View>
        )}

        {renderReadReceipts && message.readReceipts?.length > 0 && (
          <View style={{ flexDirection: "row", gap: -8, marginTop: 4 }}>
            {message.readReceipts
              .filter((rr) => !!(rr.userId?.profile?.avatarUrl || (rr.userId as any)?.avatarUrl))
              .slice(0, 3)
              .map((rr, index) => (
                <GroupAvatar
                  key={rr.userId?._id || index}
                  uri={rr.userId?.profile?.avatarUrl || (rr.userId as any)?.avatarUrl || ""}
                  name={rr.userId?.profile?.name || (rr.userId as any)?.name || "U"}
                  size={14}
                />
              ))}
          </View>
        )}
      </View>

      <Modal visible={previewIndex !== null} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.95)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            style={{ position: "absolute", top: 48, right: 20, zIndex: 10 }}
            onPress={() => setPreviewIndex(null)}
          >
            <Ionicons name="close-circle" size={34} color="white" />
          </TouchableOpacity>
          {previewIndex !== null && mediaFiles[previewIndex] && (
            mediaFiles[previewIndex].type === "IMAGE" ? (
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
            )
          )}
        </View>
      </Modal>
    </View>
  );
};

MessageBubble.displayName = "MessageBubble";

export default React.memo(MessageBubble);
