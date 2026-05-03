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
  StyleSheet,
  Switch,
  Dimensions,
  TextInput,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Video } from "expo-av";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import type { ConversationItemType } from "@/types/conversation-item.type";
import { messageService } from "@/services/message.service";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { getDateLabel } from "@/utils/format-message-time..util";
import {
  removeConversation,
  updateConversationSetting,
} from "@/store/slices/conversationSlice";
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
import { conversationService } from "@/services/conversation.service";
import CreateGroupModal from "./CreateGroupModal";
import { useRouter } from "expo-router";
import MemberActionSheet from "../ui/MemberActionSheet";
import GroupAvatar from "../ui/GroupAvatar";
import ShareGroupQRModal from "./ShareGroupQRModal";
import { pollService } from "@/services/poll.service";

const { width } = Dimensions.get("window");

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
  const router = useRouter();
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

  const currentUserId = user?.userId;
  const [members, setMembers] = useState<any[]>([]);
  const [expandedMembers, setExpandedMembers] = useState(true);
  const [isAddMemberVisible, setIsAddMemberVisible] = useState(false);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [expandedRequests, setExpandedRequests] = useState(true);
  const [expandedManagement, setExpandedManagement] = useState(false);
  const [polls, setPolls] = useState<any[]>([]);
  const [expandedPoll, setExpandedPoll] = useState(false);
  const [loadingPolls, setLoadingPolls] = useState(false);
  const [membersRefreshKey, setMembersRefreshKey] = useState(0);
  const [isQrModalVisible, setIsQrModalVisible] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(conversation?.name || "");
  const isGroup = conversation?.type === "GROUP";
  const currentConversation =
    useAppSelector((state) =>
      state.conversation.conversations?.find(
        (c) => c.conversationId === conversation?.conversationId,
      ),
    ) || conversation;
  // --- FIX CỐT LÕI: LOCAL STATE CHO SWITCH ĐỂ TRÁNH BỊ GIẬT ---
  const [localSettings, setLocalSettings] = useState({
    allowMembersInvite: true,
    allowMembersSendMessages: true,
    approvalRequired: false,
  });

  const isPinned = currentConversation?.pinned;

  const isMuted =
    currentConversation?.muted &&
    (!currentConversation?.mutedUntil ||
      new Date(currentConversation.mutedUntil).getTime() > Date.now());

  useEffect(() => {
    if (!visible || !conversation?.conversationId || !currentUserId) return;

    const initData = async () => {
      setLoading(true);
      try {
        const [mediaRes] = await Promise.all([
          messageService.getMediasPreview(
            currentUserId,
            conversation.conversationId,
          ),
          isGroup ? fetchMembers() : Promise.resolve(null),
        ]);

        if (mediaRes && mediaRes.success) {
          setMedias(mediaRes.data.images_videos || []);
          setFiles(mediaRes.data.files || []);
          setLinks(mediaRes.data.links || []);
        }
      } catch (e) {
        console.error("Lỗi khi tải dữ liệu hội thoại:", e);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [visible, conversation?.conversationId, currentUserId]);

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

  const myMemberInfo = members.find((m) => m.userId === currentUserId);
  const isOwner = myMemberInfo?.role === "OWNER";
  const isAdmin = myMemberInfo?.role === "ADMIN";
  const currentUserRole = myMemberInfo?.role || (isGroup ? "MEMBER" : "OWNER");

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

  const fetchMembers = async () => {
    if (!isGroup) return;
    const res: any = await conversationService.getListMembers(
      conversation.conversationId,
    );
    if (res.success) setMembers(res.data);
  };

  const fetchJoinRequests = async () => {
    try {
      const res: any = await conversationService.getJoinRequests(
        currentConversation!.conversationId,
      );
      if (res?.success) {
        const requestsArray = Array.isArray(res.data)
          ? res.data
          : res.data?.data || [];
        setJoinRequests(requestsArray);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (visible && isGroup && (isOwner || isAdmin)) {
      fetchJoinRequests();
    }
  }, [
    visible,
    currentConversation?.conversationId,
    membersRefreshKey,
    isOwner,
    isAdmin,
  ]);

  useEffect(() => {
    if (!socket || !currentConversation?.conversationId) return;

    const handleNewRequest = (data: any) => {
      if (data.conversationId === currentConversation.conversationId)
        fetchJoinRequests();
    };

    const handleMemberUpdate = (data: any) => {
      if (data?.conversationId === currentConversation.conversationId) {
        setMembersRefreshKey((k) => k + 1);
        fetchMembers();
      }
    };

    socket.on("new_approval_request", handleNewRequest);
    socket.on("member_updated", handleMemberUpdate);
    socket.on("role_updated", handleMemberUpdate);

    return () => {
      socket.off("new_approval_request", handleNewRequest);
      socket.off("member_updated", handleMemberUpdate);
      socket.off("role_updated", handleMemberUpdate);
    };
  }, [socket, currentConversation?.conversationId]);

  const [selectedMemberForAction, setSelectedMemberForAction] = useState<any | null>(
    null,
  );

  const handleMemberAction = (target: any) => {
    if (target.userId === currentUserId) return;
    setSelectedMemberForAction(target);
  };



  const confirmTransferOwner = (target: any) => {
    Alert.alert(
      "Xác nhận",
      `Bạn chắc chắn muốn chuyển quyền Trưởng nhóm cho ${target.name}? Sau khi chuyển, bạn sẽ trở thành thành viên thường.`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const res: any = await conversationService.transferOwner(
                conversation.conversationId,
                target.userId,
              );
              if (res.success) {
                Alert.alert("Thành công", "Đã chuyển quyền Trưởng nhóm");
                fetchMembers();
              }
            } catch (err: any) {
              Alert.alert(
                "Lỗi",
                err.response?.data?.message || "Không thể chuyển quyền lúc này",
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const updateRole = async (t: any, r: string) => {
    const res: any = await conversationService.updateMembersRole(
      conversation.conversationId,
      [t.userId],
      r,
    );
    if (res.success) fetchMembers();
  };

  const confirmRemoveMember = (t: any) => {
    Alert.alert("Xác nhận", `Mời ${t.name} rời khỏi nhóm?`, [
      { text: "Hủy" },
      {
        text: "Xác nhận",
        style: "destructive",
        onPress: async () => {
          const res: any = await conversationService.removeMember(
            conversation.conversationId,
            t.userId,
          );
          if (res.success) fetchMembers();
        },
      },
    ]);
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      "Giải tán nhóm",
      "Tất cả thành viên sẽ bị mời ra khỏi nhóm và toàn bộ tin nhắn sẽ bị xóa. Bạn chắc chắn chứ?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Giải tán",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const res: any = await conversationService.deleteGroup(
                conversation.conversationId,
              );
              if (res.success) {
                onClose();
                router.replace("/private/chat");
              }
            } catch (err: any) {
              const errorMsg =
                err.response?.data?.message ||
                "Không thể giải tán nhóm lúc này";
              Alert.alert("Lỗi", errorMsg);
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleLeaveGroup = () => {
    const alertTitle = isGroup ? "Rời nhóm" : "Xóa cuộc trò chuyện";
    const alertMsg = isGroup
      ? "Bạn sẽ không còn nhận được tin nhắn từ nhóm này nữa?"
      : "Toàn bộ lịch sử tin nhắn sẽ bị xóa và không thể khôi phục?";

    Alert.alert(alertTitle, alertMsg, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xác nhận",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            if (isGroup) {
              const res: any = await conversationService.leaveGroup(
                conversation.conversationId,
              );

              if (res.success) {
                onClose();
                router.replace("/private/chat");
              }
            } else {
              const res: any = await conversationService.deleteGroup(
                conversation.conversationId,
              );
              if (res.success) {
                onClose();
                dispatch(removeConversation(conversation.conversationId));
                router.replace("/private/chat");
              }
            }
          } catch (err: any) {
            const errorMsg =
              err.response?.data?.message ||
              "Có lỗi xảy ra khi thực hiện thao tác này";
            Alert.alert("Thông báo", errorMsg);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleUpdateSetting = async (
    key: keyof typeof localSettings,
    value: boolean,
  ) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));

    dispatch(
      updateConversationSetting({
        conversationId: currentConversation!.conversationId,
        group: { ...currentConversation!.group, [key]: value },
      }),
    );

    // 3. Gọi API
    try {
      const res: any = await conversationService.updateGroupSettings(
        currentConversation!.conversationId,
        { [key]: value },
      );
      if (!res.success) throw new Error("API thất bại");
    } catch (err) {
      Alert.alert("Lỗi", "Không thể cập nhật cài đặt");
      // Rollback nếu lỗi
      setLocalSettings((prev) => ({ ...prev, [key]: !value }));
      dispatch(
        updateConversationSetting({
          conversationId: currentConversation!.conversationId,
          group: { ...currentConversation!.group, [key]: !value },
        }),
      );
    }
  };

  const onHandleRequest = async (
    reqId: string,
    action: "APPROVED" | "REJECTED",
  ) => {
    try {
      const res: any = await conversationService.handleJoinRequest(
        currentConversation!.conversationId,
        reqId,
        action,
      );

      if (res.success || res.data) {
        setJoinRequests((prev) => prev.filter((r) => r._id !== reqId));

        if (action === "APPROVED") {
          fetchMembers();
          setMembersRefreshKey((k) => k + 1);
        }
      } else {
        Alert.alert("Thông báo", res.message || "Thao tác không thành công");
      }
    } catch (err: any) {
      console.log("Lỗi duyệt/xóa yêu cầu:", err?.response?.data || err.message);
      Alert.alert(
        "Lỗi",
        err?.response?.data?.message ||
          "Không thể thực hiện thao tác này. Vui lòng thử lại.",
      );
    }
  };
 
  const handleTogglePolls = async () => {
    const willExpand = !expandedPoll;
    setExpandedPoll(willExpand);
    if (willExpand && conversation?.conversationId) {
      setLoadingPolls(true);
      try {
        const res: any = await pollService.getPolls(
          conversation.conversationId,
        );
        if (res) {
          setPolls(res);
        }
      } catch (error) {
        console.error("Lỗi khi tải danh sách bình chọn:", error);
      } finally {
        setLoadingPolls(false);
      }
    }
  };

  const uploadAvatar = async (selectedFile: ImagePicker.ImagePickerAsset) => {
    try {
      setLoading(true);
      const res: any = await conversationService.updateGroupMetadata(
        currentConversation.conversationId,
        { avatar: selectedFile },
      );
      if (res.success) {
        Alert.alert("Thành công", "Đã cập nhật ảnh nhóm mới");
      }
    } catch (err) {
      Alert.alert("Lỗi", "Không thể tải ảnh lên server");
    } finally {
      setLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Quyền truy cập", "Bạn cần cấp quyền Camera để chụp ảnh");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      await uploadAvatar(result.assets[0]);
    }
  };

  const handleChooseLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      await uploadAvatar(result.assets[0]);
    }
  };

  const handleAvatarPress = () => {
    Alert.alert("Ảnh đại diện nhóm", "Chọn phương thức cập nhật ảnh", [
      { text: "Chụp ảnh mới", onPress: handleTakePhoto },
      { text: "Chọn từ thư viện", onPress: handleChooseLibrary },
      { text: "Hủy", style: "cancel" },
    ]);
  };

  const handleSaveName = async () => {
    if (!tempName.trim() || tempName === currentConversation?.name) {
      setEditingName(false);
      return;
    }
    try {
      const res: any = await conversationService.updateGroupMetadata(
        currentConversation.conversationId,
        { name: tempName.trim() },
      );
      if (res.success) {
        setEditingName(false);
      }
    } catch (err) {
      Alert.alert("Lỗi", "Không thể đổi tên nhóm");
    }
  };

  const canInvite = localSettings.allowMembersInvite || isOwner || isAdmin;

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
                <GroupAvatar
                  uri={conversation?.avatar}
                  name={conversation?.name || "Group"}
                  size={70}
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
                    onSubmitEditing={handleSaveName}
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
                  label: isMuted ? "Bật thông báo" : "Tắt thông báo",
                  onPress: () =>
                    isMuted ? handleMute(0) : setShowMuteOptions(true),
                  active: isMuted,
                },
                {
                  icon: "pin-outline",
                  label: isPinned ? "Bỏ ghim" : "Ghim hội thoại",
                  onPress: handlePin,
                  active: isPinned,
                },
                {
                  icon: isGroup ? "person-add-outline" : "people-outline",
                  label: isGroup ? "Thêm TV" : "Tạo nhóm",
                  onPress: () => {
                    if (isGroup) {
                      if (canInvite) {
                        setIsAddMemberVisible(true);
                      } else {
                        Alert.alert(
                          "Thông báo",
                          "Trưởng/phó nhóm đã tắt quyền mời thành viên đối với thành viên thường.",
                        );
                      }
                    } else {
                      setIsAddMemberVisible(true);
                    }
                  },
                  active: false,
                },
                {
                  icon: "qr-code-outline",
                  label: "Mã QR",
                  onPress: () => setIsQrModalVisible(true),
                  active: false,
                },
              ].map((action) => (
                <TouchableOpacity
                  key={action.label}
                  onPress={action.onPress}
                  style={{ alignItems: "center", gap: 6, width: width / 4 }} // Chia đều độ rộng
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
                      paddingHorizontal: 4,
                    }}
                    numberOfLines={2}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {loading && (
              <ActivityIndicator
                style={{ marginVertical: 20 }}
                color="#0068ff"
              />
            )}

            {/* 1. YÊU CẦU THAM GIA */}
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
                {expandedRequests && (
                  <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
                    {joinRequests.map((req) => (
                      <View key={req._id} style={styles.requestRow}>
                        <Image
                          source={{
                            uri:
                              req.userId?.profile?.avatarUrl ||
                              "https://via.placeholder.com/150",
                          }}
                          style={styles.requestAvatar}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.requestName} numberOfLines={1}>
                            {req.userId?.profile?.name}
                          </Text>
                          <Text style={styles.requestSub}>
                            Mời bởi: {req.invitedBy?.profile?.name}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <TouchableOpacity
                            onPress={() => onHandleRequest(req._id, "APPROVED")}
                            style={styles.approveBtn}
                          >
                            <Ionicons
                              name="checkmark"
                              size={16}
                              color="white"
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => onHandleRequest(req._id, "REJECTED")}
                            style={styles.rejectBtn}
                          >
                            <Ionicons name="close" size={16} color="#666" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* 2. CÀI ĐẶT QUẢN TRỊ NHÓM */}
            {isGroup && (isOwner || isAdmin) && (
              <View style={styles.whiteSection}>
                <SectionHeader
                  icon={<Ionicons name="settings-outline" size={18} />}
                  title="Cài đặt nhóm"
                  expanded={expandedManagement}
                  onToggle={() => setExpandedManagement(!expandedManagement)}
                />
                {expandedManagement && (
                  <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                    <View style={styles.settingRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.settingTitle}>
                          Quyền mời thành viên
                        </Text>
                        <Text style={styles.settingSub}>
                          Thành viên thường có thể mời người khác
                        </Text>
                      </View>
                      <Switch
                        value={localSettings.allowMembersInvite}
                        onValueChange={(val) =>
                          handleUpdateSetting("allowMembersInvite", val)
                        }
                        trackColor={{ false: "#d1d5db", true: "#34d399" }}
                      />
                    </View>

                    <View style={styles.settingRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.settingTitle}>
                          Quyền gửi tin nhắn
                        </Text>
                        <Text style={styles.settingSub}>
                          Cho phép mọi người cùng nhắn tin
                        </Text>
                      </View>
                      <Switch
                        value={localSettings.allowMembersSendMessages}
                        onValueChange={(val) =>
                          handleUpdateSetting("allowMembersSendMessages", val)
                        }
                        trackColor={{ false: "#d1d5db", true: "#3b82f6" }}
                      />
                    </View>

                    <View style={styles.settingRow}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.settingTitle, { color: "#0068ff" }]}
                        >
                          Phê duyệt thành viên mới
                        </Text>
                        <Text style={styles.settingSub}>
                          Admin cần duyệt trước khi vào nhóm
                        </Text>
                      </View>
                      <Switch
                        value={localSettings.approvalRequired}
                        onValueChange={(val) =>
                          handleUpdateSetting("approvalRequired", val)
                        }
                        trackColor={{ false: "#d1d5db", true: "#0068ff" }}
                      />
                    </View>
                  </View>
                )}
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

            <View style={{ backgroundColor: "white", marginBottom: 2 }}>
              <SectionHeader
                icon={<Ionicons name="stats-chart" size={18} color="#374151" />}
                title="Bình chọn"
                expanded={expandedPoll}
                onToggle={handleTogglePolls}
              />
              {expandedPoll && (
                <View style={{ paddingHorizontal: 12, paddingBottom: 16 }}>
                  {loadingPolls ? (
                    <ActivityIndicator size="small" color="#0068ff" />
                  ) : polls.length === 0 ? (
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#9ca3af",
                        textAlign: "center",
                        paddingVertical: 8,
                      }}
                    >
                      Chưa có bình chọn nào trong cuộc trò chuyện
                    </Text>
                  ) : (
                    polls.map((msg, idx) => {
                      const pollData = msg.poll;
                      if (!pollData) return null;
                      return (
                        <TouchableOpacity
                          key={msg._id || idx}
                          style={{
                            padding: 12,
                            borderRadius: 10,
                            backgroundColor: "#f9fafb",
                            borderWidth: 1,
                            borderColor: "#f3f4f6",
                            marginBottom: 8,
                          }}
                          onPress={() => {
                            onClose();
                            router.push({
                              pathname: "/private/chat/[id]",
                              params: {
                                id: conversation.conversationId,
                                messageId: msg._id,
                              },
                            });
                          }}
                        >
                          <Text
                            numberOfLines={1}
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: "#111",
                              marginBottom: 4,
                            }}
                          >
                            {pollData.title || "Bình chọn không tiêu đề"}
                          </Text>
                          <Text style={{ fontSize: 12, color: "#6b7280" }}>
                            {pollData.totalParticipants || 0} người đã bình chọn
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              )}
            </View>

            {/* 3. DANH SÁCH THÀNH VIÊN */}
            {isGroup && (
              <View style={styles.whiteSection}>
                <SectionHeader
                  icon={<Ionicons name="people-outline" size={18} />}
                  title={`Thành viên (${members.length})`}
                  expanded={expandedMembers}
                  onToggle={() => setExpandedMembers(!expandedMembers)}
                />
                {expandedMembers && (
                  <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
                    {members.map((m) => (
                      <TouchableOpacity
                        key={m.userId}
                        style={styles.memberRow}
                        onPress={() => handleMemberAction(m)}
                      >
                        <GroupAvatar
                          uri={m.avatarUrl}
                          name={m.name || "User"}
                          size={44}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.memberName}>
                            {m.name} {m.userId === currentUserId && "(Bạn)"}
                          </Text>
                          {m.role !== "MEMBER" && (
                            <Text style={styles.roleLabel}>
                              {m.role === "OWNER" ? "Trưởng nhóm" : "Phó nhóm"}
                            </Text>
                          )}
                        </View>
                        {m.userId !== currentUserId && (
                          <Ionicons
                            name="ellipsis-horizontal"
                            size={18}
                            color="#9ca3af"
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            <View style={[styles.whiteSection, { marginTop: 10 }]}>
              {isGroup && isOwner && (
                <TouchableOpacity
                  style={styles.dangerBtn}
                  onPress={handleDeleteGroup}
                >
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  <Text style={styles.dangerText}>Giải tán nhóm</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.dangerBtn}
                onPress={handleLeaveGroup}
              >
                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                <Text style={styles.dangerText}>
                  {isGroup ? "Rời nhóm" : "Xóa lịch sử chat"}
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
                    style={{
                      position: "absolute",
                      left: 20,
                      top: "90%",
                      zIndex: 10,
                    }}
                    onPress={() =>
                      setPreviewIndex((p) => (p !== null ? p - 1 : p))
                    }
                  >
                    <Ionicons name="chevron-back" size={36} color="white" />
                  </TouchableOpacity>
                )}

                {previewIndex < medias.length - 1 && (
                  <TouchableOpacity
                    style={{
                      position: "absolute",
                      right: 20,
                      top: "90%",
                      zIndex: 10,
                    }}
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
      <CreateGroupModal
        visible={isAddMemberVisible}
        onClose={() => setIsAddMemberVisible(false)}
        mode="ADD_MEMBER"
        conversationId={conversation.conversationId}
        excludedIds={members.map((m) => m.userId)}
        onSuccess={fetchMembers}
      />

      {isGroup && (
        <ShareGroupQRModal
          visible={isQrModalVisible}
          onClose={() => setIsQrModalVisible(false)}
          conversationId={conversation.conversationId}
          conversationName={conversation.name}
          initialJoinToken={currentConversation?.group?.joinToken || null}
          myRole={currentUserRole as any}
          onTokenRefreshed={(newToken) => {
            dispatch(
              updateConversationSetting({
                conversationId: conversation.conversationId,
                group: { ...currentConversation.group, joinToken: newToken },
              }),
            );
          }}
        />
      )}
      <MemberActionSheet
        visible={!!selectedMemberForAction}
        onClose={() => setSelectedMemberForAction(null)}
        member={selectedMemberForAction}
        userRole={currentUserRole}
        onViewProfile={(uid) => router.push(`/user/${uid}`)}
        onChat={async (uid) => {
          const res: any = await conversationService.getOrCreateDirect(uid);
          const cid = res?.data?._id || res?._id;
          if (cid) {
            onClose();
            router.push(`/private/chat/${cid}`);
          }
        }}
        onPromoteAdmin={(uid, isPromote) => {
          const target = members.find((m) => m.userId === uid);
          if (target) updateRole(target, isPromote ? "ADMIN" : "MEMBER");
        }}
        onTransferOwner={(uid) => {
          const target = members.find((m) => m.userId === uid);
          if (target) confirmTransferOwner(target);
        }}
        onRemove={(uid) => {
          const target = members.find((m) => m.userId === uid);
          if (target) confirmRemoveMember(target);
        }}
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
  emptyText: {
    textAlign: "center",
    color: "#9ca3af",
    width: "100%",
    padding: 20,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  memberAvatar: { width: 44, height: 44, borderRadius: 22 },
  memberName: { fontSize: 15, fontWeight: "500" },
  roleLabel: { fontSize: 11, color: "#0068ff", fontWeight: "600" },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
    borderTopWidth: 0.5,
    borderTopColor: "#f3f4f6",
  },
  dangerText: { fontSize: 15, color: "#ef4444", fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  muteSheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 30,
  },
  muteTitle: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
    padding: 15,
  },
  muteOpt: { padding: 15, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  muteCancel: {
    marginTop: 10,
    padding: 15,
    alignItems: "center",
    borderTopWidth: 6,
    borderTopColor: "#f3f4f6",
  },
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    backgroundColor: "#f0f7ff",
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  requestAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  requestName: { fontSize: 14, fontWeight: "600", color: "#111" },
  requestSub: { fontSize: 11, color: "#666", marginTop: 2 },
  approveBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#0068ff",
    alignItems: "center",
    justifyContent: "center",
  },
  rejectBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f0f0",
  },
  settingTitle: { fontSize: 14, fontWeight: "500", color: "#333" },
  settingSub: { fontSize: 11, color: "#888", marginTop: 2 },
  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  editAvatarBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "white",
    padding: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    elevation: 2,
  },
  nameContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    paddingHorizontal: 20,
  },
  nameInput: {
    fontSize: 18,
    fontWeight: "bold",
    borderBottomWidth: 2,
    borderBottomColor: "#0068ff",
    paddingHorizontal: 10,
    textAlign: "center",
    minWidth: 150,
  },
});

export default ConversationInfoSheet;
