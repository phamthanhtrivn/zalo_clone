import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import Container from "@/components/common/Container";
import PostCard from "@/components/social/PostCard";
import { getPostDetail } from "@/services/social.service";

export default function PostViewerScreen() {
  const router = useRouter();
  const { postId = "" } = useLocalSearchParams<{ postId?: string }>();
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    const loadPost = async () => {
      if (!postId) {
        Alert.alert("Lỗi", "Không tìm thấy bài đăng.");
        router.back();
        return;
      }

      try {
        setLoading(true);
        const res: any = await getPostDetail(String(postId));
        if (mounted) {
          setPost(res?.data || null);
        }
      } catch (error: any) {
        Alert.alert(
          "Thông báo",
          error?.response?.data?.message || "Không mở được bài đăng này.",
          [{ text: "OK", onPress: () => router.back() }],
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadPost();
    return () => {
      mounted = false;
    };
  }, [postId, router]);

  return (
    <Container className="bg-[#eef2f7]">
      <View className="px-4 pt-4 pb-3 flex-row items-center bg-white border-b border-[#e5e7eb]">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </Pressable>
        <Text className="text-[18px] font-semibold text-[#111827]">
          Bài đăng
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0068FF" />
        </View>
      ) : post ? (
        <ScrollView className="flex-1">
          <View className="mt-3">
            <PostCard item={post} />
          </View>
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-[#6b7280] text-center">
            Không tìm thấy bài đăng.
          </Text>
        </View>
      )}
    </Container>
  );
}
