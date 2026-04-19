import React, { useState, useEffect, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Pressable,
  Dimensions,
  Switch,
  TextInput,
  Linking,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Video } from "expo-av";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { useSocket } from "@/contexts/SocketContext";
import {
  updateConversationSetting,
  removeConversation,
} from "@/store/slices/conversationSlice";
import { conversationService } from "@/services/conversation.service";
import { messageService } from "@/services/message.service";
import { getDateLabel } from "@/utils/format-message-time..util";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as ImagePicker from "expo-image-picker";
import { truncateFileName } from "@/utils/render-file";
import { formatFileSize } from "@/utils/format-file.util";
import CreateGroupModal from "./CreateGroupModal";

const { width } = Dimensions.get("window");

// --- COMPONENTS CON ---
const SectionHeader = ({ icon, title, expanded, onToggle }: any) => (
  <TouchableOpacity onPress={onToggle} style={styles.sectionHeader}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      {icon}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <Ionicons
      name={expanded ? "chevron-down" : "chevron-forward"}
      size={18}
      color="#9ca3af"
    />
  </TouchableOpacity>
);

const ActionItem = ({ icon, label, active, onPress }: any) => (
  <TouchableOpacity onPress={onPress} style={styles.actionBtn}>
    <View style={[styles.iconCircle, active && { backgroundColor: "#dbeafe" }]}>
      <Ionicons name={icon} size={22} color={active ? "#0068ff" : "#4b5563"} />
    </View>
    <Text style={[styles.actionLabel, active && { color: "#0068ff" }]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const ConversationInfoSheet = ({ visible, onClose, conversation }: any) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { socket } = useSocket();
  const user = useAppSelector((state) => state.auth.user);
  const currentUserId = user?.userId;

  // States dữ liệu
  const [medias, setMedias] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);

  // States UI
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [showMuteOptions, setShowMuteOptions] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [isAddMemberVisible, setIsAddMemberVisible] = useState(false);
  const [membersRefreshKey, setMembersRefreshKey] = useState(0);

  // States mở rộng Section
  const [expandedMedia, setExpandedMedia] = useState(true);
  const [expandedFile, setExpandedFile] = useState(false);
  const [expandedLink, setExpandedLink] = useState(false);
  const [expandedMembers, setExpandedMembers] = useState(true);
  const [expandedRequests, setExpandedRequests] = useState(true);
  const [expandedManagement, setExpandedManagement] = useState(false);

  const isGroup = conversation?.type === "GROUP";
  const currentConversation =
    useAppSelector((state) =>
      state.conversation.items?.find(
        (c) => c.conversationId === conversation?.conversationId,
      ),
    ) || conversation;

  const [localSettings, setLocalSettings] = useState({
    allowMembersInvite: true,
    allowMembersSendMessages: true,
    approvalRequired: false,
  });

  // --- EFFECT: ĐỒNG BỘ DỮ LIỆU ---
  useEffect(() => {
    if (currentConversation?.group) {
      setLocalSettings({
        allowMembersInvite:
          currentConversation.group.allowMembersInvite !== false,
        allowMembersSendMessages:
          currentConversation.group.allowMembersSendMessages !== false,
        approvalRequired: currentConversation.group.approvalRequired === true,
      });
      setTempName(currentConversation.name || "");
    }
  }, [currentConversation]);

  useEffect(() => {
    if (!visible || !conversation?.conversationId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [mediaRes, memberRes] = await Promise.all([
          messageService.getMediasPreview(
            currentUserId,
            conversation.conversationId,
          ),
          isGroup
            ? conversationService.getListMembers(conversation.conversationId)
            : Promise.resolve({ success: true, data: [] }),
        ]);
        if (mediaRes.success) {
          setMedias(mediaRes.data.images_videos || []);
          setFiles(mediaRes.data.files || []);
          setLinks(mediaRes.data.links || []);
        }
        if (memberRes.success) setMembers(memberRes.data);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [visible, conversation?.conversationId, membersRefreshKey]);

  useEffect(() => {
    if (visible && isGroup && (isOwner || isAdmin)) fetchJoinRequests();
  }, [visible, membersRefreshKey]);

  // --- EFFECT: SOCKET REALTIME (GỘP CẢ 2 NHÁNH) ---
  useEffect(() => {
    if (!socket || !visible || !conversation?.conversationId) return;
    const convId = conversation.conversationId;

    // Join media rooms (Logic KhongVanTam)
    const mediaRooms = [
      `media_${convId}_IMAGE_VIDEO`,
      `media_${convId}_FILE`,
      `media_${convId}_LINK`,
    ];
    mediaRooms.forEach((r) => socket.emit("join_room", r));

    socket.on("new_media", (payload) => {
      if (payload.type === "IMAGE_VIDEO")
        setMedias((p) => [payload.data, ...p].slice(0, 6));
      if (payload.type === "FILE")
        setFiles((p) => [payload.data, ...p].slice(0, 6));
      if (payload.type === "LINK")
        setLinks((p) => [payload.data, ...p].slice(0, 6));
    });

    socket.on("new_approval_request", fetchJoinRequests);
    socket.on("member_updated", () => setMembersRefreshKey((k) => k + 1));

    return () => {
      mediaRooms.forEach((r) => socket.emit("leave_room", r));
      socket.off("new_media");
      socket.off("new_approval_request");
      socket.off("member_updated");
    };
  }, [socket, visible]);

  // --- HANDLERS LOGIC ---
  const isOwner = useMemo(
    () => members.find((m) => m.userId === currentUserId)?.role === "OWNER",
    [members, currentUserId],
  );
  const isAdmin = useMemo(
    () => members.find((m) => m.userId === currentUserId)?.role === "ADMIN",
    [members, currentUserId],
  );
  const isPinned = currentConversation?.pinned;
  const isMuted =
    currentConversation?.muted &&
    (!currentConversation?.mutedUntil ||
      new Date(currentConversation.mutedUntil).getTime() > Date.now());

  const fetchJoinRequests = async () => {
    const res: any = await conversationService.getJoinRequests(
      currentConversation.conversationId,
    );
    if (res?.success)
      setJoinRequests(
        Array.isArray(res.data) ? res.data : res.data?.data || [],
      );
  };

  const handleUpdateSetting = async (
    key: keyof typeof localSettings,
    value: boolean,
  ) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    try {
      const res: any = await conversationService.updateGroupSettings(
        currentConversation.conversationId,
        { [key]: value },
      );
      if (res.success) {
        dispatch(
          updateConversationSetting({
            conversationId: currentConversation.conversationId,
            group: { ...currentConversation.group, [key]: value },
          }),
        );
      }
    } catch {
      setLocalSettings((prev) => ({ ...prev, [key]: !value }));
      Alert.alert("Lỗi", "Cập nhật cài đặt thất bại");
    }
  };

  const handleDownload = async (file: any) => {
    try {
      setDownloadingId(file.fileKey);
      const safeName = decodeURIComponent(file.fileName);
      const fileUri = FileSystem.documentDirectory + safeName;
      await FileSystem.downloadAsync(file.fileKey, fileUri);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(fileUri);
      else Alert.alert("Thành công", "Đã tải file thành công");
    } catch {
      Alert.alert("Lỗi", "Không thể tải tệp");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleAvatarPress = async () => {
    if (!isOwner && !isAdmin) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      const res: any = await conversationService.updateGroupMetadata(
        currentConversation.conversationId,
        { avatar: result.assets[0] },
      );
      if (res.success) Alert.alert("Thành công", "Đã cập nhật ảnh nhóm");
    }
  };

  const handleSaveName = async () => {
    if (!tempName.trim() || tempName === currentConversation?.name)
      return setEditingName(false);
    const res: any = await conversationService.updateGroupMetadata(
      currentConversation.conversationId,
      { name: tempName.trim() },
    );
    if (res.success) setEditingName(false);
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={styles.sheetContainer}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Thông tin hội thoại</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* PROFILE SECTION */}
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: currentConversation?.avatar }}
                  style={styles.largeAvatar}
                />
                {isGroup && (isOwner || isAdmin) && (
                  <TouchableOpacity
                    style={styles.editAvatarBtn}
                    onPress={handleAvatarPress}
                  >
                    <Ionicons name="camera" size={16} color="#4b5563" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.nameContainer}>
                {editingName ? (
                  <TextInput
                    style={styles.nameInput}
                    value={tempName}
                    onChangeText={setTempName}
                    autoFocus
                    onBlur={handleSaveName}
                  />
                ) : (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Text style={styles.profileName}>
                      {currentConversation?.name}
                    </Text>
                    {isGroup && (isOwner || isAdmin) && (
                      <TouchableOpacity onPress={() => setEditingName(true)}>
                        <Ionicons name="pencil" size={16} color="#9ca3af" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </View>

            {/* QUICK ACTIONS */}
            <View style={styles.quickActions}>
              <ActionItem
                icon={isMuted ? "notifications-off" : "notifications-outline"}
                label={isMuted ? "Bật" : "Tắt"}
                active={isMuted}
                onPress={() => setShowMuteOptions(true)}
              />
              <ActionItem
                icon={isPinned ? "pin" : "pin-outline"}
                label={isPinned ? "Bỏ ghim" : "Ghim"}
                active={isPinned}
                onPress={() => {
                  /* Pin logic */
                }}
              />
              {isGroup &&
                (localSettings.allowMembersInvite || isOwner || isAdmin) && (
                  <ActionItem
                    icon="person-add-outline"
                    label="Thêm TV"
                    onPress={() => setIsAddMemberVisible(true)}
                  />
                )}
            </View>

            {/* REQUESTS SECTION */}
            {isGroup && (isOwner || isAdmin) && joinRequests.length > 0 && (
              <View style={styles.whiteSection}>
                <SectionHeader
                  icon={
                    <Ionicons name="person-add" size={18} color="#0068ff" />
                  }
                  title={`Yêu cầu tham gia (${joinRequests.length})`}
                  expanded={expandedRequests}
                  onToggle={() => setExpandedRequests(!expandedRequests)}
                />
                {expandedRequests &&
                  joinRequests.map((req) => (
                    <View key={req._id} style={styles.requestRow}>
                      <Image
                        source={{ uri: req.userId?.profile?.avatarUrl }}
                        style={styles.requestAvatar}
                      />
                      <Text style={{ flex: 1 }}>
                        {req.userId?.profile?.name}
                      </Text>
                      <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={() => {
                          /* Logic duyệt */
                        }}
                      >
                        <Ionicons name="checkmark" size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                  ))}
              </View>
            )}

            {/* MEDIA SECTION (Logic KVT) */}
            <View style={styles.whiteSection}>
              <SectionHeader
                icon={<Ionicons name="image-outline" size={18} />}
                title="Ảnh/Video"
                expanded={expandedMedia}
                onToggle={() => setExpandedMedia(!expandedMedia)}
              />
              {expandedMedia && (
                <View style={styles.mediaGrid}>
                  {medias.length === 0 ? (
                    <Text style={styles.emptyText}>Chưa có ảnh/video</Text>
                  ) : (
                    medias.map((m, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.mediaItem}
                        onPress={() => setPreviewIndex(idx)}
                      >
                        {m.content?.file?.type === "VIDEO" ? (
                          <View style={styles.videoPlaceholder}>
                            <Ionicons name="play" size={24} color="white" />
                          </View>
                        ) : (
                          <Image
                            source={{ uri: m.content?.file?.fileKey }}
                            style={styles.mediaImg}
                          />
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </View>

            {/* FILES SECTION */}
            <View style={styles.whiteSection}>
              <SectionHeader
                icon={<Ionicons name="document-outline" size={18} />}
                title="File"
                expanded={expandedFile}
                onToggle={() => setExpandedFile(!expandedFile)}
              />
              {expandedFile &&
                files.map((f, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.fileRow}
                    onPress={() => handleDownload(f.content.file)}
                  >
                    <Ionicons name="document" size={24} color="#0068ff" />
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1}>{f.content.file.fileName}</Text>
                    </View>
                    {downloadingId === f.content.file.fileKey ? (
                      <ActivityIndicator size="small" color="blue" />
                    ) : (
                      <Ionicons
                        name="download-outline"
                        size={18}
                        color="#666"
                      />
                    )}
                  </TouchableOpacity>
                ))}
            </View>

            {/* MANAGEMENT SECTION (HEAD) */}
            {isGroup && (isOwner || isAdmin) && (
              <View style={styles.whiteSection}>
                <SectionHeader
                  icon={<Ionicons name="settings-outline" size={18} />}
                  title="Cài đặt nhóm"
                  expanded={expandedManagement}
                  onToggle={() => setExpandedManagement(!expandedManagement)}
                />
                {expandedManagement && (
                  <View style={{ padding: 16 }}>
                    <View style={styles.settingRow}>
                      <Text style={{ flex: 1 }}>Quyền mời thành viên</Text>
                      <Switch
                        value={localSettings.allowMembersInvite}
                        onValueChange={(v) =>
                          handleUpdateSetting("allowMembersInvite", v)
                        }
                      />
                    </View>
                    <View style={styles.settingRow}>
                      <Text style={{ flex: 1 }}>Quyền gửi tin nhắn</Text>
                      <Switch
                        value={localSettings.allowMembersSendMessages}
                        onValueChange={(v) =>
                          handleUpdateSetting("allowMembersSendMessages", v)
                        }
                      />
                    </View>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              style={styles.dangerBtn}
              onPress={() => {
                /* Logic rời nhóm */
              }}
            >
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.dangerText}>
                {isGroup ? "Rời nhóm" : "Xóa hội thoại"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>

      {/* FULL SCREEN MEDIA MODAL (Logic KVT) */}
      {previewIndex !== null && (
        <Modal visible transparent animationType="fade">
          <View style={styles.previewOverlay}>
            <TouchableOpacity
              style={styles.closePreview}
              onPress={() => setPreviewIndex(null)}
            >
              <Ionicons name="close" size={30} color="white" />
            </TouchableOpacity>
            <Image
              source={{ uri: medias[previewIndex].content.file.fileKey }}
              style={styles.fullImg}
              contentFit="contain"
            />
          </View>
        </Modal>
      )}

      <CreateGroupModal
        visible={isAddMemberVisible}
        onClose={() => setIsAddMemberVisible(false)}
        mode="ADD_MEMBER"
        conversationId={conversation.conversationId}
        excludedIds={members.map((m) => m.userId)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheetContainer: {
    flex: 1,
    backgroundColor: "#f0f2f5",
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: { fontSize: 16, fontWeight: "bold" },
  profileSection: {
    backgroundColor: "white",
    alignItems: "center",
    paddingVertical: 25,
    marginBottom: 8,
  },
  largeAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  profileName: { fontSize: 18, fontWeight: "bold" },
  quickActions: {
    backgroundColor: "white",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 15,
    marginBottom: 8,
  },
  actionBtn: { alignItems: "center" },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  actionLabel: { fontSize: 12, color: "#4b5563" },
  whiteSection: { backgroundColor: "white", marginBottom: 8 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: "600" },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  mediaItem: {
    width: (width - 36) / 3,
    aspectRatio: 1,
    backgroundColor: "#eee",
  },
  mediaImg: { width: "100%", height: "100%" },
  videoPlaceholder: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    textAlign: "center",
    color: "#9ca3af",
    width: "100%",
    padding: 20,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
    backgroundColor: "white",
  },
  dangerText: { color: "#ef4444", fontWeight: "bold" },
  previewOverlay: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
  },
  fullImg: { width: "100%", height: "80%" },
  closePreview: { position: "absolute", top: 40, right: 20, zIndex: 10 },
  avatarContainer: { position: "relative" },
  editAvatarBtn: {
    position: "absolute",
    bottom: 10,
    right: 0,
    backgroundColor: "white",
    padding: 5,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  nameContainer: { alignItems: "center" },
  nameInput: {
    borderBottomWidth: 1,
    borderColor: "#0068ff",
    width: 200,
    textAlign: "center",
    fontSize: 16,
  },
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  requestAvatar: { width: 40, height: 40, borderRadius: 20 },
  approveBtn: { backgroundColor: "#0068ff", padding: 8, borderRadius: 20 },
});

export default ConversationInfoSheet;
