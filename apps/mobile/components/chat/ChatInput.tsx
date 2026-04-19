import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import EmojiPicker from "rn-emoji-keyboard";
import { COLORS } from "@/constants/colors";
import { useAppSelector } from "@/store/store"; // Bổ sung Redux
import { conversationService } from "@/services/conversation.service"; // Bổ sung Service

interface ChatInputProps {
  conversationId: string;
  chatName?: string;
  onSendMessage: (text: string) => void;
  onSendFile: (file: any) => void;
  isSelectMode?: boolean;
  selectedMessages?: string[];
  onOpenForwardModal?: () => void;
  onCancelSelect?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  conversationId,
  chatName,
  onSendMessage,
  onSendFile,
  isSelectMode = false,
  selectedMessages = [],
  onOpenForwardModal,
  onCancelSelect,
}) => {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [myRole, setMyRole] = useState<string>("MEMBER"); // State lưu quyền
  const inputRef = useRef<TextInput>(null);

  // --- LẤY THÔNG TIN HỘI THOẠI & QUYỀN TỪ REDUX ---
  const currentConversation = useAppSelector((state) =>
    state.conversation.items?.find((c) => c.conversationId === conversationId),
  );
  const currentUser = useAppSelector((state) => state.auth.user);

  const isGroup = currentConversation?.type === "GROUP";
  const allowSend =
    currentConversation?.group?.allowMembersSendMessages !== false;

  // Lấy role của mình khi vào nhóm
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

  // --- HÀM XỬ LÝ SỰ KIỆN ---
  const handleSendText = () => {
    if (text.trim()) {
      onSendMessage(text.trim());
      setText("");
    }
  };

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setShowEmoji(false);
    });
    return () => showSub.remove();
  }, []);

  const handleEmojiSelect = (emoji: any) => {
    setText((prev) => prev + emoji.emoji);
  };

  const toggleEmoji = () => {
    Keyboard.dismiss();
    setShowEmoji(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      onSendFile({
        uri: asset.uri,
        name: asset.fileName || "media.jpg",
        type: asset.mimeType || "image/jpeg",
      });
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        onSendFile({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || "application/octet-stream",
        });
      }
    } catch (err) {
      console.error("Document picking error", err);
    }
  };

  // --- RENDER GIAO DIỆN ---

  // 1. NẾU ĐANG CHỌN TIN NHẮN (SELECT MODE)
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

  // 2. NẾU BỊ KHÓA CHAT
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

  // 3. NẾU ĐƯỢC CHAT BÌNH THƯỜNG
  return (
    <View style={{ backgroundColor: "white" }}>
      <View style={styles.inputContainer}>
        {/* Emoji */}
        <TouchableOpacity onPress={toggleEmoji} style={{ padding: 6 }}>
          <Ionicons name="happy-outline" size={26} color="#6b7280" />
        </TouchableOpacity>

        {/* Text Input */}
        <TextInput
          ref={inputRef}
          style={styles.textInput}
          placeholder={chatName ? `Nhắn tin tới ${chatName}` : "Tin nhắn"}
          value={text}
          onChangeText={setText}
          multiline
          onFocus={() => setShowEmoji(false)}
        />

        {/* Nút gửi (Nếu có chữ) hoặc Image/File (Nếu không có chữ) */}
        {text.trim().length > 0 ? (
          <TouchableOpacity onPress={handleSendText} style={styles.sendBtn}>
            <Ionicons name="send" size={18} color="white" />
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={pickImage} style={{ padding: 6 }}>
              <MaterialIcons name="image" size={26} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity onPress={pickDocument} style={{ padding: 6 }}>
              <Ionicons name="attach-outline" size={26} color="#6b7280" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Emoji Picker Modal */}
      <EmojiPicker
        open={showEmoji}
        onClose={() => setShowEmoji(false)}
        onEmojiSelected={handleEmojiSelect}
      />
    </View>
  );
};

// --- STYLES ---
const styles = {
  selectModeContainer: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row" as "row",
    alignItems: "center" as "center",
    justifyContent: "space-around" as "space-around",
  },
  cancelText: { color: "#ef4444", fontWeight: "600" as "600", fontSize: 15 },
  selectCountText: {
    fontWeight: "600" as "600",
    fontSize: 15,
    color: "#1f2937",
  },
  forwardBtn: {
    flexDirection: "row" as "row",
    alignItems: "center" as "center",
    gap: 6,
    padding: 4,
  },
  forwardText: { color: "#0068ff", fontWeight: "600" as "600", fontSize: 15 },

  mutedContainer: {
    flexDirection: "row" as "row",
    backgroundColor: "#f3f4f6",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: "center" as "center",
    justifyContent: "center" as "center",
  },
  mutedText: { fontSize: 13, color: "#4b5563", fontWeight: "500" as "500" },

  inputContainer: {
    flexDirection: "row" as "row",
    alignItems: "flex-end" as "flex-end",
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
    backgroundColor: COLORS.primary,
    alignItems: "center" as "center",
    justifyContent: "center" as "center",
    marginLeft: 4,
    marginBottom: 2,
  },
};

export default ChatInput;
