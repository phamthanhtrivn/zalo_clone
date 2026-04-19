import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  ScrollView,
  Image as RNImage,
  Linking,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { Video } from "expo-av";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import type { ConversationItemType } from "@/types/conversation-item.type";
import { messageService } from "@/services/message.service";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { getDateLabel } from "@/utils/format-message-time..util";
import { updateConversationSetting } from "@/store/slices/conversationSlice";

import {
  muteConversation,
  pinConversation,
  unmuteConversation,
  unpinConversation,
} from "@/services/conversation-settings.service";
import { useSocket } from "@/contexts/SocketContext";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { truncateFileName } from "@/utils/render-file";
import { formatFileSize } from "@/utils/format-file.util";

interface Props {
  visible: boolean;
  onClose: () => void;
  conversation: ConversationItemType;
}

const SectionHeader = ({
  icon,
  title,
  expanded,
  onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  expanded: boolean;
  onToggle: () => void;
}) => (
  <TouchableOpacity
    onPress={onToggle}
    style={{
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
    }}
  >
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      {icon}

      <Text style={{ fontSize: 14, fontWeight: "600", color: "#1f2937" }}>
        {title}
      </Text>
    </View>
    <Ionicons
      name={expanded ? "chevron-down" : "chevron-forward"}
      size={18}
      color="#9ca3af"
    />
  </TouchableOpacity>
);

const ConversationInfoSheet: React.FC<Props> = ({
  visible,
  onClose,
  conversation,
}) => {
  const { socket } = useSocket();
  const user = useAppSelector((state) => state.auth.user);
  const [medias, setMedias] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();
  const [showMuteOptions, setShowMuteOptions] = useState(false);
  const [expandedMedia, setExpandedMedia] = useState(true);
  const [expandedFile, setExpandedFile] = useState(false);
  const [expandedLink, setExpandedLink] = useState(false);

  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const isGroup = conversation?.type === "GROUP";

  const currentConversation =
    useAppSelector((state) =>
      state.conversation.conversations.find(
        (c) => c.conversationId === conversation.conversationId,
      ),
    ) || conversation;

  const isPinned = currentConversation?.pinned;

  const isMuted =
    currentConversation?.muted &&
    (!currentConversation?.mutedUntil ||
      new Date(currentConversation.mutedUntil).getTime() > Date.now());

  useEffect(() => {
    if (!visible || !conversation?.conversationId || !user?.userId) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const res: any = await messageService.getMediasPreview(
          user.userId,

          conversation.conversationId,
        );
        if (res.success) {
          setMedias(res.data.images_videos || []);
          setFiles(res.data.files || []);
          setLinks(res.data.links || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [visible, conversation?.conversationId]);

  useEffect(() => {
    if (!socket || !visible || !conversation?.conversationId) return;

    const conversationId = conversation.conversationId;
    const mediaRooms = [
      `media_${conversationId}_IMAGE_VIDEO`,
      `media_${conversationId}_FILE`,
      `media_${conversationId}_LINK`,
    ];

    mediaRooms.forEach((room) => socket.emit("join_room", room));

    const handleNewMedia = (payload: { type: string; data: any }) => {
      const { type, data } = payload;
      if (type === "IMAGE_VIDEO") {
        setMedias((prev) => [data, ...prev].slice(0, 6));
      }

      if (type === "FILE") {
        setFiles((prev) => [data, ...prev].slice(0, 6));
      }

      if (type === "LINK") {
        setLinks((prev) => [data, ...prev].slice(0, 6));
      }
    };

    socket.on("new_media", handleNewMedia);

    return () => {
      // Leave rooms and cleanup listener
      mediaRooms.forEach((room) => socket.emit("leave_room", room));
      socket.off("new_media", handleNewMedia);
    };
  }, [socket, visible, conversation?.conversationId]);

  const handlePin = () => {
    const newPinned = !conversation.pinned;

    dispatch(
      updateConversationSetting({
        conversationId: conversation.conversationId,
        pinned: newPinned,
      }),
    );

    (async () => {
      try {
        if (newPinned) {
          await pinConversation(user?.userId, conversation.conversationId);
        } else {
          await unpinConversation(user?.userId, conversation.conversationId);
        }
      } catch (err) {
        dispatch(
          updateConversationSetting({
            conversationId: conversation.conversationId,
            pinned: !newPinned,
          }),
        );
        console.error(err);
      }
    })();
  };

  const handleMute = (duration: number) => {
    let mutedUntil: string | null = null;

    if (duration === 0) {
      mutedUntil = null;
    } else if (duration === -1) {
      mutedUntil = "infinite";
    } else if (duration === -2) {
      const now = new Date();
      const next8AM = new Date();
      next8AM.setDate(now.getHours() >= 8 ? now.getDate() + 1 : now.getDate());
      next8AM.setHours(8, 0, 0, 0);
      mutedUntil = next8AM.toISOString();
    } else {
      mutedUntil = new Date(Date.now() + duration * 60 * 1000).toISOString();
    }

    const newMuted = duration !== 0;

    dispatch(
      updateConversationSetting({
        conversationId: conversation.conversationId,
        muted: newMuted,
        mutedUntil,
      }),
    );

    (async () => {
      try {
        if (duration === 0) {
          await unmuteConversation(user?.userId, conversation.conversationId);
        } else {
          await muteConversation(
            user?.userId,
            conversation.conversationId,
            duration,
          );
        }
      } catch (err) {
        dispatch(
          updateConversationSetting({
            conversationId: conversation.conversationId,
            muted: !newMuted,
            mutedUntil: null,
          }),
        );
      }
    })();
  };

  const getFileExt = (name: string) =>
    name.split(".").pop()?.toUpperCase() || "FILE";

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (file: any) => {
    try {
      setDownloadingId(file.fileKey);

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
      setDownloadingId(null);
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            flex: 1,
            backgroundColor: "#f7f8fa",
            marginTop: 60,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 14,
              backgroundColor: "white",
              borderBottomWidth: 1,
              borderBottomColor: "#f3f4f6",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "600" }}>
              Thông tin hội thoại
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View
              style={{
                backgroundColor: "white",
                alignItems: "center",
                paddingVertical: 20,
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 35,
                  overflow: "hidden",
                  backgroundColor: "#e5e7eb",
                  marginBottom: 10,
                }}
              >
                <Image
                  source={{ uri: conversation?.avatar }}
                  style={{ width: 70, height: 70 }}
                />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#111" }}>
                {conversation?.name}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: "white",
                flexDirection: "row",
                justifyContent: "space-around",
                paddingVertical: 14,
                marginBottom: 8,
              }}
            >
              {[
                {
                  icon: "notifications-outline",
                  label: "Tắt thông báo",
                  onPress: () => setShowMuteOptions(true),
                  active: isMuted,
                },
                {
                  icon: "pin-outline",
                  label: "Ghim hội thoại",
                  onPress: handlePin,
                  active: isPinned,
                },
                {
                  icon: isGroup ? "person-add-outline" : "people-outline",
                  label: isGroup ? "Thêm TV" : "Tạo nhóm",
                },
              ].map((action) => (
                <TouchableOpacity
                  key={action.label}
                  onPress={action.onPress}
                  style={{ alignItems: "center", gap: 6 }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: action.active ? "#dbeafe" : "#f3f4f6",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name={action.icon as any}
                      size={20}
                      color={action.active ? "#2563eb" : "#374151"}
                    />
                  </View>

                  <Text
                    style={{
                      fontSize: 11,
                      color: action.active ? "#2563eb" : "#374151",
                      textAlign: "center",
                      maxWidth: 70,
                    }}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {loading && (
              <View style={{ padding: 20, alignItems: "center" }}>
                <ActivityIndicator color="#0068ff" />
              </View>
            )}

            {/* Media section */}
            <View style={{ backgroundColor: "white", marginBottom: 2 }}>
              <SectionHeader
                icon={<MaterialIcons name="image" size={18} color="#374151" />}
                title="Ảnh/Video"
                expanded={expandedMedia}
                onToggle={() => setExpandedMedia((v) => !v)}
              />
              {expandedMedia && (
                <View style={{ paddingHorizontal: 12, paddingBottom: 16 }}>
                  {medias.length === 0 ? (
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#9ca3af",
                        textAlign: "center",
                        paddingVertical: 8,
                      }}
                    >
                      Chưa có ảnh/video trong cuộc trò chuyện
                    </Text>
                  ) : (
                    <View
                      style={{ flexDirection: "row", flexWrap: "wrap", gap: 2 }}
                    >
                      {medias.slice(0, 6).map((media, idx) => {
                        const file = media?.content?.file;
                        const isVideo = file?.type === "VIDEO";
                        return (
                          <TouchableOpacity
                            key={idx}
                            onPress={() => setPreviewIndex(idx)}
                            style={{
                              width: "32%",
                              aspectRatio: 1,
                              backgroundColor: "#e5e7eb",
                              overflow: "hidden",
                            }}
                          >
                            {isVideo ? (
                              <View
                                style={{
                                  flex: 1,
                                  alignItems: "center",
                                  justifyContent: "center",
                                  backgroundColor: "#000",
                                }}
                              >
                                <Ionicons
                                  name="play-circle"
                                  size={36}
                                  color="white"
                                />
                              </View>
                            ) : (
                              <Image
                                source={{ uri: file?.fileKey }}
                                style={{ width: "100%", height: "100%" }}
                                contentFit="cover"
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={{ backgroundColor: "white", marginBottom: 2 }}>
              <SectionHeader
                icon={
                  <MaterialIcons
                    name="insert-drive-file"
                    size={18}
                    color="#374151"
                  />
                }
                title="File"
                expanded={expandedFile}
                onToggle={() => setExpandedFile((v) => !v)}
              />
              {expandedFile && (
                <View style={{ paddingHorizontal: 12, paddingBottom: 16 }}>
                  {files.length === 0 ? (
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#9ca3af",
                        textAlign: "center",
                        paddingVertical: 8,
                      }}
                    >
                      Chưa có file trong cuộc trò chuyện
                    </Text>
                  ) : (
                    files.slice(0, 6).map((item, idx) => {
                      const file = item.content?.file;
                      return (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => handleDownload(file)}
                          disabled={downloadingId === file.fileKey}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            padding: 10,
                            borderRadius: 10,
                            backgroundColor: "#f9fafb",
                            borderWidth: 1,
                            borderColor: "#f3f4f6",
                            marginBottom: 8,
                            gap: 10,
                          }}
                        >
                          <View
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 8,
                              backgroundColor: "#dbeafe",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "700",
                                color: "#1d4ed8",
                              }}
                            >
                              {getFileExt(file.fileName)}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              numberOfLines={1}
                              style={{
                                fontSize: 13,
                                fontWeight: "500",
                                color: "#111",
                              }}
                            >
                              {truncateFileName(file.fileName, 30)}
                            </Text>
                            <Text style={{ fontSize: 11, color: "#9ca3af" }}>
                              {getDateLabel(item.createdAt)} •{" "}
                              {formatFileSize(file.fileSize)}
                            </Text>
                          </View>
                          {downloadingId === file.fileKey ? (
                            <ActivityIndicator size="small" color="blue" />
                          ) : (
                            <Ionicons
                              name="download-outline"
                              size={17}
                              color="blue"
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              )}
            </View>
            <View style={{ backgroundColor: "white", marginBottom: 2 }}>
              <SectionHeader
                icon={<MaterialIcons name="link" size={18} color="#374151" />}
                title="Link"
                expanded={expandedLink}
                onToggle={() => setExpandedLink((v) => !v)}
              />
              {expandedLink && (
                <View style={{ paddingHorizontal: 12, paddingBottom: 16 }}>
                  {links.length === 0 ? (
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#9ca3af",
                        textAlign: "center",
                        paddingVertical: 8,
                      }}
                    >
                      Chưa có link trong cuộc trò chuyện
                    </Text>
                  ) : (
                    links.slice(0, 6).map((item, idx) => {
                      const url = item.content?.text;
                      let domain = url;

                      try {
                        domain = new URL(url).hostname.replace("www.", "");
                      } catch {}

                      return (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => Linking.openURL(url)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            padding: 10,
                            borderRadius: 10,
                            backgroundColor: "#f9fafb",
                            borderWidth: 1,
                            borderColor: "#f3f4f6",
                            marginBottom: 8,
                            gap: 10,
                          }}
                        >
                          <View
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 8,
                              backgroundColor: "#f3f4f6",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <MaterialIcons
                              name="link"
                              size={20}
                              color="#6b7280"
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              numberOfLines={1}
                              style={{ fontSize: 13, color: "#0068ff" }}
                            >
                              {url}
                            </Text>
                            <Text style={{ fontSize: 11, color: "#9ca3af" }}>
                              {domain}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              )}
            </View>

            <View style={{ backgroundColor: "white", marginTop: 8 }}>
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  gap: 10,
                }}
              >
                <Ionicons
                  name={isGroup ? "log-out-outline" : "trash-outline"}
                  size={18}
                  color="#ef4444"
                />
                <Text style={{ fontSize: 14, color: "#ef4444" }}>
                  {isGroup ? "Rời nhóm" : "Xóa lịch sử"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          {previewIndex !== null && (
            <Modal
              transparent
              visible
              animationType="fade"
              onRequestClose={() => setPreviewIndex(null)}
            >
              <View
                style={{
                  flex: 1,
                  backgroundColor: "rgba(0,0,0,0.95)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <TouchableOpacity
                  style={{
                    position: "absolute",
                    top: 50,
                    right: 20,
                    zIndex: 10,
                  }}
                  onPress={() => setPreviewIndex(null)}
                >
                  <Ionicons name="close" size={30} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    position: "absolute",
                    top: 48,
                    left: 20,
                    zIndex: 10,
                  }}
                  onPress={() => {
                    const file = medias[previewIndex!]?.content?.file;
                    if (file) handleDownload(file);
                  }}
                  disabled={
                    downloadingId ===
                    medias[previewIndex!]?.content?.file?.fileKey
                  }
                >
                  {downloadingId ===
                  medias[previewIndex!]?.content?.file?.fileKey ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Ionicons name="download-outline" size={28} color="white" />
                  )}
                </TouchableOpacity>

                {previewIndex > 0 && (
                  <TouchableOpacity
                    style={{ position: "absolute", left: 20, zIndex: 10 }}
                    onPress={() =>
                      setPreviewIndex((p) => (p !== null ? p - 1 : p))
                    }
                  >
                    <Ionicons name="chevron-back" size={36} color="white" />
                  </TouchableOpacity>
                )}

                {previewIndex < medias.length - 1 && (
                  <TouchableOpacity
                    style={{ position: "absolute", right: 20, zIndex: 10 }}
                    onPress={() =>
                      setPreviewIndex((p) => (p !== null ? p + 1 : p))
                    }
                  >
                    <Ionicons name="chevron-forward" size={36} color="white" />
                  </TouchableOpacity>
                )}

                {(() => {
                  const file = medias[previewIndex]?.content?.file;
                  if (!file) return null;
                  return file.type === "VIDEO" ? (
                    <Video
                      source={{ uri: file.fileKey }}
                      useNativeControls
                      style={{ width: "90%", aspectRatio: 16 / 9 }}
                    />
                  ) : (
                    <Image
                      source={{ uri: file.fileKey }}
                      style={{ width: "90%", height: "80%" }}
                      contentFit="contain"
                    />
                  );
                })()}
              </View>
            </Modal>
          )}
        </Pressable>
      </Pressable>
      <Modal
        transparent
        visible={showMuteOptions}
        animationType="fade"
        onRequestClose={() => setShowMuteOptions(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          onPress={() => setShowMuteOptions(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              bottom: 0,
              width: "100%",
              backgroundColor: "white",
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              paddingBottom: 20,
            }}
          >
            <Text
              style={{
                textAlign: "center",
                fontSize: 15,
                fontWeight: "600",
                paddingVertical: 14,
              }}
            >
              Tắt thông báo
            </Text>

            {[
              { label: "Trong 1 giờ", duration: 60 },
              { label: "Trong 4 giờ", duration: 240 },
              { label: "Cho đến 8:00 AM", duration: -2 },
              { label: "Cho đến khi mở lại", duration: -1 },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                onPress={() => {
                  handleMute(item.duration);
                  setShowMuteOptions(false);
                }}
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  borderTopWidth: 1,
                  borderTopColor: "#f3f4f6",
                }}
              >
                <Text style={{ fontSize: 14, color: "#111" }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Cancel */}
            <TouchableOpacity
              onPress={() => setShowMuteOptions(false)}
              style={{
                marginTop: 8,
                paddingVertical: 14,
                alignItems: "center",
                borderTopWidth: 6,
                borderTopColor: "#f3f4f6",
              }}
            >
              <Text style={{ fontSize: 14, color: "#ef4444" }}>Hủy</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
};

export default ConversationInfoSheet;
