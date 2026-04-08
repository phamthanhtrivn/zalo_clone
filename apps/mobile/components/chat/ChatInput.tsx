import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, Alert } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { COLORS } from "@/constants/colors";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onSendFile: (file: any) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, onSendFile }) => {
  const [text, setText] = useState("");

  const handleSendText = () => {
    if (text.trim()) {
      onSendMessage(text.trim());
      setText("");
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
        // Construct file object for message.service
        const file = {
            uri: result.assets[0].uri,
            name: result.assets[0].fileName || "image.jpg",
            type: result.assets[0].mimeType || "image/jpeg",
        };
        onSendFile(file);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        const file = {
            uri: result.assets[0].uri,
            name: result.assets[0].name,
            type: result.assets[0].mimeType || "application/octet-stream",
        };
        onSendFile(file);
      }
    } catch (err) {
      console.error("Document picking error", err);
    }
  };

  return (
    <View className="flex-row items-end p-2 bg-white border-t border-gray-200">
      <TouchableOpacity className="p-2" onPress={pickDocument}>
        <Ionicons name="add-circle-outline" size={28} color={COLORS.primary} />
      </TouchableOpacity>
      
      <TouchableOpacity className="p-2" onPress={pickImage}>
        <MaterialIcons name="image" size={28} color={COLORS.primary} />
      </TouchableOpacity>

      <TextInput
        className="flex-1 bg-gray-100 rounded-2xl px-4 py-2 mx-1 text-base max-h-24"
        placeholder="Tin nhắn"
        value={text}
        onChangeText={setText}
        multiline
        textAlignVertical="center"
      />

      <TouchableOpacity 
        className={`p-2 rounded-full ${text.trim() ? "bg-primary" : ""}`}
        onPress={handleSendText}
        disabled={!text.trim()}
      >
        <Ionicons 
            name={text.trim() ? "send" : "mic-outline"} 
            size={24} 
            color={text.trim() ? "white" : "gray"} 
        />
      </TouchableOpacity>
    </View>
  );
};

export default ChatInput;
