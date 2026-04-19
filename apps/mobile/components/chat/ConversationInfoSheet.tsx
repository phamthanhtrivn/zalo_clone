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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
import CreateGroupModal from "./CreateGroupModal";
import * as ImagePicker from "expo-image-picker";

const { width, height } = Dimensions.get("window");

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

  const [medias, setMedias] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedMedia, setExpandedMedia] = useState(true);
  const [expandedFile, setExpandedFile] = useState(false);
  const [expandedMembers, setExpandedMembers] = useState(true);
  const [showMuteOptions, setShowMuteOptions] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [isAddMemberVisible, setIsAddMemberVisible] = useState(false);

  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [expandedRequests, setExpandedRequests] = useState(true);
  const [expandedManagement, setExpandedManagement] = useState(false);
  const [membersRefreshKey, setMembersRefreshKey] = useState(0);

  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(conversation?.name || "");

  const isGroup = conversation?.type === "GROUP";
  const currentConversation =
    useAppSelector((state) =>
      state.conversation.items?.find(
        (c) => c.conversationId === conversation?.conversationId,
      ),
    ) || conversation;

  // --- FIX CỐT LÕI: LOCAL STATE CHO SWITCH ĐỂ TRÁNH BỊ GIẬT ---
  const [localSettings, setLocalSettings] = useState({
    allowMembersInvite: true,
    allowMembersSendMessages: true,
    approvalRequired: false,
  });

  // Đồng bộ Local State với Redux khi Component load hoặc Redux đổi
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

  const isPinned = currentConversation?.pinned;
  const isMuted =
    currentConversation?.muted &&
    (!currentConversation?.mutedUntil ||
      new Date(currentConversation.mutedUntil).getTime() > Date.now());

  const myMemberInfo = members.find((m) => m.userId === currentUserId);
  const isOwner = myMemberInfo?.role === "OWNER";
  const isAdmin = myMemberInfo?.role === "ADMIN";

  // --- LOGIC FUNCTIONS ---

  const handlePin = async () => {
    const newStatus = !isPinned;
    dispatch(
      updateConversationSetting({
        conversationId: conversation.conversationId,
        pinned: newStatus,
      }),
    );
    try {
      await conversationService.updateConversationSetting?.(
        conversation.conversationId,
        { pinned: newStatus },
      );
    } catch (err) {
      dispatch(
        updateConversationSetting({
          conversationId: conversation.conversationId,
          pinned: !newStatus,
        }),
      );
    }
  };

  const handleMute = async (duration: number) => {
    let mutedUntil: string | null = null;
    if (duration === -1) mutedUntil = "infinite";
    else if (duration === -2) {
      const d = new Date();
      d.setHours(8, 0, 0, 0);
      if (new Date() > d) d.setDate(d.getDate() + 1);
      mutedUntil = d.toISOString();
    } else if (duration > 0) {
      mutedUntil = new Date(Date.now() + duration * 60 * 1000).toISOString();
    }

    const isUnmuting = duration === 0;
    dispatch(
      updateConversationSetting({
        conversationId: conversation.conversationId,
        muted: !isUnmuting,
        mutedUntil,
      }),
    );
    setShowMuteOptions(false);

    try {
      await conversationService.updateConversationSetting?.(
        conversation.conversationId,
        { muted: !isUnmuting, mutedUntil: isUnmuting ? null : mutedUntil },
      );
    } catch (err) {
      dispatch(
        updateConversationSetting({
          conversationId: conversation.conversationId,
          muted: isMuted,
          mutedUntil: currentConversation.mutedUntil,
        }),
      );
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
        ]);
        if (mediaRes.success) {
          setMedias(mediaRes.data.images_videos || []);
          setFiles(mediaRes.data.files || []);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [visible, conversation?.conversationId]);

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

  const handleMemberAction = (target: any) => {
    if (target.userId === currentUserId) return;
    const options: any[] = [
      {
        text: "Xem trang cá nhân",
        onPress: () => router.push(`/user/${target.userId}`),
      },
      {
        text: "Nhắn tin riêng",
        onPress: async () => {
          const res: any = await conversationService.getOrCreateDirect(
            target.userId,
          );
          const cid = res?.data?._id || res?._id;
          if (cid) {
            onClose();
            router.push(`/private/chat/${cid}`);
          }
        },
      },
    ];
    if (isOwner) {
      options.push({
        text: target.role === "ADMIN" ? "Gỡ phó nhóm" : "Bổ nhiệm phó nhóm",
        onPress: () =>
          updateRole(target, target.role === "ADMIN" ? "MEMBER" : "ADMIN"),
      });
    }
    if (isOwner || (isAdmin && target.role === "MEMBER")) {
      options.push({
        text: "Mời ra khỏi nhóm",
        style: "destructive",
        onPress: () => confirmRemoveMember(target),
      });
    }
    Alert.alert("Tùy chọn", target.name, [
      ...options,
      { text: "Hủy", style: "cancel" },
    ]);
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
    Alert.alert("Giải tán", "Xóa toàn bộ nhóm?", [
      { text: "Hủy" },
      {
        text: "Giải tán",
        style: "destructive",
        onPress: async () => {
          const res: any = await conversationService.deleteGroup(
            conversation.conversationId,
          );
          if (res.success) {
            onClose();
            dispatch(removeConversation(conversation.conversationId));
            router.replace("/private/chat");
          }
        },
      },
    ]);
  };

  const handleLeaveGroup = () => {
    Alert.alert("Rời nhóm", "Bạn muốn rời nhóm?", [
      { text: "Hủy" },
      {
        text: "Rời nhóm",
        style: "destructive",
        onPress: async () => {
          const res: any = await conversationService.leaveGroup(
            conversation.conversationId,
          );
          if (res.success) {
            onClose();
            dispatch(removeConversation(conversation.conversationId));
            router.replace("/private/chat");
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

  const uploadAvatar = async (selectedFile: ImagePicker.ImagePickerAsset) => {
    try {
      setLoading(true); // Nếu bạn có state loading
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

  // Kiểm tra quyền hiển thị Quick Actions
  const canInvite = localSettings.allowMembersInvite || isOwner || isAdmin;

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
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Thông tin hội thoại</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
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
                onPress={() =>
                  canInvite
                    ? setIsAddMemberVisible(true)
                    : Alert.alert(
                        "Thông báo",
                        "Trưởng nhóm đã tắt quyền mời thành viên.",
                      )
                }
              />
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
                        <Image
                          source={{
                            uri:
                              m.avatarUrl || "https://via.placeholder.com/150",
                          }}
                          style={styles.memberAvatar}
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
            <View style={{ height: 60 }} />
          </ScrollView>
        </Pressable>
      </Pressable>

      <Modal transparent visible={showMuteOptions} animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowMuteOptions(false)}
        >
          <View style={styles.muteSheet}>
            <Text style={styles.muteTitle}>Tắt thông báo</Text>
            {[
              { label: "Trong 1 giờ", d: 60 },
              { label: "Trong 4 giờ", d: 240 },
              { label: "Đến 8:00 AM", d: -2 },
              { label: "Đến khi mở lại", d: -1 },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.label}
                style={styles.muteOpt}
                onPress={() => handleMute(opt.d)}
              >
                <Text>{opt.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setShowMuteOptions(false)}
              style={styles.muteCancel}
            >
              <Text style={{ color: "#ef4444", fontWeight: "600" }}>Hủy</Text>
            </TouchableOpacity>
          </View>
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
