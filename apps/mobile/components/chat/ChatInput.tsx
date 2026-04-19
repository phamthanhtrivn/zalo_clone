import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Alert,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import EmojiPicker from "rn-emoji-keyboard";
import { COLORS } from "@/constants/colors";
import { useAppSelector } from "@/store/store";
import { conversationService } from "@/services/conversation.service";

interface SelectedFile {
  uri: string;
  name: string;
  type: string;
}

interface ChatInputProps {
  conversationId: string;
  chatName?: string;
  onSendMessage: (text: string) => void;
  onSendFiles: (files: SelectedFile[]) => void;
  isSelectMode?: boolean;
  selectedMessages?: string[];
  onOpenForwardModal?: () => void;
  onCancelSelect?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  conversationId,
  chatName,
  onSendMessage,
  onSendFiles,
  isSelectMode = false,
  selectedMessages = [],
  onOpenForwardModal,
  onCancelSelect,
}) => {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [myRole, setMyRole] = useState<string>("MEMBER");
  const inputRef = useRef<TextInput>(null);

  // --- LOGIC PHÂN QUYỀN (Từ nhánh HEAD) ---
  const currentConversation = useAppSelector((state) =>
    state.conversation.items?.find((c) => c.conversationId === conversationId),
  );
  const currentUser = useAppSelector((state) => state.auth.user);

  const isGroup = currentConversation?.type === "GROUP";
  const allowSend =
    currentConversation?.group?.allowMembersSendMessages !== false;

  useEffect(() => {
    if (isGroup && conversationId && currentUser?.userId) {
      conversationService
        .getListMembers(conversationId)
        .then((res: any) => {
          if (res?.success) {
            const me = res.data.find(
              (m: any) => String(m.userId) === String(currentUser.userId),
            );
            if (me) setMyRole(me.role);
          }
        })
        .catch((err) => console.log("Lỗi lấy role ChatInput", err));
    }
  }, [isGroup, conversationId, currentUser?.userId]);

  const isManager = myRole === "OWNER" || myRole === "ADMIN";
  const isMutedByAdmin = isGroup && !allowSend && !isManager;

  // --- HÀM XỬ LÝ GỬI (Gộp logic 2 nhánh) ---
  const handleSend = () => {
    if (text.trim()) {
      onSendMessage(text.trim());
      setText("");
    }

    if (selectedFiles.length > 0) {
      onSendFiles(selectedFiles);
      setSelectedFiles([]);
    }
    Keyboard.dismiss();
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // --- CHỌN ẢNH/VIDEO (Từ nhánh KhongVanTam) ---
  const pickImages = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Quyền truy cập",
          "Cần quyền truy cập thư viện ảnh để chọn ảnh.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsMultipleSelection: true,
        selectionLimit: 15,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const newFiles = result.assets.map((asset, index) => {
          const isVideo = asset.type === "video";
          const fileName = asset.fileName || `media_${Date.now()}_${index}`;
          return {
            uri: asset.uri.startsWith("file://")
              ? asset.uri
              : `file://${asset.uri}`,
            name: encodeURIComponent(fileName),
            type: asset.mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
          };
        });
        setSelectedFiles((prev) => [...prev, ...newFiles]);
      }
    } catch (err) {
      Alert.alert("Lỗi", "Không thể chọn ảnh.");
    }
  };

  // --- CHỌN FILE TÀI LIỆU (Từ nhánh KhongVanTam) ---
  const pickDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        multiple: true,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const newFiles = result.assets.map((asset, index) => ({
          uri: asset.uri,
          name: asset.name || `file_${Date.now()}_${index}`,
          type: asset.mimeType || "application/octet-stream",
        }));
        setSelectedFiles((prev) => [...prev, ...newFiles]);
      }
    } catch (err) {
      Alert.alert("Lỗi", "Không thể chọn file.");
    }
  };

  // --- RENDER GIAO DIỆN ---

  // 1. SELECT MODE
  if (isSelectMode) {
    return (
      <View style={styles.selectModeContainer}>
        <TouchableOpacity onPress={onCancelSelect} style={{ padding: 4 }}>
          <Text style={styles.cancelText}>Hủy</Text>
        </TouchableOpacity>
        <Text style={styles.selectCountText}>
          Đã chọn {selectedMessages.length}
        </Text>
        <TouchableOpacity
          onPress={onOpenForwardModal}
          disabled={selectedMessages.length === 0}
          style={[
            styles.forwardBtn,
            { opacity: selectedMessages.length === 0 ? 0.5 : 1 },
          ]}
        >
          <Ionicons name="arrow-redo-outline" size={22} color="#0068ff" />
          <Text style={styles.forwardText}>Tiếp tục</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 2. BỊ KHÓA CHAT (Logic HEAD)
  if (isMutedByAdmin) {
    return (
      <View style={styles.mutedContainer}>
        <Ionicons
          name="lock-closed-outline"
          size={16}
          color="#6b7280"
          style={{ marginRight: 6 }}
        />
        <Text style={styles.mutedText}>
          Chỉ Trưởng/Phó nhóm mới được gửi tin nhắn.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: "white" }}>
      {/* Preview Bar (Từ KhongVanTam) */}
      {selectedFiles.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.previewScroll}
          contentContainerStyle={{ gap: 12, paddingHorizontal: 10 }}
        >
          {selectedFiles.map((file, index) => (
            <View key={index} style={styles.previewItem}>
              {file.type.startsWith("image/") ? (
                <Image
                  source={{ uri: file.uri }}
                  style={styles.previewImage}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.previewFileIcon}>
                  <Ionicons
                    name={
                      file.type.startsWith("video/")
                        ? "play-circle"
                        : "document"
                    }
                    size={32}
                    color="#6b7280"
                  />
                  <Text numberOfLines={1} style={styles.previewFileName}>
                    {file.name}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => removeFile(index)}
                style={styles.removeFileBtn}
              >
                <Ionicons name="close" size={14} color="white" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Input Row */}
      <View style={styles.inputRow}>
        <TouchableOpacity
          onPress={() => {
            Keyboard.dismiss();
            setShowEmoji(true);
          }}
          style={{ padding: 6 }}
        >
          <Ionicons name="happy-outline" size={26} color="#6b7280" />
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          style={styles.textInput}
          placeholder={chatName ? `Nhắn tin tới ${chatName}` : "Tin nhắn"}
          value={text}
          onChangeText={setText}
          multiline
          onFocus={() => setShowEmoji(false)}
        />

        <TouchableOpacity onPress={pickImages} style={{ padding: 6 }}>
          <MaterialIcons name="image" size={26} color="#6b7280" />
        </TouchableOpacity>

        <TouchableOpacity onPress={pickDocuments} style={{ padding: 6 }}>
          <Ionicons name="attach-outline" size={26} color="#6b7280" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSend}
          disabled={!text.trim() && selectedFiles.length === 0}
          style={[
            styles.sendBtn,
            {
              backgroundColor:
                text.trim() || selectedFiles.length > 0
                  ? COLORS.primary
                  : "#e5e7eb",
            },
          ]}
        >
          <Ionicons name="send" size={18} color="white" />
        </TouchableOpacity>
      </View>

      <EmojiPicker
        open={showEmoji}
        onClose={() => setShowEmoji(false)}
        onEmojiSelected={(emoji: any) => setText((prev) => prev + emoji.emoji)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  selectModeContainer: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  cancelText: { color: "#ef4444", fontWeight: "600", fontSize: 15 },
  selectCountText: { fontWeight: "600", fontSize: 15, color: "#1f2937" },
  forwardBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 4,
  },
  forwardText: { color: "#0068ff", fontWeight: "600", fontSize: 15 },
  mutedContainer: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  mutedText: { fontSize: 13, color: "#4b5563", fontWeight: "500" },
  previewScroll: {
    maxHeight: 110,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  previewItem: { width: 80, height: 80, position: "relative" },
  previewImage: { width: 80, height: 80, borderRadius: 8 },
  previewFileIcon: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  previewFileName: { fontSize: 9, color: "#6b7280", marginTop: 4 },
  removeFileBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    width: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  textInput: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
    maxHeight: 100,
    marginHorizontal: 4,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
    marginBottom: 2,
  },
});

export default ChatInput;
