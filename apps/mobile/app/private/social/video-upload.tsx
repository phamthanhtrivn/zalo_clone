import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Video, ResizeMode } from "expo-av";
import * as MediaLibrary from "expo-media-library";
import * as ImagePicker from "expo-image-picker";
import Ionicons from "@expo/vector-icons/Ionicons";

const formatDuration = (durationMs?: number) => {
  const totalSeconds = Math.max(0, Math.floor((durationMs || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export default function VideoUploadScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<any[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);

  const loadVideos = useCallback(async () => {
    try {
      setLoading(true);
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Thiếu quyền", "Vui lòng cấp quyền thư viện để chọn video.");
        setVideos([]);
        return;
      }

      const res = await MediaLibrary.getAssetsAsync({
        mediaType: [MediaLibrary.MediaType.video],
        first: 60,
        sortBy: [MediaLibrary.SortBy.creationTime],
      });

      const items = await Promise.all(
        (res.assets || []).map(async (asset) => {
          const info = await MediaLibrary.getAssetInfoAsync(asset);
          return {
            id: asset.id,
            uri: info.localUri || asset.uri,
            duration: asset.duration ? asset.duration * 1000 : 0,
            filename: asset.filename,
          };
        }),
      );

      setVideos(items.filter((item) => !!item.uri));
    } catch {
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const handleOpenCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Thiếu quyền", "Vui lòng cấp quyền camera để quay video.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 1,
        videoMaxDuration: 60,
      });

      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setSelectedVideo({
        id: `camera-${Date.now()}`,
        uri: asset.uri,
        duration: (asset.duration || 0) * 1000,
        filename: asset.fileName || `video-${Date.now()}.mp4`,
      });
    } catch {
      Alert.alert("Lỗi", "Không thể mở camera quay video.");
    }
  };

  const canContinue = useMemo(() => !!selectedVideo?.uri, [selectedVideo]);

  const handleContinue = () => {
    if (!selectedVideo?.uri) return;
    router.push({
      pathname: "/private/social/video-publish",
      params: {
        videoUri: selectedVideo.uri,
        fileName: selectedVideo.filename || "",
      },
    });
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    if (index === 0) {
      return (
        <Pressable
          onPress={handleOpenCamera}
          className="h-[168px] w-[32.3%] items-center justify-center bg-[#111]"
        >
          <Ionicons name="videocam-outline" size={42} color="white" />
          <Text className="mt-4 text-[16px] font-medium text-white">Quay video</Text>
        </Pressable>
      );
    }

    const active = selectedVideo?.id === item.id;
    return (
      <Pressable
        onPress={() => setSelectedVideo(item)}
        className={`h-[168px] w-[32.3%] overflow-hidden bg-black ${active ? "border-2 border-[#1677ff]" : ""}`}
      >
        <Video
          source={{ uri: item.uri }}
          style={{ width: "100%", height: "100%" }}
          resizeMode={ResizeMode.COVER}
          shouldPlay={false}
          isMuted
        />
        <View className="absolute bottom-2 right-2 rounded-xl bg-black/60 px-2 py-1">
          <Text className="text-[11px] font-medium text-white">{formatDuration(item.duration)}</Text>
        </View>
        {active ? (
          <View className="absolute left-2 top-2 h-6 w-6 items-center justify-center rounded-full bg-[#1677ff]">
            <Ionicons name="checkmark" size={16} color="white" />
          </View>
        ) : null}
      </Pressable>
    );
  };

  const galleryData = useMemo(() => [{ id: "__camera__" }, ...videos], [videos]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#121212" }} edges={["top", "bottom"]}>
      <View className="flex-row items-center justify-between px-4 pb-4 pt-2">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full">
          <Ionicons name="arrow-back" size={28} color="white" />
        </Pressable>
        <View className="flex-row items-center">
          <Text className="text-[20px] font-semibold text-white">Tất cả</Text>
          <Ionicons name="chevron-down" size={18} color="white" style={{ marginLeft: 6 }} />
        </View>
        <View className="h-10 w-10" />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1677ff" />
        </View>
      ) : (
        <>
          <FlatList
            data={galleryData}
            keyExtractor={(item: any) => item.id}
            numColumns={3}
            renderItem={renderItem}
            columnWrapperStyle={{ gap: 3, marginBottom: 3 }}
            contentContainerStyle={{ paddingHorizontal: 3, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
          />
          <View className="absolute bottom-0 left-0 right-0 border-t border-[#222] bg-[#151515] px-5 pb-8 pt-4">
            <Pressable
              onPress={handleContinue}
              disabled={!canContinue}
              className={`items-center rounded-2xl py-4 ${canContinue ? "bg-[#1677ff]" : "bg-[#2b2b2b]"}`}
            >
              <Text className={`text-[17px] font-semibold ${canContinue ? "text-white" : "text-[#8f8f8f]"}`}>
                Tiếp tục
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
