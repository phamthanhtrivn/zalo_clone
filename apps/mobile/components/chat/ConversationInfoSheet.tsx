import React, { useState, useEffect, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
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
import { Video, ResizeMode } from "expo-av";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { useSocket } from "@/contexts/SocketContext";
import {
  updateConversationSetting,
  removeConversation,
} from "@/store/slices/conversationSlice";
import { conversationService } from "@/services/conversation.service";
import { messageService } from "@/services/message.service";
import CreateGroupModal from "./CreateGroupModal";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { truncateFileName } from "@/utils/render-file";
import { formatFileSize } from "@/utils/format-file.util";
import { getDateLabel } from "@/utils/format-message-time..util";

const { width } = Dimensions.get("window");

// --- COMPONENTS HỖ TRỢ ---
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

  // --- STATE ---
  const [medias, setMedias] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  // States mở rộng các mục
  const [expandedMedia, setExpandedMedia] = useState(true);
  const [expandedFile, setExpandedFile] = useState(false);
  const [expandedLink, setExpandedLink] = useState(false);
  const [expandedMembers, setExpandedMembers] = useState(true);
  const [expandedRequests, setExpandedRequests] = useState(true);
  const [expandedManagement, setExpandedManagement] = useState(false);

  const [showMuteOptions, setShowMuteOptions] = useState(false);
  const [isAddMemberVisible, setIsAddMemberVisible] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(conversation?.name || "");

  const currentConversation =
    useAppSelector((state) =>
      state.conversation.items?.find(
        (c) => c.conversationId === conversation?.conversationId,
      ),
    ) || conversation;

  const isGroup = currentConversation?.type === "GROUP";
  const isPinned = currentConversation?.pinned;
  const isMuted =
    currentConversation?.muted &&
    (!currentConversation?.mutedUntil ||
      new Date(currentConversation.mutedUntil).getTime() > Date.now());

  const [localSettings, setLocalSettings] = useState({
    allowMembersInvite: true,
    allowMembersSendMessages: true,
    approvalRequired: false,
  });

  useEffect(() => {
    if (currentConversation?.group) {
      setLocalSettings({
        allowMembersInvite:
          currentConversation.group.allowMembersInvite !== false,
        allowMembersSendMessages:
          currentConversation.group.allowMembersSendMessages !== false,
        approvalRequired: currentConversation.group.approvalRequired === true,
      });
    }
  }, [currentConversation?.group]);

  const myMemberInfo = members.find((m) => m.userId === currentUserId);
  const isOwner = myMemberInfo?.role === "OWNER";
  const isAdmin = myMemberInfo?.role === "ADMIN";

  // --- FETCHING DATA ---
  const fetchMembers = async () => {
    if (!isGroup) return;
    const res: any = await conversationService.getListMembers(
      conversation.conversationId,
    );
    if (res.success) setMembers(res.data);
  };

  const fetchJoinRequests = async () => {
    if (!isGroup || !(isOwner || isAdmin)) return;
    const res: any = await conversationService.getJoinRequests(
      conversation.conversationId,
    );
    if (res?.success) setJoinRequests(res.data || []);
  };

  useEffect(() => {
    if (!visible || !conversation?.conversationId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [mediaRes] = await Promise.all([
          messageService.getMediasPreview(
            currentUserId,
            conversation.conversationId,
          ),
          fetchMembers(),
          fetchJoinRequests(),
        ]);
        if (mediaRes.success) {
          setMedias(mediaRes.data.images_videos || []);
          setFiles(mediaRes.data.files || []);
          setLinks(mediaRes.data.links || []);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [visible, conversation?.conversationId]);

  // --- SOCKET LISTENERS (Hợp nhất cả 2 nhánh) ---
  useEffect(() => {
    if (!socket || !visible || !conversation?.conversationId) return;

    socket.emit("join_room", `media_${conversation.conversationId}`);

    socket.on("new_media", (payload) => {
      if (payload.type === "IMAGE_VIDEO")
        setMedias((p) => [payload.data, ...p].slice(0, 6));
      if (payload.type === "FILE")
        setFiles((p) => [payload.data, ...p].slice(0, 6));
    });

    socket.on("new_approval_request", fetchJoinRequests);
    socket.on("member_updated", fetchMembers);

    return () => {
      socket.emit("leave_room", `media_${conversation.conversationId}`);
      socket.off("new_media");
      socket.off("new_approval_request");
      socket.off("member_updated");
    };
  }, [socket, visible]);

  // --- ACTIONS ---
  const handleDownload = async (file: any) => {
    try {
      setDownloadingId(file.fileKey);
      const safeFileName = decodeURIComponent(file.fileName || "file");
      const fileUri = FileSystem.documentDirectory + safeFileName;
      const { uri } = await FileSystem.downloadAsync(file.fileKey, fileUri);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: file.mimeType,
          dialogTitle: safeFileName,
        });
      } else {
        Alert.alert("Thành công", `Đã lưu file: ${safeFileName}`);
      }
    } catch (err) {
      Alert.alert("Lỗi", "Không thể tải file.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleUpdateSetting = async (
    key: keyof typeof localSettings,
    value: boolean,
  ) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    try {
      await conversationService.updateGroupSettings(
        conversation.conversationId,
        { [key]: value },
      );
    } catch (err) {
      setLocalSettings((prev) => ({ ...prev, [key]: !value }));
      Alert.alert("Lỗi", "Không thể cập nhật cài đặt");
    }
  };

  const handleAvatarPress = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled) {
      const res: any = await conversationService.updateGroupMetadata(
        conversation.conversationId,
        { avatar: result.assets[0] },
      );
      if (res.success) Alert.alert("Thành công", "Đã cập nhật ảnh nhóm");
    }
  };

  const handleSaveName = async () => {
    if (!tempName.trim() || tempName === currentConversation?.name)
      return setEditingName(false);
    const res: any = await conversationService.updateGroupMetadata(
      conversation.conversationId,
      { name: tempName.trim() },
    );
    if (res.success) setEditingName(false);
  };

  const handleMute = async (duration: number) => {
    // Logic xử lý mute tương tự turnover trước...
    setShowMuteOptions(false);
  };

  const handlePin = async () => {
    const newStatus = !isPinned;
    dispatch(
      updateConversationSetting({
        conversationId: conversation.conversationId,
        pinned: newStatus,
      }),
    );
    await conversationService.updateConversationSetting?.(
      conversation.conversationId,
      { pinned: newStatus },
    );
  };

  // --- RENDER ---
  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={styles.sheetContainer}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Thông tin hội thoại</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 1. PROFILE SECTION */}
            <View style={styles.profileSection}>
              <TouchableOpacity
                onPress={
                  isGroup && (isOwner || isAdmin)
                    ? handleAvatarPress
                    : undefined
                }
              >
                <Image
                  source={{ uri: currentConversation?.avatar }}
                  style={styles.largeAvatar}
                />
                {isGroup && (isOwner || isAdmin) && (
                  <View style={styles.editBadge}>
                    <Ionicons name="camera" size={14} color="white" />
                  </View>
                )}
              </TouchableOpacity>

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
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
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

            {/* 2. QUICK ACTIONS */}
            <View style={styles.quickActions}>
              <ActionItem
                icon={isMuted ? "notifications-off" : "notifications-outline"}
                label={isMuted ? "Bật" : "Tắt"}
                active={isMuted}
                onPress={() =>
                  isMuted ? handleMute(0) : setShowMuteOptions(true)
                }
              />
              <ActionItem
                icon={isPinned ? "pin" : "pin-outline"}
                label={isPinned ? "Bỏ ghim" : "Ghim"}
                active={isPinned}
                onPress={handlePin}
              />
              <ActionItem
                icon="person-add-outline"
                label="Thêm TV"
                onPress={() => setIsAddMemberVisible(true)}
              />
            </View>

            {/* 3. MEDIA SECTIONS (Khôi phục từ KVT) */}
            <View style={styles.whiteSection}>
              <SectionHeader
                icon={<Ionicons name="images-outline" size={18} />}
                title="Ảnh & Video"
                expanded={expandedMedia}
                onToggle={() => setExpandedMedia(!expandedMedia)}
              />
              {expandedMedia && (
                <View style={styles.mediaGrid}>
                  {medias.map((m, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => setPreviewIndex(i)}
                      style={styles.mediaItem}
                    >
                      <Image
                        source={{ uri: m.content?.file?.fileKey }}
                        style={styles.mediaImg}
                        contentFit="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <SectionHeader
                icon={<Ionicons name="document-outline" size={18} />}
                title="File đã gửi"
                expanded={expandedFile}
                onToggle={() => setExpandedFile(!expandedFile)}
              />
              {expandedFile && (
                <View style={{ paddingHorizontal: 16 }}>
                  {files.map((f, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.fileRow}
                      onPress={() => handleDownload(f.content.file)}
                    >
                      <Ionicons
                        name="document-attach-outline"
                        size={24}
                        color="#0068ff"
                      />
                      <Text numberOfLines={1} style={{ flex: 1 }}>
                        {f.content.file.fileName}
                      </Text>
                      {downloadingId === f.content.file.fileKey ? (
                        <ActivityIndicator size="small" />
                      ) : (
                        <Ionicons
                          name="download-outline"
                          size={18}
                          color="#0068ff"
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* 4. GROUP MANAGEMENT (Khôi phục từ HEAD) */}
            {isGroup && (isOwner || isAdmin) && (
              <View style={styles.whiteSection}>
                <SectionHeader
                  icon={<Ionicons name="settings-outline" size={18} />}
                  title="Quản trị nhóm"
                  expanded={expandedManagement}
                  onToggle={() => setExpandedManagement(!expandedManagement)}
                />
                {expandedManagement && (
                  <View style={{ paddingHorizontal: 16 }}>
                    <View style={styles.settingRow}>
                      <Text>Phê duyệt thành viên mới</Text>
                      <Switch
                        value={localSettings.approvalRequired}
                        onValueChange={(v) =>
                          handleUpdateSetting("approvalRequired", v)
                        }
                      />
                    </View>
                    <View style={styles.settingRow}>
                      <Text>Cho phép TV mời người mới</Text>
                      <Switch
                        value={localSettings.allowMembersInvite}
                        onValueChange={(v) =>
                          handleUpdateSetting("allowMembersInvite", v)
                        }
                      />
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* 5. MEMBERS LIST */}
            <View style={styles.whiteSection}>
              <SectionHeader
                icon={<Ionicons name="people-outline" size={18} />}
                title={`Thành viên (${members.length})`}
                expanded={expandedMembers}
                onToggle={() => setExpandedMembers(!expandedMembers)}
              />
              {expandedMembers &&
                members.map((m, i) => (
                  <View key={i} style={styles.memberRow}>
                    <Image
                      source={{ uri: m.avatarUrl }}
                      style={styles.memberAvatar}
                    />
                    <Text style={{ flex: 1 }}>
                      {m.name} {m.userId === currentUserId && "(Bạn)"}
                    </Text>
                    <Text style={styles.roleBadge}>{m.role}</Text>
                  </View>
                ))}
            </View>

            <TouchableOpacity style={styles.dangerBtn} onPress={() => {}}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={{ color: "#ef4444", fontWeight: "600" }}>
                Rời khỏi nhóm
              </Text>
            </TouchableOpacity>

            <View style={{ height: 100 }} />
          </ScrollView>
        </Pressable>
      </Pressable>

      <CreateGroupModal
        visible={isAddMemberVisible}
        onClose={() => setIsAddMemberVisible(false)}
        mode="ADD_MEMBER"
        conversationId={conversation.conversationId}
        excludedIds={members.map((m) => m.userId)}
        onSuccess={fetchMembers}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheetContainer: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  headerTitle: { fontSize: 16, fontWeight: "bold" },
  profileSection: {
    backgroundColor: "white",
    alignItems: "center",
    padding: 20,
    marginBottom: 8,
  },
  largeAvatar: { width: 80, height: 80, borderRadius: 40 },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#0068ff",
    padding: 4,
    borderRadius: 12,
  },
  profileName: { fontSize: 18, fontWeight: "bold", marginTop: 10 },
  nameInput: {
    fontSize: 18,
    borderBottomWidth: 1,
    borderColor: "#0068ff",
    width: "60%",
    textAlign: "center",
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 15,
    backgroundColor: "white",
    marginBottom: 8,
  },
  actionBtn: { alignItems: "center" },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },
  actionLabel: { fontSize: 12 },
  whiteSection: { backgroundColor: "white", marginBottom: 8 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    alignItems: "center",
  },
  sectionTitle: { fontSize: 14, fontWeight: "600" },
  mediaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 2, padding: 12 },
  mediaItem: { width: (width - 30) / 3, aspectRatio: 1 },
  mediaImg: { width: "100%", height: "100%" },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  memberAvatar: { width: 40, height: 40, borderRadius: 20 },
  roleBadge: {
    fontSize: 10,
    color: "#0068ff",
    backgroundColor: "#eef2ff",
    padding: 4,
    borderRadius: 4,
  },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    backgroundColor: "white",
  },
});

export default ConversationInfoSheet;
