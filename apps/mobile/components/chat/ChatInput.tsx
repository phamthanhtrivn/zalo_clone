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

interface ChatInputProps {
  chatName?: string;
  onSendMessage: (text: string) => void;
  onSendFile: (file: any) => void;
  isSelectMode?: boolean;
  selectedMessages?: string[];
  onOpenForwardModal?: () => void;
  onCancelSelect?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
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
  const inputRef = useRef<TextInput>(null);

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

    return () => {
      showSub.remove();
    };
  }, []);

  // ✅ FIX: emoji picker mới
  const handleEmojiSelect = (emoji: any) => {
    setText((prev) => prev + emoji.emoji);
  };

  const toggleEmoji = () => {
    Keyboard.dismiss();
    setShowEmoji(true);
  };

  // ✅ FIX: ImagePicker MediaTypeOptions deprecated
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
          <Text style={{ color: "#ef4444", fontWeight: "600", fontSize: 15 }}>Hủy</Text>
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
          <Text style={{ color: "#0068ff", fontWeight: "600", fontSize: 15 }}>Tiếp tục</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: "white" }}>
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
        <TouchableOpacity onPress={pickImage} style={{ padding: 6 }}>
          <MaterialIcons name="image" size={26} color="#6b7280" />
        </TouchableOpacity>

        {/* File */}
        <TouchableOpacity onPress={pickDocument} style={{ padding: 6 }}>
          <Ionicons name="attach-outline" size={26} color="#6b7280" />
        </TouchableOpacity>

        {/* Send */}
        <TouchableOpacity
          onPress={handleSendText}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: text.trim() ? COLORS.primary : "#e5e7eb",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="send" size={18} color="white" />
        </TouchableOpacity>
      </View>

      {/* ✅ NEW Emoji Picker */}
      <EmojiPicker
        open={showEmoji}
        onClose={() => setShowEmoji(false)}
        onEmojiSelected={handleEmojiSelect}
      />
    </View>
  );
};

export default ChatInput;