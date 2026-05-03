import { useEffect, useState, useCallback } from "react";
import { StatusBar } from "expo-status-bar";
import Container from "@/components/common/Container";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { fetchDiaryPosts } from "@/store/slices/diaryThunk";
import { useRouter } from "expo-router";

import SocialHeader from "../../../../components/social/SocialHeader";
import FeedTopTabs from "../../../../components/social/FeedTopTabs";
import DiaryContent from "../../../../components/social/DiaryContent";
import VideoScreen from "../../../../components/social/VideoScreen";

type SocialTab = "diary" | "video";

export default function SocialScreen() {
  const [activeTab, setActiveTab] = useState<SocialTab>("diary");
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { posts = [], loading = false } = useAppSelector(
    (state: any) => state.diary || {}
  );

  // Kiểm tra avatarUrl ở cả root (từ Auth) và profile (từ User model)
  const avatar = user?.avatarUrl || user?.profile?.avatarUrl || null;

  // Logic "Lấy tin": Fetch dữ liệu nhật ký từ server
  const loadContent = useCallback(async () => {
    if (activeTab === "diary") {
      await dispatch(fetchDiaryPosts());
    }
  }, [activeTab, dispatch]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  // Xử lý sự kiện làm mới tin (Pull-to-refresh)
  const onRefresh = async () => {
    setRefreshing(true);
    await loadContent();
    setRefreshing(false);
  };

  // Sự kiện "Tạo tin": Điều hướng sang màn hình đăng bài mới
  const handleCreatePost = () => {
    router.push("/private/social/create-post");
  };

  return (
    <Container className="bg-[#eef2f7]">
      <StatusBar style="light" />
      <SocialHeader onCreatePost={handleCreatePost} />
      <FeedTopTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "diary" ? (
        <DiaryContent
          avatar={avatar}
          posts={posts}
          loading={loading && !refreshing}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />
      ) : (
        <VideoScreen />
      )}
    </Container>
  );
}