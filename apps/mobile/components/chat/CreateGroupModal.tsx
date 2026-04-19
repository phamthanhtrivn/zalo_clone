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
  TextInput,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { conversationService } from "@/services/conversation.service";
import { userService } from "@/services/user.service";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker"; // Khôi phục phần thiếu

interface Props {
  visible: boolean;
  onClose: () => void;
  mode?: "CREATE" | "ADD_MEMBER";
  conversationId?: string;
  excludedIds?: string[];
  onSuccess?: () => void;
}

const CreateGroupModal: React.FC<Props> = ({
  visible,
  onClose,
  mode = "CREATE",
  conversationId,
  excludedIds = [],
  onSuccess,
}) => {
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [groupAvatar, setGroupAvatar] = useState<string | null>(null); // Khôi phục state ảnh
  const [searchText, setSearchText] = useState("");
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isAddMode = mode === "ADD_MEMBER";

  // --- 1. KHÔI PHỤC LOGIC CHỌN ẢNH NHÓM ---
  const pickGroupImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setGroupAvatar(result.assets[0].uri);
    }
  };

  useEffect(() => {
    if (visible) {
      setLoading(true);
      userService
        .getFriends()
        .then((res: any) => {
          const groups = res?.data?.users || [];
          const rawFriends = groups.flatMap((g: any) => g.friends || []);
          const cleanFriends = rawFriends.map((f: any) => ({
            id: f.friendId || f._id,
            name: f.name || f.profile?.name || "Người dùng",
            avatar: f.avatarUrl || f.profile?.avatarUrl || "",
          }));
          setFriends(cleanFriends);
        })
        .finally(() => setLoading(false));
    }
  }, [visible]);

  // --- 2. KHÔI PHỤC LOGIC SẮP XẾP A-Z (Tính năng bổ sung của Tùng) ---
  const filteredFriends = useMemo(() => {
    if (!Array.isArray(friends)) return [];
    return friends
      .filter((f: any) => {
        const isNotExcluded = !excludedIds.includes(f.id);
        const matchesSearch = f.name
          .toLowerCase()
          .includes(searchText.toLowerCase());
        return isNotExcluded && matchesSearch;
      })
      .sort((a, b) => a.name.localeCompare(b.name)); // Sắp xếp tên
  }, [friends, searchText, excludedIds]);

  const toggleSelect = (item: any) => {
    const isSelected = selectedFriends.some((f) => f.id === item.id);
    setSelectedFriends((prev) =>
      isSelected ? prev.filter((f) => f.id !== item.id) : [...prev, item],
    );
  };

  const handleAction = async () => {
    const minRequired = isAddMode ? 1 : 2;
    if (selectedFriends.length < minRequired) {
      return Alert.alert("Thông báo", `Chọn ít nhất ${minRequired} thành viên`);
    }

    setSubmitting(true);
    try {
      if (isAddMode && conversationId) {
        await conversationService.addMembers(
          conversationId,
          selectedFriends.map((f) => f.id),
        );
        Alert.alert("Thành công", "Đã thêm thành viên");
      } else {
        // TẠO NHÓM: Hỗ trợ cả file ảnh nếu có
        const payload = {
          name: groupName.trim() || undefined,
          memberIds: selectedFriends.map((f) => f.id),
          avatar: groupAvatar, // Sẵn sàng cho backend xử lý
        };
        const res: any = await conversationService.createGroup(payload);
        const newId =
          res?.data?.data?.conversation?._id || res?.data?.conversation?._id;
        if (newId) {
          handleClose();
          setTimeout(() => router.push(`/private/chat/${newId}`), 300);
          return;
        }
      }
      onSuccess?.();
      handleClose();
    } catch (error) {
      Alert.alert("Lỗi", "Thao tác thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setGroupName("");
    setGroupAvatar(null);
    setSearchText("");
    setSelectedFriends([]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.headerBtnText}>Hủy</Text>
          </TouchableOpacity>
          <View style={{ alignItems: "center" }}>
            <Text style={styles.headerTitle}>
              {isAddMode ? "Thêm thành viên" : "Nhóm mới"}
            </Text>
            <Text style={styles.headerSubTitle}>
              Đã chọn: {selectedFriends.length}
            </Text>
          </View>
          <TouchableOpacity onPress={handleAction} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.headerBtnText}>
                {isAddMode ? "Thêm" : "Tạo"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.topSection}>
          {!isAddMode && (
            <View style={styles.groupInputRow}>
              <TouchableOpacity
                onPress={pickGroupImage}
                style={styles.cameraIcon}
              >
                {groupAvatar ? (
                  <Image
                    source={{ uri: groupAvatar }}
                    style={styles.selectedAvatar}
                  />
                ) : (
                  <Ionicons name="camera" size={22} color="#666" />
                )}
              </TouchableOpacity>
              <TextInput
                style={styles.inputName}
                placeholder="Đặt tên nhóm"
                value={groupName}
                onChangeText={setGroupName}
              />
            </View>
          )}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm tên hoặc số điện thoại"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
        </View>

        {/* DANH SÁCH BẠN BÈ */}
        {loading ? (
          <ActivityIndicator style={{ flex: 1 }} color="#0068ff" />
        ) : (
          <FlatList
            data={filteredFriends}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isSelected = selectedFriends.some((f) => f.id === item.id);
              return (
                <TouchableOpacity
                  style={styles.friendRow}
                  onPress={() => toggleSelect(item)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      isSelected && styles.checkboxSelected,
                    ]}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color="white" />
                    )}
                  </View>
                  <Image
                    source={{
                      uri: item.avatar || "https://via.placeholder.com/150",
                    }}
                    style={styles.avatar}
                  />
                  <Text style={styles.friendName}>{item.name}</Text>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  header: {
    height: 56,
    backgroundColor: "#0068ff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerBtnText: { color: "white", fontSize: 16, fontWeight: "500" },
  headerTitle: { color: "white", fontSize: 17, fontWeight: "bold" },
  headerSubTitle: { color: "white", fontSize: 12, opacity: 0.8 },
  topSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  groupInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cameraIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  selectedAvatar: { width: 50, height: 50 },
  inputName: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f2f5",
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 40,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15 },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingHorizontal: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: { backgroundColor: "#0068ff", borderColor: "#0068ff" },
  avatar: { width: 45, height: 45, borderRadius: 22.5, marginLeft: 16 },
  friendName: { marginLeft: 12, fontSize: 16 },
});

export default CreateGroupModal;
