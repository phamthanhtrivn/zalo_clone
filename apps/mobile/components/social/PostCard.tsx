import { useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { reactPostThunk } from "@/store/slices/diaryThunk";
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

export default function PostCard({ item }: { item: any }) {
  const dispatch = useAppDispatch();
  const currentUserId: string = useAppSelector(
    (s: any) => s.auth.user?._id ?? s.auth.user?.id ?? "",
  );
  const postId: string = item?.id || item?._id || "";

  const [showReactions, setShowReactions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [anchorY, setAnchorY] = useState(0);
  const likeRef = useRef<View>(null);

  const timeStr = useMemo(() => {
    const date = new Date(item.createdAt);
    return (
      date.toLocaleDateString("vi-VN") +
      " " +
      date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, [item.createdAt]);

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

  const likeLabel = myReaction
    ? REACTIONS.find((reaction) => reaction.type === myReaction)?.label ?? "Thích"
    : "Thích";
  const likeEmoji = myReaction ? REACTION_EMOJI[myReaction] : null;
  const likeColor = myReaction ? "#0068FF" : "#4b5563";
  const myReactionText = myReaction
    ? `Bạn đã thả ${likeLabel.toLowerCase()}`
    : null;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Image source={{ uri: displayAvatar }} style={styles.avatar} />

        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.time}>{timeStr}</Text>
            </View>
            <TouchableOpacity>
              <Ionicons name="ellipsis-horizontal" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {!!contentText && <Text style={styles.content}>{contentText}</Text>}

          {item.images?.length > 0 && (
            <Image
              source={{ uri: item.images[0] }}
              style={styles.postImage}
              contentFit="cover"
            />
          )}

          {totalLikes > 0 && (
            <View style={styles.reactionSummary}>
              <Text style={styles.reactionEmojis}>{topEmojis.join("")}</Text>
              <Text style={styles.reactionCount}>{totalLikes}</Text>
              {myReactionText && (
                <View style={styles.myReactionBadge}>
                  <Text style={styles.myReactionBadgeText}>
                    {likeEmoji} {myReactionText}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.actionBar}>
            <TouchableOpacity
              ref={likeRef as any}
              style={[
                styles.actionBtn,
                myReaction ? styles.actionBtnActive : null,
              ]}
              onPress={handlePressLike}
              onLongPress={handleLongPressLike}
              delayLongPress={350}
            >
              <Text style={{ fontSize: 18 }}>
                {likeEmoji ?? REACTION_EMOJI.LIKE}
              </Text>
              <Text style={[styles.actionLabel, { color: likeColor }]}>
                {likeLabel}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setShowComments(true)}
            >
              <Ionicons name="chatbubble-outline" size={20} color="#4b5563" />
              <Text style={styles.actionLabel}>
                {item.comments > 0 ? `${item.comments} Bình luận` : "Bình luận"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

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
  card: { backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 14 },
  row: { flexDirection: "row" },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: { fontSize: 16, fontWeight: "700", color: "#111827" },
  time: { fontSize: 13, color: "#6b7280", marginTop: 1 },
  content: { marginTop: 10, fontSize: 15, color: "#111827", lineHeight: 22 },
  postImage: { height: 280, borderRadius: 14, marginTop: 10 },
  reactionSummary: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 8,
    paddingHorizontal: 2,
  },
  reactionEmojis: { fontSize: 15 },
  reactionCount: { fontSize: 13, color: "#6b7280", marginLeft: 4 },
  myReactionBadge: {
    marginLeft: 8,
    backgroundColor: "#e0ecff",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  myReactionBadgeText: {
    fontSize: 12,
    color: "#0b63ce",
    fontWeight: "600",
  },
  actionBar: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: "space-around",
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionBtnActive: {
    backgroundColor: "#e8f1ff",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionLabel: { fontSize: 14, color: "#4b5563", fontWeight: "500" },
  divider: { width: 1, height: 22, backgroundColor: "#d1d5db" },
});
