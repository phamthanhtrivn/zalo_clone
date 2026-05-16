import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Video, ResizeMode } from "expo-av";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getVideoFeed } from "@/services/social.service";
import { useAppSelector } from "@/store/store";

const VIDEO_CATEGORIES = [
  { key: "cho-ban", label: "Cho bạn" },
  { key: "cong-nghe", label: "Công nghệ" },
  { key: "the-thao", label: "Thể thao" },
  { key: "du-lich", label: "Du lịch" },
  { key: "am-thuc", label: "Ẩm thực" },
];

const HOT_KEYWORDS = [
  "Miss World 2026",
  "Phim Việt tháng 5",
  "Hantavirus",
  "Xem livestream trên Zalo Video",
];

export default function VideoScreen() {
  const router = useRouter();
  const userInfo = useAppSelector((state) => state.userInfo.userInfo);
  const [activeCategory, setActiveCategory] = useState("cho-ban");
  const [activeFeedType, setActiveFeedType] = useState<"for-you" | "following">(
    "for-you",
  );
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadVideos = useCallback(
    async (category = activeCategory) => {
      try {
        const res: any = await getVideoFeed(category, activeFeedType);
        const rows = Array.isArray(res?.data) ? res.data : [];
        setVideos(rows);
      } catch {
        setVideos([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeCategory, activeFeedType],
  );

  useEffect(() => {
    setLoading(true);
    loadVideos(activeCategory);
  }, [activeCategory, activeFeedType, loadVideos]);

  useFocusEffect(
    useCallback(() => {
      loadVideos(activeCategory);
    }, [activeCategory, loadVideos]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVideos(activeCategory);
  };

  const openVideoFeed = (videoId: string) => {
    router.push({
      pathname: "/private/social/video-feed",
      params: {
        initialVideoId: videoId,
        category: activeCategory,
        feedType: activeFeedType,
      },
    });
  };

  const openVideoProfile = () => {
    router.push("/private/social/video-profile");
  };

  const [leftColumn, rightColumn] = useMemo(() => {
    const left: any[] = [];
    const right: any[] = [];

    videos.forEach((item, index) => {
      (index % 2 === 0 ? left : right).push(item);
    });

    return [left, right];
  }, [videos]);

  const renderVideoCard = (item: any, index: number) => (
    <Pressable
      key={item.id || index}
      onPress={() => openVideoFeed(item.id)}
      className="mb-3 overflow-hidden rounded-[24px] bg-white"
    >
      <View className="overflow-hidden rounded-[24px] bg-black">
        <Video
          source={{ uri: item.previewUrl || item.videoUrl }}
          style={{ width: "100%", height: 280 + (index % 3) * 38 }}
          resizeMode={ResizeMode.COVER}
          shouldPlay={false}
          isLooping
          isMuted
        />
        <View className="absolute inset-0 items-center justify-center">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-black/35">
            <Ionicons name="play" size={24} color="white" />
          </View>
        </View>
        <View className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1">
          <Text className="text-[11px] font-semibold text-white">
            {item.visibility === "FRIENDS" ? "Bạn bè" : "Công khai"}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center px-2.5 py-2">
        <Image
          source={{ uri: item.avatar }}
          style={{ width: 24, height: 24, borderRadius: 12 }}
        />
        <Text
          numberOfLines={1}
          className="ml-2 flex-1 text-[13px] text-[#4b5563]"
        >
          {item.name}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <ScrollView
      className="flex-1 bg-white"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View className="border-b border-[#eef2f7] bg-white px-4 pb-4 pt-3">
        <View className="mb-4 flex-row rounded-full bg-[#eef2f7] p-1">
          <Pressable
            onPress={() => setActiveFeedType("for-you")}
            className={`flex-1 rounded-full px-4 py-2.5 ${activeFeedType === "for-you" ? "bg-white" : ""}`}
          >
            <Text
              className={`text-center text-[14px] ${activeFeedType === "for-you" ? "font-semibold text-[#111827]" : "text-[#6b7280]"}`}
            >
              Cho bạn
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveFeedType("following")}
            className={`flex-1 rounded-full px-4 py-2.5 ${activeFeedType === "following" ? "bg-white" : ""}`}
          >
            <Text
              className={`text-center text-[14px] ${activeFeedType === "following" ? "font-semibold text-[#111827]" : "text-[#6b7280]"}`}
            >
              Theo dõi
            </Text>
          </Pressable>
        </View>
        <View className="flex-row items-center">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-1"
          >
            {VIDEO_CATEGORIES.map((category) => {
              const active = activeCategory === category.key;
              return (
                <Pressable
                  key={category.key}
                  onPress={() => setActiveCategory(category.key)}
                  className={`mr-3 rounded-full px-5 py-3 ${active ? "bg-[#eef2f7]" : "bg-white"}`}
                >
                  <Text
                    className={`text-[15px] ${active ? "font-semibold text-[#111827]" : "text-[#6b7280]"}`}
                  >
                    {category.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable
            onPress={openVideoProfile}
            className="ml-3 h-12 w-12 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-black"
          >
            <Image
              source={{
                uri:
                  userInfo?.profile?.avatarUrl ||
                  "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?q=80&w=400&auto=format&fit=crop",
              }}
              style={{ width: "100%", height: "100%" }}
            />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View className="py-16">
          <ActivityIndicator size="large" color="#0068ff" />
        </View>
      ) : videos.length === 0 ? (
        <View className="px-6 py-20">
          <Text className="text-center text-[16px] font-semibold text-[#374151]">
            {activeFeedType === "following"
              ? "Chưa có video từ những người bạn theo dõi"
              : "Chưa có video để hiển thị"}
          </Text>
          <Text className="mt-2 text-center text-[14px] text-[#6b7280]">
            {activeFeedType === "following"
              ? "Hãy theo dõi một số người để tab này hiện đúng nội dung bạn quan tâm."
              : "Thử kéo để tải lại hoặc đổi danh mục video."}
          </Text>
        </View>
      ) : (
        <View className="flex-row items-start gap-3 px-4 py-4">
          <View className="flex-1">
            {leftColumn.map((item, index) => renderVideoCard(item, index))}
          </View>
          <View className="flex-1">
            {rightColumn
              .slice(0, 1)
              .map((item, index) => renderVideoCard(item, index + 1))}

            <View className="mb-3 overflow-hidden rounded-[24px] border border-[#f3f4f6] bg-[#fff8ec] px-4 py-4">
              <Text className="text-[16px] font-semibold text-[#9a3412]">
                Từ khóa hot
              </Text>
              <View className="mt-3">
                {HOT_KEYWORDS.map((keyword, index) => (
                  <Text
                    key={keyword}
                    className={`mb-3 text-[15px] font-semibold ${index === HOT_KEYWORDS.length - 1 ? "text-[#dc2626]" : "text-[#ea580c]"}`}
                  >
                    {index === 0 ? "🔥 " : "↗ "} {keyword}
                  </Text>
                ))}
              </View>
              <Pressable className="mt-2 rounded-2xl bg-white px-4 py-3">
                <Text className="text-center text-[15px] font-medium text-[#6b7280]">
                  Tìm kiếm video
                </Text>
              </Pressable>
            </View>

            {rightColumn
              .slice(1)
              .map((item, index) => renderVideoCard(item, index + 2))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
