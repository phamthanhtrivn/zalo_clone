import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ListRenderItemInfo,
  RefreshControl,
  View,
  ViewToken,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Audio } from "expo-av";
import { COLORS } from "@/constants/colors";

import StoriesStrip from "./StoriesStrip";
import PostCard from "./PostCard";
import SectionDivider from "./SectionDivider";

const getPostId = (post: any) => String(post?.id || post?._id || "");

const getPreviewUrl = (post: any) =>
  post?.music?.previewUrl || post?.music?.preview_url || "";

export default function DiaryContent({
  avatar,
  posts,
  loading,
  onRefresh,
  refreshing,
  onOpenStoryCamera,
  onOpenStoryViewer,
  stories,
}: any) {
  const [activeMusicPostId, setActiveMusicPostId] = useState<string | null>(null);
  const [mutedPostIds, setMutedPostIds] = useState<Record<string, boolean>>({});
  const soundRef = useRef<Audio.Sound | null>(null);
  const activeSoundPostIdRef = useRef<string | null>(null);
  const isScreenFocusedRef = useRef(false);

  const normalizedPosts = useMemo(
    () => (Array.isArray(posts) ? posts.filter((post) => getPostId(post)) : []),
    [posts],
  );

  const stopActiveSound = useCallback(async () => {
    activeSoundPostIdRef.current = null;
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => undefined);
      soundRef.current = null;
    }
  }, []);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => undefined);
  }, []);

  useFocusEffect(
    useCallback(() => {
      isScreenFocusedRef.current = true;

      return () => {
        isScreenFocusedRef.current = false;
        setActiveMusicPostId(null);
        stopActiveSound().catch(() => undefined);
      };
    }, [stopActiveSound]),
  );

  useEffect(() => {
    return () => {
      stopActiveSound().catch(() => undefined);
    };
  }, [stopActiveSound]);

  useEffect(() => {
    let cancelled = false;

    const syncActiveSound = async () => {
      if (!isScreenFocusedRef.current) {
        await stopActiveSound();
        return;
      }

      const targetPost = normalizedPosts.find(
        (post) => getPostId(post) === activeMusicPostId,
      );
      const previewUrl = targetPost ? getPreviewUrl(targetPost) : "";
      const isMuted = activeMusicPostId
        ? Boolean(mutedPostIds[activeMusicPostId])
        : false;

      if (!activeMusicPostId || !previewUrl || isMuted) {
        await stopActiveSound();
        return;
      }

      if (
        soundRef.current &&
        activeSoundPostIdRef.current === activeMusicPostId
      ) {
        const status = await soundRef.current.getStatusAsync().catch(() => null);
        if (status && "isLoaded" in status && status.isLoaded && !status.isPlaying) {
          await soundRef.current.playAsync().catch(() => undefined);
        }
        return;
      }

      await stopActiveSound();

      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: previewUrl },
          { shouldPlay: false, isLooping: true, volume: 1 },
        );

        if (cancelled || !isScreenFocusedRef.current) {
          await sound.unloadAsync().catch(() => undefined);
          return;
        }

        soundRef.current = sound;
        activeSoundPostIdRef.current = activeMusicPostId;
        await sound.playAsync().catch(() => undefined);
      } catch {
        activeSoundPostIdRef.current = null;
      }
    };

    syncActiveSound();

    return () => {
      cancelled = true;
    };
  }, [activeMusicPostId, mutedPostIds, normalizedPosts, stopActiveSound]);

  const toggleMuteForPost = (postId: string) => {
    setMutedPostIds((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      const playableItems = viewableItems
        .filter((entry) => entry.isViewable && getPreviewUrl(entry.item))
        .sort((a, b) => (a.index ?? Number.MAX_SAFE_INTEGER) - (b.index ?? Number.MAX_SAFE_INTEGER));

      setActiveMusicPostId(
        playableItems.length > 0 ? getPostId(playableItems[0].item) : null,
      );
    },
  );

  const renderItem = ({ item, index }: ListRenderItemInfo<any>) => {
    const postId = getPostId(item);

    return (
      <View>
        <PostCard
          item={item}
          isMusicActive={activeMusicPostId === postId}
          isMusicMuted={Boolean(mutedPostIds[postId])}
          onToggleMusicMute={() => toggleMuteForPost(postId)}
        />
        {index < normalizedPosts.length - 1 && <SectionDivider />}
      </View>
    );
  };

  return (
    <FlatList
      data={normalizedPosts}
      keyExtractor={(item) => getPostId(item)}
      renderItem={renderItem}
      className="flex-1 bg-[#eef2f7]"
      contentContainerStyle={{ paddingBottom: 24 }}
      viewabilityConfig={{
        itemVisiblePercentThreshold: 45,
        minimumViewTime: 200,
      }}
      onViewableItemsChanged={handleViewableItemsChanged.current}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[COLORS.primary]}
        />
      }
      ListHeaderComponent={
        <>
          <StoriesStrip
            onCreateStory={onOpenStoryCamera}
            onOpenStory={onOpenStoryViewer}
            stories={stories}
            currentUserAvatar={avatar}
          />
          <SectionDivider />
          {loading ? (
            <View className="py-10">
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : null}
        </>
      }
      ListEmptyComponent={!loading ? <View style={{ height: 24 }} /> : null}
    />
  );
}
