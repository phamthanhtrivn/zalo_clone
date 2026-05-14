import { useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { reactPostThunk } from "@/store/slices/diaryThunk";
import {
  removeAuthorPostsFromFeed,
  removePostFromFeed,
  updatePostVisibilityInFeed,
} from "@/store/slices/diarySlice";
import {
  blockDiaryViewer,
  deletePost,
  hideAuthorPosts,
  reportPost,
  updatePostVisibility,
} from "@/services/social.service";
import { userService } from "@/services/user.service";
import ReactionPicker, { REACTIONS, ReactionType } from "./ReactionPicker";
import CommentSheet from "./CommentSheet";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const REACTION_EMOJI: Record<string, string> = {
  LIKE: "\u{1F44D}",
  HEART: "\u2764\uFE0F",
  HAHA: "\u{1F606}",
  WOW: "\u{1F62E}",
  SAD: "\u{1F622}",
  CARE: "\u{1F917}",
};

const VISIBILITY_META: Record<
  string,
  { label: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  PUBLIC: {
    label: "Công khai",
    subtitle: "Ai cũng có thể xem bài đăng này.",
    icon: "earth-outline",
  },
  FRIENDS: {
    label: "Bạn bè",
    subtitle: "Chỉ bạn bè mới xem được bài đăng này.",
    icon: "people-outline",
  },
  PRIVATE: {
    label: "Chỉ mình tôi",
    subtitle: "Chỉ bạn mới xem được bài đăng này.",
    icon: "lock-closed-outline",
  },
};

const formatRelativeTime = (value?: string) => {
  if (!value) return "Vừa xong";

  const createdAt = new Date(value).getTime();
  if (Number.isNaN(createdAt)) return "Vừa xong";

  const diffMs = Date.now() - createdAt;
  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));

  if (diffMinutes < 60) return `${diffMinutes} phút`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày`;

  return new Date(value).toLocaleDateString("vi-VN");
};

type OptionItem = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  danger?: boolean;
  onPress: () => void;
};

const normalizeId = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    return (
      value._id ||
      value.id ||
      value.friendId ||
      value.userId ||
      value.authorId ||
      ""
    )
      .toString()
      .trim();
  }
  return "";
};

export default function PostCard({
  item,
  isMusicActive = false,
  isMusicMuted = false,
  onToggleMusicMute,
}: {
  item: any;
  isMusicActive?: boolean;
  isMusicMuted?: boolean;
  onToggleMusicMute?: () => void;
}) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((s: any) => s.auth.user);
  const currentUserId = normalizeId(currentUser?._id || currentUser?.id || currentUser);
  const postId: string = item?.id || item?._id || "";
  const authorId = normalizeId(
    item?.authorId ||
      item?.userId ||
      item?.author?._id ||
      item?.author?.id ||
      item?.user?._id ||
      item?.user?.id,
  );
  const isOwnPost = Boolean(currentUserId && authorId && authorId === currentUserId);

  const [showReactions, setShowReactions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showVisibilitySheet, setShowVisibilitySheet] = useState(false);
  const [anchorY, setAnchorY] = useState(0);
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);
  const likeRef = useRef<View>(null);

  const timeStr = useMemo(
    () => formatRelativeTime(item.createdAt),
    [item.createdAt],
  );

  const author = item.author || item.user || item.authorId;
  const displayName =
    item.name || author?.profile?.name || author?.name || "Người dùng Zalo";
  const displayAvatar =
    item.avatar && item.avatar !== ""
      ? item.avatar
      : author?.profile?.avatarUrl ||
        author?.avatarUrl ||
        "https://ui-avatars.com/api/?name=U";

  const contentText = item.content || item.text || "";
  const music = item.music || null;
  const musicTitle = music?.title || "";
  const musicArtist = music?.artist || "";
  const musicThumbnail = music?.thumbnail || displayAvatar;
  const visibility = item?.visibility || "PUBLIC";
  const visibilityMeta = VISIBILITY_META[visibility] || VISIBILITY_META.PUBLIC;

  const { myReaction, totalLikes, topEmojis } = useMemo(() => {
    const counts: Record<string, number> = item.reactionCounts ?? {};
    const total = item.likes ?? 0;
    const mine = item.myReaction ?? null;

    const emojis = Object.entries(counts)
      .filter(([, cnt]) => cnt > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => REACTION_EMOJI[type]);

    return { myReaction: mine, totalLikes: total, topEmojis: emojis };
  }, [item.reactionCounts, item.likes, item.myReaction]);

  const handleLongPressLike = () => {
    likeRef.current?.measureInWindow((_x, y, _w, h) => {
      const fromBottom =
        Platform.OS === "android" ? 600 - y : SCREEN_HEIGHT - y;
      setAnchorY(fromBottom + h + 8);
    });
    setShowReactions(true);
  };

  const handlePressLike = () => {
    if (!postId) return;
    dispatch(reactPostThunk({ postId, type: "LIKE" }));
  };

  const handleSelectReaction = (type: ReactionType) => {
    if (!postId) return;
    dispatch(reactPostThunk({ postId, type }));
  };

  const runAction = async (key: string, action: () => Promise<void>) => {
    try {
      setActionLoadingKey(key);
      await action();
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error?.response?.data?.message || "Không thể thực hiện thao tác.",
      );
    } finally {
      setActionLoadingKey(null);
      setShowOptions(false);
    }
  };

  const confirmDeletePost = () => {
    setShowOptions(false);
    Alert.alert("Xóa bài đăng", "Bài đăng này sẽ bị xóa khỏi nhật ký của bạn.", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () =>
          runAction("delete", async () => {
            await deletePost(postId);
            dispatch(removePostFromFeed(postId));
            Alert.alert("Thành công", "Đã xóa bài đăng.");
          }),
      },
    ]);
  };

  const confirmChangeVisibility = () => {
    setShowOptions(false);
    setShowVisibilitySheet(true);
  };

  const handleSelectVisibility = (nextVisibility: "PUBLIC" | "FRIENDS" | "PRIVATE") => {
    setShowVisibilitySheet(false);
    runAction(`visibility-${nextVisibility.toLowerCase()}`, async () => {
      await updatePostVisibility(postId, nextVisibility);
      dispatch(
        updatePostVisibilityInFeed({ postId, visibility: nextVisibility }),
      );
      const nextMeta = VISIBILITY_META[nextVisibility];
      Alert.alert(
        "Thành công",
        `Đã đổi quyền riêng tư thành ${nextMeta.label}.`,
      );
    });
  };

  const confirmHideAuthor = () => {
    setShowOptions(false);
    Alert.alert(
      `Ẩn hoạt động của ${displayName}`,
      "Bạn sẽ không thấy bài đăng và khoảnh khắc mới của người này.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Ẩn",
          onPress: () =>
            runAction("hide-author", async () => {
              const res: any = await hideAuthorPosts(postId);
              const hiddenAuthorId = res?.data?.hiddenAuthorId || authorId;
              dispatch(removeAuthorPostsFromFeed(hiddenAuthorId));
              Alert.alert(
                "Thành công",
                `Đã ẩn hoạt động của ${displayName}.`,
              );
            }),
        },
      ],
    );
  };

  const confirmBlockViewer = () => {
    setShowOptions(false);
    Alert.alert(
      `Chặn ${displayName} xem nhật ký của tôi`,
      "Người này sẽ không xem được bài đăng và khoảnh khắc của bạn.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Chặn",
          style: "destructive",
          onPress: () =>
            runAction("block-viewer", async () => {
              await blockDiaryViewer(postId);
              Alert.alert(
                "Thành công",
                `Đã chặn ${displayName} xem nhật ký của bạn.`,
              );
            }),
        },
      ],
    );
  };

  const confirmReportPost = () => {
    setShowOptions(false);
    Alert.alert(
      "Báo xấu bài đăng",
      "Bài đăng này sẽ được gửi báo cáo và ẩn khỏi feed của bạn.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Báo xấu",
          style: "destructive",
          onPress: () =>
            runAction("report", async () => {
              await reportPost(postId, "Người dùng báo xấu từ menu bài đăng");
              dispatch(removePostFromFeed(postId));
              Alert.alert("Thành công", "Đã gửi báo cáo và ẩn bài đăng.");
            }),
        },
      ],
    );
  };

  const confirmUnfriend = () => {
    setShowOptions(false);
    Alert.alert(
      "Xóa bạn",
      `Bạn có chắc muốn xóa bạn với ${displayName} không?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa bạn",
          style: "destructive",
          onPress: () =>
            runAction("unfriend", async () => {
              await userService.cancelFriend(authorId, currentUserId);
              Alert.alert("Thành công", `Đã xóa bạn với ${displayName}.`);
            }),
        },
      ],
    );
  };

  const options: OptionItem[] = isOwnPost
    ? [
        {
          key: "visibility",
          icon: visibilityMeta.icon,
          title: "Đổi quyền riêng tư",
          subtitle: `Hiện tại: ${visibilityMeta.label}.`,
          onPress: confirmChangeVisibility,
        },
        {
          key: "delete",
          icon: "trash-outline",
          title: "Xóa bài đăng",
          subtitle: "Bài đăng này sẽ bị xóa khỏi nhật ký của bạn.",
          danger: true,
          onPress: confirmDeletePost,
        },
      ]
    : [
        {
          key: "hide-author",
          icon: "eye-off-outline",
          title: `Ẩn hoạt động của ${displayName}`,
          subtitle: "Bạn sẽ không thấy bài đăng và khoảnh khắc của người này.",
          onPress: confirmHideAuthor,
        },
        {
          key: "block-viewer",
          icon: "ban-outline",
          title: `Chặn ${displayName} xem nhật ký của tôi`,
          subtitle: "Người này sẽ không xem được bài đăng và khoảnh khắc của bạn.",
          onPress: confirmBlockViewer,
        },
        {
          key: "report",
          icon: "warning-outline",
          title: "Báo xấu",
          subtitle: "Báo cáo bài đăng này và ẩn nó khỏi feed của bạn.",
          danger: true,
          onPress: confirmReportPost,
        },
        {
          key: "unfriend",
          icon: "person-remove-outline",
          title: "Xóa bạn",
          subtitle: "Hủy kết bạn với người này.",
          danger: true,
          onPress: confirmUnfriend,
        },
      ];

  const likeLabel = myReaction
    ? REACTIONS.find((reaction) => reaction.type === myReaction)?.label ??
      "Thích"
    : "Thích";
  const likeColor = myReaction ? "#e11d48" : "#4b5563";

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Image source={{ uri: displayAvatar }} style={styles.avatar} />

        <View style={styles.headerContent}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.name}>{displayName}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.time}>{timeStr}</Text>
                {isOwnPost ? (
                  <View style={styles.visibilityBadge}>
                    <Ionicons
                      name={visibilityMeta.icon}
                      size={12}
                      color="#4b5563"
                    />
                    <Text style={styles.visibilityBadgeText}>
                      {visibilityMeta.label}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
            <TouchableOpacity hitSlop={10} onPress={() => setShowOptions(true)}>
              <Ionicons name="ellipsis-horizontal" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {!!contentText && <Text style={styles.content}>{contentText}</Text>}
        </View>
      </View>

      {item.images?.length > 0 ? (
        <View style={styles.mediaWrap}>
          <Image
            source={{ uri: item.images[0] }}
            style={styles.postImage}
            contentFit="cover"
          />

          {musicTitle ? (
            <View style={styles.musicOverlay}>
              <View style={styles.musicPill}>
                <Image source={{ uri: musicThumbnail }} style={styles.musicThumb} />
                <View style={styles.musicMeta}>
                  <Text numberOfLines={1} style={styles.musicText}>
                    {musicTitle}
                    {musicArtist ? ` - ${musicArtist}` : ""}
                  </Text>
                  <Text style={styles.musicState}>
                    {isMusicActive && !isMusicMuted ? "Đang phát" : "Nhấn để nghe"}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={onToggleMusicMute}
                style={styles.musicButton}
                hitSlop={8}
              >
                <Ionicons
                  name={
                    isMusicActive && !isMusicMuted ? "volume-high" : "volume-mute"
                  }
                  size={22}
                  color="#fff"
                />
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      {totalLikes > 0 ? (
        <View style={styles.reactionSummary}>
          <View style={styles.reactionGroup}>
            <Text style={styles.reactionEmojis}>{topEmojis.join("")}</Text>
            <Text style={styles.reactionCount}>{totalLikes}</Text>
          </View>
          <Text style={styles.commentCount}>{item.comments ?? 0}</Text>
        </View>
      ) : item.comments > 0 ? (
        <View style={styles.reactionSummary}>
          <View />
          <Text style={styles.commentCount}>{item.comments}</Text>
        </View>
      ) : null}

      <View style={styles.actionBar}>
        <TouchableOpacity
          ref={likeRef as any}
          style={styles.actionBtn}
          onPress={handlePressLike}
          onLongPress={handleLongPressLike}
          delayLongPress={350}
        >
          <Ionicons
            name={myReaction ? "heart" : "heart-outline"}
            size={24}
            color={likeColor}
          />
          <Text style={[styles.actionLabel, { color: likeColor }]}>
            {likeLabel}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setShowComments(true)}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={24} color="#4b5563" />
          <Text style={styles.actionLabel}>
            {item.comments > 0 ? item.comments : "Bình luận"}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOptions(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setShowOptions(false)}
        >
          <Pressable style={styles.sheetContainer}>
            {options.map((option) => {
              const busy = actionLoadingKey === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={styles.sheetItem}
                  disabled={busy}
                  onPress={option.onPress}
                >
                  <View style={styles.sheetIconWrap}>
                    <Ionicons
                      name={option.icon}
                      size={24}
                      color={option.danger ? "#ef4444" : "#6b7280"}
                    />
                  </View>
                  <View style={styles.sheetTextWrap}>
                    <Text
                      style={[
                        styles.sheetTitle,
                        option.danger ? styles.sheetDangerText : null,
                      ]}
                    >
                      {busy ? "Đang xử lý..." : option.title}
                    </Text>
                    {option.subtitle ? (
                      <Text style={styles.sheetSubtitle}>{option.subtitle}</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showVisibilitySheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVisibilitySheet(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setShowVisibilitySheet(false)}
        >
          <Pressable style={styles.sheetContainer}>
            <Text style={styles.visibilityTitle}>Đổi quyền riêng tư</Text>
            <Text style={styles.visibilityDescription}>
              Chọn đối tượng có thể xem bài đăng này.
            </Text>

            {(["PUBLIC", "FRIENDS", "PRIVATE"] as const).map((option) => {
              const meta = VISIBILITY_META[option];
              const active = visibility === option;
              const busy =
                actionLoadingKey === `visibility-${option.toLowerCase()}`;

              return (
                <TouchableOpacity
                  key={option}
                  style={styles.visibilityItem}
                  disabled={busy}
                  onPress={() => handleSelectVisibility(option)}
                >
                  <View style={styles.sheetIconWrap}>
                    <Ionicons name={meta.icon} size={22} color="#6b7280" />
                  </View>
                  <View style={styles.sheetTextWrap}>
                    <Text style={styles.sheetTitle}>
                      {busy ? "Đang xử lý..." : meta.label}
                    </Text>
                    <Text style={styles.sheetSubtitle}>{meta.subtitle}</Text>
                  </View>
                  {active ? (
                    <Ionicons name="checkmark-circle" size={22} color="#2563eb" />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      <ReactionPicker
        visible={showReactions}
        onSelect={handleSelectReaction}
        onClose={() => setShowReactions(false)}
        anchorY={anchorY}
      />

      <CommentSheet
        postId={postId}
        visible={showComments}
        onClose={() => setShowComments(false)}
        currentUserId={currentUserId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  metaRow: {
    marginTop: 3,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  time: {
    fontSize: 13,
    color: "#6b7280",
  },
  visibilityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f3f4f6",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  visibilityBadgeText: {
    fontSize: 12,
    color: "#4b5563",
    fontWeight: "600",
  },
  content: {
    marginTop: 12,
    marginRight: 16,
    fontSize: 16,
    color: "#111827",
    lineHeight: 24,
  },
  mediaWrap: {
    marginTop: 14,
    position: "relative",
  },
  postImage: {
    width: "100%",
    height: 430,
    borderRadius: 22,
    backgroundColor: "#e5e7eb",
  },
  musicOverlay: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  musicPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 10,
  },
  musicThumb: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  musicMeta: {
    flex: 1,
    marginLeft: 10,
  },
  musicText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  musicState: {
    marginTop: 2,
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
  },
  musicButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  reactionSummary: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reactionGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  reactionEmojis: {
    fontSize: 16,
  },
  reactionCount: {
    marginLeft: 6,
    fontSize: 14,
    color: "#6b7280",
  },
  commentCount: {
    fontSize: 14,
    color: "#6b7280",
  },
  actionBar: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: "#f5f6fa",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4b5563",
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 4,
  },
  sheetItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
  },
  sheetIconWrap: {
    width: 42,
    alignItems: "center",
    paddingTop: 2,
  },
  sheetTextWrap: {
    flex: 1,
    marginLeft: 10,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
  },
  sheetDangerText: {
    color: "#ef4444",
  },
  sheetSubtitle: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 20,
    color: "#6b7280",
  },
  visibilityTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  visibilityDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6b7280",
    marginBottom: 8,
  },
  visibilityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
});
