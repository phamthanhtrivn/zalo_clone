import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Video, ResizeMode } from "expo-av";
import Ionicons from "@expo/vector-icons/Ionicons";
import { createVideoPost } from "@/services/social.service";

type Visibility = "PUBLIC" | "FRIENDS" | "PRIVATE";

const VISIBILITY_OPTIONS: {
  key: Visibility;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "PUBLIC", label: "Công khai", icon: "earth-outline" },
  { key: "FRIENDS", label: "Bạn bè", icon: "people-outline" },
  { key: "PRIVATE", label: "Chỉ mình tôi", icon: "lock-closed-outline" },
];

export default function VideoPublishScreen() {
  const router = useRouter();
  const { videoUri, fileName } = useLocalSearchParams<{
    videoUri?: string;
    fileName?: string;
  }>();

  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [posting, setPosting] = useState(false);

  const normalizedUri = useMemo(
    () => (typeof videoUri === "string" ? videoUri : ""),
    [videoUri],
  );
  const normalizedFileName = useMemo(() => {
    if (typeof fileName === "string" && fileName.trim()) return fileName;
    return `video-${Date.now()}.mp4`;
  }, [fileName]);

  const handlePublish = async () => {
    if (!normalizedUri || posting) return;
    try {
      setPosting(true);
      const formData = new FormData();
      formData.append("text", caption.trim());
      formData.append("visibility", visibility);
      formData.append("files", {
        uri:
          Platform.OS === "android"
            ? normalizedUri
            : normalizedUri.replace("file://", ""),
        name: normalizedFileName,
        type: "video/mp4",
      } as any);

      await createVideoPost(formData);
      Alert.alert("Thành công", "Đăng video thành công.", [
        {
          text: "OK",
          onPress: () => router.replace("/private/social/video-profile"),
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error?.response?.data?.message || "Không thể đăng video lúc này.",
      );
    } finally {
      setPosting(false);
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#111" }}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-row items-center justify-between border-b border-[#222] px-4 pb-3 pt-2">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full"
          >
            <Ionicons name="arrow-back" size={26} color="white" />
          </Pressable>
          <Text className="text-[18px] font-semibold text-white">
            Đăng video
          </Text>
          <Pressable
            onPress={handlePublish}
            disabled={!normalizedUri || posting}
            className={`rounded-full px-4 py-2 ${normalizedUri && !posting ? "bg-[#1677ff]" : "bg-[#2b2b2b]"}`}
          >
            <Text
              className={`font-semibold ${normalizedUri && !posting ? "text-white" : "text-[#8f8f8f]"}`}
            >
              {posting ? "Đang đăng..." : "Đăng"}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 32,
            paddingTop: 16,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="overflow-hidden rounded-[28px] bg-black">
            {normalizedUri ? (
              <Video
                source={{ uri: normalizedUri }}
                style={{ width: "100%", height: 360 }}
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isLooping
                useNativeControls
              />
            ) : (
              <View className="h-[360px] items-center justify-center">
                <Text className="text-[#8f8f8f]">Không có video được chọn</Text>
              </View>
            )}
          </View>

          <View className="mt-5 rounded-[28px] bg-[#1a1a1a] p-4">
            <Text className="mb-3 text-[15px] font-semibold text-white">
              Mô tả video
            </Text>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              multiline
              placeholder="Viết điều gì đó cho video của bạn..."
              placeholderTextColor="#71717a"
              className="min-h-[110px] text-[15px] leading-6 text-white"
              textAlignVertical="top"
            />
          </View>

          <View className="mt-5 rounded-[28px] bg-[#1a1a1a] p-4">
            <Text className="mb-3 text-[15px] font-semibold text-white">
              Quyền riêng tư
            </Text>
            <View className="gap-3">
              {VISIBILITY_OPTIONS.map((option) => {
                const active = visibility === option.key;
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => setVisibility(option.key)}
                    className={`flex-row items-center rounded-2xl border px-4 py-4 ${active ? "border-[#1677ff] bg-[#0f2440]" : "border-[#2d2d2d] bg-[#181818]"}`}
                  >
                    <Ionicons
                      name={option.icon}
                      size={20}
                      color={active ? "#60a5fa" : "#d4d4d8"}
                    />
                    <Text
                      className={`ml-3 flex-1 text-[15px] font-medium ${active ? "text-white" : "text-[#d4d4d8]"}`}
                    >
                      {option.label}
                    </Text>
                    {active ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color="#1677ff"
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {posting ? (
            <View className="mt-5 flex-row items-center justify-center">
              <ActivityIndicator color="#1677ff" />
              <Text className="ml-3 text-[#9ca3af]">
                Đang tải video lên máy chủ...
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
