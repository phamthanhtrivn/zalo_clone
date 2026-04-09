import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Keyboard,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { COLORS } from "@/constants/colors";
import { REACTION_EMOJIS, EMOJI_MAP } from "@/constants/emoji.constant";

// Common emojis for the picker
const COMMON_EMOJIS = [
  "😀","😂","🥰","😍","😎","🤩","😅","😭","😡","🤔",
  "👍","👎","❤️","🔥","🎉","🙏","💯","✨","😊","🥳",
  "😢","😤","🤣","😱","🤗","😏","😴","🤝","👏","💪",
  "🌟","🎊","🍀","🌈","💫","🎯","💡","🚀","💎","🌺",
];

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

  const handleEmojiPress = (emoji: string) => {
    setText((prev) => prev + emoji);
  };

  const toggleEmoji = () => {
    if (!showEmoji) {
      Keyboard.dismiss();
    } else {
      inputRef.current?.focus();
    }
    setShowEmoji((v) => !v);
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

  // ===== SELECT MODE BAR =====
  if (isSelectMode) {
    return (
      <View
        style={{
          backgroundColor: "white",
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ fontSize: 14, color: "#374151" }}>
          Đã chọn{" "}
          <Text style={{ fontWeight: "700", color: "#0068ff" }}>
            {selectedMessages.length}
          </Text>{" "}
          tin nhắn
        </Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity
            onPress={onOpenForwardModal}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: "#0068ff",
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
            }}
          >
            <MaterialIcons name="forward" size={16} color="white" />
            <Text style={{ color: "white", fontSize: 13, fontWeight: "600" }}>
              Chuyển tiếp
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onCancelSelect}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: "#d1d5db",
            }}
          >
            <Text style={{ color: "#374151", fontSize: 13 }}>Hủy</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: "white" }}>
      {/* Main input row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          paddingHorizontal: 8,
          paddingVertical: 6,
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          gap: 4,
        }}
      >
        {/* Emoji toggle */}
        <TouchableOpacity
          onPress={toggleEmoji}
          style={{ padding: 6, justifyContent: "center" }}
        >
          <Ionicons
            name={showEmoji ? "keypad-outline" : "happy-outline"}
            size={26}
            color={showEmoji ? COLORS.primary : "#6b7280"}
          />
        </TouchableOpacity>

        {/* Text input */}
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
            color: "#111",
          }}
          placeholder={chatName ? `Nhắn tin tới ${chatName}` : "Tin nhắn"}
          placeholderTextColor="#9ca3af"
          value={text}
          onChangeText={setText}
          multiline
          textAlignVertical="center"
          onFocus={() => setShowEmoji(false)}
        />

        {/* Image picker */}
        <TouchableOpacity onPress={pickImage} style={{ padding: 6 }}>
          <MaterialIcons name="image" size={26} color="#6b7280" />
        </TouchableOpacity>

        {/* File picker */}
        <TouchableOpacity onPress={pickDocument} style={{ padding: 6 }}>
          <Ionicons name="attach-outline" size={26} color="#6b7280" />
        </TouchableOpacity>

        {/* Send button */}
        <TouchableOpacity
          onPress={handleSendText}
          disabled={!text.trim()}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: text.trim() ? COLORS.primary : "#e5e7eb",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={text.trim() ? "send" : "mic-outline"}
            size={18}
            color={text.trim() ? "white" : "#9ca3af"}
          />
        </TouchableOpacity>
      </View>

      {/* Emoji picker panel */}
      {showEmoji && (
        <View
          style={{
            height: 220,
            backgroundColor: "white",
            borderTopWidth: 1,
            borderTopColor: "#f3f4f6",
          }}
        >
          <ScrollView contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", padding: 8 }}>
            {COMMON_EMOJIS.map((emoji, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => handleEmojiPress(emoji)}
                style={{
                  width: "12.5%",
                  aspectRatio: 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 26 }}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default ChatInput;
