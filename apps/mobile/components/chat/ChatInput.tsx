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
  // --- STATES ---
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [myRole, setMyRole] = useState<string>("MEMBER");
  const inputRef = useRef<TextInput>(null);

  // --- REDUX DATA ---
  const currentConversation = useAppSelector((state) =>
    state.conversation.conversations?.find(
      (c) => c.conversationId === conversationId,
    ),
  );
  const currentUser = useAppSelector((state) => state.auth.user);

  // --- PERMISSIONS LOGIC (From Tung) ---
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

  // --- ACTIONS ---
  const handleSend = () => {
    if (text.trim()) {
      onSendMessage(text.trim());
      setText("");
    }
    if (selectedFiles.length > 0) {
      onSendFiles(selectedFiles);
      setSelectedFiles([]);
    }
  };

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () =>
      setShowEmoji(false),
    );
    return () => showSub.remove();
  }, []);

  const handleEmojiSelect = (emoji: any) =>
    setText((prev) => prev + emoji.emoji);
  const toggleEmoji = () => {
    Keyboard.dismiss();
    setShowEmoji(true);
  };
  const removeFile = (index: number) =>
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));

  const pickImages = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Quyền truy cập", "Cần quyền truy cập thư viện ảnh.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsMultipleSelection: true,
        selectionLimit: 15,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const newFiles = result.assets.map((asset, index) => ({
          uri: asset.uri.startsWith("file://")
            ? asset.uri
            : `file://${asset.uri}`,
          name: encodeURIComponent(
            asset.fileName || `media_${Date.now()}_${index}.jpg`,
          ),
          type:
            asset.mimeType ||
            (asset.type === "video" ? "video/mp4" : "image/jpeg"),
        }));
        setSelectedFiles((prev) => [...prev, ...newFiles]);
      }
    } catch (err) {
      Alert.alert("Lỗi", "Không thể chọn ảnh.");
    }
  };

  const pickDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        multiple: true,
      });
      if (!result.canceled && result.assets?.length > 0) {
        const newFiles = result.assets.map((asset, index) => ({
          uri: asset.uri.startsWith("file://")
            ? asset.uri
            : `file://${asset.uri}`,
          name: asset.name || `file_${Date.now()}_${index}`,
          type: asset.mimeType || "application/octet-stream",
        }));
        setSelectedFiles((prev) => [...prev, ...newFiles]);
      }
    } catch (err) {
      Alert.alert("Lỗi", "Không thể chọn file.");
    }
  };

  // --- RENDER ---

  // 1. SELECT MODE (Forwarding)
  if (isSelectMode) {
    return (
      <View style={styles.selectBar}>
        <TouchableOpacity onPress={onCancelSelect}>
          <Text style={styles.cancelText}>Hủy</Text>
        </TouchableOpacity>
        <Text style={styles.boldText}>Đã chọn {selectedMessages.length}</Text>
        <TouchableOpacity
          onPress={onOpenForwardModal}
          disabled={selectedMessages.length === 0}
          style={{
            opacity: selectedMessages.length === 0 ? 0.5 : 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
          }}
        >
          <Ionicons
            name="arrow-redo-outline"
            size={22}
            color={COLORS.primary}
          />
          <Text style={[styles.boldText, { color: COLORS.primary }]}>
            Tiếp tục
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 2. MUTED STATE
  if (isMutedByAdmin) {
    return (
      <View style={styles.mutedBar}>
        <Ionicons name="lock-closed-outline" size={16} color="#6b7280" />
        <Text style={styles.mutedText}>
          Chỉ Trưởng/Phó nhóm mới được gửi tin nhắn.
        </Text>
      </View>
    );
  }

  // 3. NORMAL INPUT
  return (
    <View style={{ backgroundColor: "white" }}>
      {/* File Preview Bar */}
      {selectedFiles.length > 0 && (
        <ScrollView
          horizontal
          style={styles.previewScroll}
          contentContainerStyle={{ gap: 12, paddingRight: 20 }}
        >
          {selectedFiles.map((file, index) => (
            <View key={index} style={styles.previewItem}>
              {file.type.startsWith("image/") ? (
                <Image source={{ uri: file.uri }} style={styles.previewImage} />
              ) : (
                <View style={styles.fileIconBox}>
                  <Ionicons
                    name={
                      file.type.startsWith("video/")
                        ? "play-circle"
                        : "document"
                    }
                    size={32}
                    color="#6b7280"
                  />
                  <Text numberOfLines={1} style={styles.fileNameText}>
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

      {/* Main Input Row */}
      <View style={styles.inputRow}>
        <TouchableOpacity onPress={toggleEmoji} style={styles.iconBtn}>
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

        {/* Dynamic Buttons (Send vs Attach) */}
        {text.trim() || selectedFiles.length > 0 ? (
          <TouchableOpacity onPress={handleSend} style={styles.sendBtn}>
            <Ionicons name="send" size={18} color="white" />
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity onPress={pickImages} style={styles.iconBtn}>
              <MaterialIcons name="image" size={26} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity onPress={pickDocuments} style={styles.iconBtn}>
              <Ionicons name="attach-outline" size={26} color="#6b7280" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <EmojiPicker
        open={showEmoji}
        onClose={() => setShowEmoji(false)}
        onEmojiSelected={handleEmojiSelect}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  selectBar: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  cancelText: { color: "#ef4444", fontWeight: "600", fontSize: 15 },
  boldText: { fontWeight: "600", fontSize: 15, color: "#1f2937" },
  mutedBar: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  mutedText: { fontSize: 13, color: "#4b5563", fontWeight: "500" },
  previewScroll: {
    maxHeight: 110,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  previewItem: { width: 80, height: 80, position: "relative" },
  previewImage: { width: 80, height: 80, borderRadius: 8 },
  fileIconBox: {
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
  fileNameText: { fontSize: 9, color: "#6b7280", marginTop: 4 },
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
  iconBtn: { padding: 6 },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
    marginBottom: 2,
  },
});

export default ChatInput;
