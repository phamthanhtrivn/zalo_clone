import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import EmojiPicker from "rn-emoji-keyboard";
import { COLORS } from "@/constants/colors";
import CreatePollModal from "./CreatePollModal";

interface SelectedFile {
  uri: string;
  name: string;
  type: string;
}

interface ChatInputProps {
  chatName?: string;
  onSendMessage: (text: string) => void;
  onSendFiles: (files: SelectedFile[]) => void;
  isSelectMode?: boolean;
  selectedMessages?: string[];
  onOpenForwardModal?: () => void;
  onCancelSelect?: () => void;
  isGroup?: boolean;
  conversationId?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  chatName,
  onSendMessage,
  onSendFiles,
  isSelectMode = false,
  selectedMessages = [],
  onOpenForwardModal,
  onCancelSelect,
  isGroup = false,
  conversationId = "",
}) => {
  const [text, setText] = useState("");
  const [showPollModal, setShowPollModal] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const inputRef = useRef<TextInput>(null);

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
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setShowEmoji(false);
    });

    return () => {
      showSub.remove();
    };
  }, []);

  const handleEmojiSelect = (emoji: any) => {
    setText((prev) => prev + emoji.emoji);
  };

  const toggleEmoji = () => {
    Keyboard.dismiss();
    setShowEmoji(true);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

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
        // ✅ FIX deprecated
        mediaTypes: ["images", "videos"],
        allowsMultipleSelection: true,
        selectionLimit: 15,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const newFiles = result.assets.map((asset, index) => {
          const isVideo = asset.type === "video";
          const mimeType =
            asset.mimeType || (isVideo ? "video/mp4" : "image/jpeg");

          const extension = isVideo ? "mp4" : "jpg";
          const fileName =
            asset.fileName || `media_${Date.now()}_${index}.${extension}`;

          return {
            uri: asset.uri.startsWith("file://")
              ? asset.uri
              : `file://${asset.uri}`,
            name: encodeURIComponent(fileName),
            type: mimeType,
          };
        });

        setSelectedFiles((prev) => [...prev, ...newFiles]);
      }
    } catch (err) {
      console.error("Image picking error:", err);
      Alert.alert("Lỗi", "Không thể chọn ảnh. Vui lòng thử lại.");
    }
  };

  const pickDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const newFiles = result.assets.map((asset, index) => {
          const fileName = asset.name || `file_${Date.now()}_${index}`;

          const mimeType = asset.mimeType || "application/octet-stream";

          return {
            uri: asset.uri.startsWith("file://")
              ? asset.uri
              : `file://${asset.uri}`,
            name: fileName,
            type: mimeType,
          };
        });

        setSelectedFiles((prev) => [...prev, ...newFiles]);
      }
    } catch (err) {
      console.error("Document picking error:", err);
      Alert.alert("Lỗi", "Không thể chọn file. Vui lòng thử lại.");
    }
  };

  // ===== SELECT MODE BAR =====
  if (isSelectMode) {
    return (
      <View
        style={{
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-around",
        }}
      >
        <TouchableOpacity onPress={onCancelSelect} style={{ padding: 4 }}>
          <Text style={{ color: "#ef4444", fontWeight: "600", fontSize: 15 }}>
            Hủy
          </Text>
        </TouchableOpacity>

        <Text style={{ fontWeight: "600", fontSize: 15, color: "#1f2937" }}>
          Đã chọn {selectedMessages.length}
        </Text>

        <TouchableOpacity
          onPress={onOpenForwardModal}
          disabled={selectedMessages.length === 0}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            padding: 4,
            opacity: selectedMessages.length === 0 ? 0.5 : 1,
          }}
        >
          <Ionicons name="arrow-redo-outline" size={22} color="#0068ff" />
          <Text style={{ color: "#0068ff", fontWeight: "600", fontSize: 15 }}>
            Tiếp tục
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: "white" }}>
      {/* Preview Bar */}
      {selectedFiles.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{
            maxHeight: 110,
            paddingHorizontal: 10,
            paddingVertical: 10,
            borderTopWidth: 1,
            borderTopColor: "#e5e7eb",
          }}
          contentContainerStyle={{ gap: 12, paddingRight: 20 }}
        >
          {selectedFiles.map((file, index) => (
            <View
              key={index}
              style={{ width: 80, height: 80, position: "relative" }}
            >
              {file.type.startsWith("image/") ? (
                <Image
                  source={{ uri: file.uri }}
                  style={{ width: 80, height: 80, borderRadius: 8 }}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 8,
                    backgroundColor: "#f3f4f6",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: 4,
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                  }}
                >
                  <Ionicons
                    name={
                      file.type.startsWith("video/")
                        ? "play-circle"
                        : "document"
                    }
                    size={32}
                    color="#6b7280"
                  />
                  <Text
                    numberOfLines={1}
                    style={{ fontSize: 9, color: "#6b7280", marginTop: 4 }}
                  >
                    {file.name}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => removeFile(index)}
                style={{
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
                }}
              >
                <Ionicons name="close" size={14} color="white" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Input */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          padding: 8,
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
        }}
      >
        {/* Emoji */}
        <TouchableOpacity onPress={toggleEmoji} style={{ padding: 6 }}>
          <Ionicons name="happy-outline" size={26} color="#6b7280" />
        </TouchableOpacity>

        {/* Input */}
        <TextInput
          ref={inputRef}
          style={{
            flex: 1,
            backgroundColor: "#f3f4f6",
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 8,
            fontSize: 14,
            maxHeight: 100,
          }}
          placeholder={chatName ? `Nhắn tin tới ${chatName}` : "Tin nhắn"}
          value={text}
          onChangeText={setText}
          multiline
          onFocus={() => setShowEmoji(false)}
        />

        {/* Image */}
        <TouchableOpacity onPress={pickImages} style={{ padding: 6 }}>
          <MaterialIcons name="image" size={26} color="#6b7280" />
        </TouchableOpacity>

        {/* File */}
        <TouchableOpacity onPress={pickDocuments} style={{ padding: 6 }}>
          <Ionicons name="attach-outline" size={26} color="#6b7280" />
        </TouchableOpacity>

        {/* Poll (Group only) */}
        {isGroup && (
          <TouchableOpacity 
            onPress={() => setShowPollModal(true)} 
            style={{ padding: 6 }}
          >
            <Ionicons name="bar-chart-outline" size={26} color="#6b7280" />
          </TouchableOpacity>
        )}

        {/* Send */}
        <TouchableOpacity
          onPress={handleSend}
          disabled={!text.trim() && selectedFiles.length === 0}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor:
              text.trim() || selectedFiles.length > 0
                ? COLORS.primary
                : "#e5e7eb",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="send" size={18} color="white" />
        </TouchableOpacity>
      </View>

      {/* Emoji Picker */}
      <EmojiPicker
        open={showEmoji}
        onClose={() => setShowEmoji(false)}
        onEmojiSelected={handleEmojiSelect}
      />

      {/* Create Poll Modal */}
      {isGroup && (
        <CreatePollModal
          visible={showPollModal}
          onClose={() => setShowPollModal(false)}
          conversationId={conversationId}
        />
      )}
    </View>
  );
};

export default ChatInput;
