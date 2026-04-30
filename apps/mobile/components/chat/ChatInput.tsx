import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Alert,
  ScrollView,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import EmojiPicker from "rn-emoji-keyboard";
import { Audio } from "expo-av";
import { COLORS } from "@/constants/colors";

interface SelectedFile {
  uri: string;
  name: string;
  type: string;
}

interface RecordedVoice {
  uri: string;
  name: string;
  type: string;
  durationMs: number;
}

interface ChatInputProps {
  chatName?: string;
  onSendMessage: (text: string) => void;
  onSendFiles: (files: SelectedFile[]) => void;
  onSendVoiceAudio: (voice: RecordedVoice) => Promise<void> | void;
  isSelectMode?: boolean;
  selectedMessages?: string[];
  onOpenForwardModal?: () => void;
  onCancelSelect?: () => void;
}

type VoiceMode = "audio";

const formatVoiceDuration = (durationMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

const ChatInput: React.FC<ChatInputProps> = ({
  chatName,
  onSendMessage,
  onSendFiles,
  onSendVoiceAudio,
  isSelectMode = false,
  selectedMessages = [],
  onOpenForwardModal,
  onCancelSelect,
}) => {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [voiceMode] = useState<VoiceMode>("audio");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [recordedVoice, setRecordedVoice] = useState<RecordedVoice | null>(
    null,
  );
  const [isSubmittingVoice, setIsSubmittingVoice] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

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
      setVoiceModalVisible(false);
    });

    return () => {
      showSub.remove();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        void recordingRef.current.stopAndUnloadAsync().catch(() => undefined);
      }
    };
  }, []);

  const handleEmojiSelect = (emoji: any) => {
    setText((prev) => prev + emoji.emoji);
  };

  const toggleEmoji = () => {
    Keyboard.dismiss();
    setVoiceModalVisible(false);
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

  const openVoiceModal = () => {
    Keyboard.dismiss();
    setShowEmoji(false);
    setVoiceModalVisible(true);
  };

  const closeVoiceModal = () => {
    if (isRecording) return;
    setVoiceModalVisible(false);
    setRecordedVoice(null);
    setRecordingDurationMs(0);
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Quyền microphone", "Cần cấp quyền microphone để ghi âm.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      recordingRef.current = recording;

      recording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording) {
          setRecordingDurationMs(status.durationMillis || 0);
        }
      });

      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      await recording.startAsync();
      setRecordedVoice(null);
      setRecordingDurationMs(0);
      setIsRecording(true);
    } catch (error) {
      console.error("Start recording error:", error);
      Alert.alert("Lỗi", "Không thể bắt đầu ghi âm.");
    }
  };

  const stopRecording = async () => {
    const recording = recordingRef.current;
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const status = await recording.getStatusAsync();
      const uri = recording.getURI();

      if (uri) {
        setRecordedVoice({
          uri,
          name: `voice_${Date.now()}.m4a`,
          type: "audio/m4a",
          durationMs: status.durationMillis || recordingDurationMs,
        });
      }
    } catch (error) {
      console.error("Stop recording error:", error);
      Alert.alert("Lỗi", "Không thể dừng ghi âm.");
    } finally {
      recordingRef.current = null;
      setIsRecording(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      await stopRecording();
      return;
    }

    await startRecording();
  };

  const handleSendVoice = async () => {
    if (!recordedVoice) return;

    try {
      setIsSubmittingVoice(true);
      await onSendVoiceAudio(recordedVoice);
      setRecordedVoice(null);
      setRecordingDurationMs(0);
      setVoiceModalVisible(false);
    } catch (error) {
      console.error("Send voice error:", error);
      Alert.alert("Lỗi", "Không thể gửi bản ghi âm.");
    } finally {
      setIsSubmittingVoice(false);
    }
  };

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

      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          padding: 8,
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
        }}
      >
        <TouchableOpacity onPress={toggleEmoji} style={{ padding: 6 }}>
          <Ionicons name="happy-outline" size={26} color="#6b7280" />
        </TouchableOpacity>

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
          onFocus={() => {
            setShowEmoji(false);
            setVoiceModalVisible(false);
          }}
        />

        <TouchableOpacity onPress={pickImages} style={{ padding: 6 }}>
          <MaterialIcons name="image" size={26} color="#6b7280" />
        </TouchableOpacity>

        <TouchableOpacity onPress={pickDocuments} style={{ padding: 6 }}>
          <Ionicons name="attach-outline" size={26} color="#6b7280" />
        </TouchableOpacity>

        <TouchableOpacity onPress={openVoiceModal} style={{ padding: 6 }}>
          <Ionicons name="mic-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>

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

      <EmojiPicker
        open={showEmoji}
        onClose={() => setShowEmoji(false)}
        onEmojiSelected={handleEmojiSelect}
      />

      <Modal
        visible={voiceModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeVoiceModal}
      >
        <Pressable
          onPress={closeVoiceModal}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.2)",
            justifyContent: "flex-end",
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "white",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 24,
              paddingTop: 24,
              paddingBottom: 36,
              minHeight: 360,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#111" }}>
                Gửi bản ghi âm
              </Text>
              <TouchableOpacity onPress={closeVoiceModal} disabled={isRecording}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text
              style={{
                textAlign: "center",
                color: "#4b5563",
                marginTop: 28,
                fontSize: 16,
              }}
            >
              {isRecording
                ? "Đang ghi âm..."
                : recordedVoice
                  ? `Đã ghi xong ${formatVoiceDuration(recordedVoice.durationMs)}`
                  : "Bấm hoặc bấm giữ để ghi âm"}
            </Text>

            <View style={{ alignItems: "center", marginTop: 28 }}>
              <TouchableOpacity
                onPress={toggleRecording}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: isRecording ? "#ef4444" : COLORS.primary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name={isRecording ? "stop" : "mic"}
                  size={42}
                  color="white"
                />
              </TouchableOpacity>
            </View>

            <Text
              style={{
                textAlign: "center",
                fontSize: 28,
                fontWeight: "700",
                color: "#111827",
                marginTop: 24,
              }}
            >
              {formatVoiceDuration(
                recordedVoice?.durationMs || recordingDurationMs,
              )}
            </Text>

            <View
              style={{
                flexDirection: "row",
                marginTop: 30,
                gap: 12,
              }}
            >
              <TouchableOpacity
                disabled={isRecording || isSubmittingVoice}
                onPress={() => {
                  setRecordedVoice(null);
                  setRecordingDurationMs(0);
                }}
                style={{
                  flex: 1,
                  borderRadius: 18,
                  paddingVertical: 14,
                  alignItems: "center",
                  backgroundColor: "#f3f4f6",
                  opacity: !recordedVoice || isSubmittingVoice ? 0.5 : 1,
                }}
              >
                <Text style={{ fontWeight: "600", color: "#374151" }}>
                  Ghi lại
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={!recordedVoice || isRecording || isSubmittingVoice}
                onPress={handleSendVoice}
                style={{
                  flex: 1,
                  borderRadius: 18,
                  paddingVertical: 14,
                  alignItems: "center",
                  backgroundColor: COLORS.primary,
                  opacity:
                    !recordedVoice || isRecording || isSubmittingVoice
                      ? 0.5
                      : 1,
                }}
              >
                <Text style={{ fontWeight: "700", color: "white" }}>
                  {isSubmittingVoice ? "Đang gửi..." : "Gửi bản ghi âm"}
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={{
                marginTop: 18,
                paddingVertical: 12,
                borderRadius: 18,
                backgroundColor: "#f8fafc",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#6b7280", fontWeight: "600" }}>
                Chế độ hiện tại: {voiceMode === "audio" ? "Gửi audio" : ""}
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default ChatInput;
