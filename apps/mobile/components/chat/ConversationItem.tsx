import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  Animated,
  PanResponder,
  Dimensions,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { MaterialIcons, Ionicons, Feather } from "@expo/vector-icons";

import type { ConversationItemType } from "@/types/conversation-item.type";
import { formatMessageTime } from "@/utils/format-message-time..util";
import {
  pinConversation,
  unpinConversation,
  hideConversation,
  unhideConversation,
  muteConversation,
  unmuteConversation,
  deleteConversation,
} from "@/services/conversation-settings.service";
import { useAppDispatch, useAppSelector } from "@/store/store";
import {
  updateConversationSetting,
  removeConversation,
} from "@/store/slices/conversationSlice";

const SCREEN_HEIGHT = Dimensions.get("window").height;
type SubMenu = "mute" | null;

interface Props {
  conversation: ConversationItemType;
  currentUserId: string;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onSelectToggle?: (id: string) => void;
}

const ConversationItem: React.FC<Props> = ({
  conversation,
  currentUserId,
  isSelectMode = false,
  isSelected = false,
  onSelectToggle,
}) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const [menuVisible, setMenuVisible] = useState(false);
  const [subMenu, setSubMenu] = useState<SubMenu>(null);

  const lastMessage = conversation.lastMessage;
  const isRecall = lastMessage?.recalled;
  const isOwn =
    lastMessage?.senderId === currentUserId ||
    lastMessage?.senderName === "Bạn";

  // --- Logic Preview Tin nhắn (Hợp nhất từ Develop - Xử lý mảng file & hết hạn) ---
  const preview = useMemo(() => {
    const lastMsg = conversation.lastMessage;
    const content = lastMsg?.content;

    if (isRecall) return { icon: null, text: "Tin nhắn đã được thu hồi" };
    if (lastMsg?.expired) return { icon: null, text: "Tin nhắn đã hết hạn" };
    if (!content) return { icon: null, text: "" };

    if (content.text && /https?:\/\//.test(content.text)) {
      return {
        icon: <Feather name="link" size={14} color="#6b7280" />,
        text: content.text,
      };
    }
    if (content.icon) {
      return {
        icon: <MaterialIcons name="emoji-emotions" size={14} color="#6b7280" />,
        text: "Sticker",
      };
    }

    // Xử lý cả trường hợp mảng files (Develop) và object file đơn lẻ (Tung)
    const files = content.files || (content.file ? [content.file] : []);
    if (Array.isArray(files) && files.length > 0) {
      const lastFile = files[files.length - 1];
      const icons: any = {
        IMAGE: "image",
        VIDEO: "videocam",
        FILE: "attach-file",
      };
      return {
        icon: (
          <MaterialIcons
            name={icons[lastFile.type] || "insert-drive-file"}
            size={14}
            color="#6b7280"
          />
        ),
        text:
          lastFile.type === "FILE"
            ? lastFile.fileName
            : lastFile.type === "IMAGE"
              ? "Hình ảnh"
              : "Video",
      };
    }

    return { icon: null, text: content.text || "" };
  }, [lastMessage]);

  // --- Animation & PanResponder (Hợp nhất bộ khung Sheet) ---
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  const openSheet = () => {
    setMenuVisible(true);
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 25,
        stiffness: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSheet = (onDone?: () => void) => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setMenuVisible(false);
      setSubMenu(null);
      dragY.setValue(0);
      onDone?.();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => dy > 5,
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) dragY.setValue(dy);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > 100 || vy > 1.5) closeSheet();
        else
          Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
      },
    }),
  ).current;

  // --- Handlers (Optimistic Updates) ---
  const handlePin = () => {
    const newPinned = !conversation.pinned;
    dispatch(
      updateConversationSetting({
        conversationId: conversation.conversationId,
        pinned: newPinned,
      }),
    );
    closeSheet(async () => {
      try {
        newPinned
          ? await pinConversation(user?.userId, conversation.conversationId)
          : await unpinConversation(user?.userId, conversation.conversationId);
      } catch (err) {
        dispatch(
          updateConversationSetting({
            conversationId: conversation.conversationId,
            pinned: !newPinned,
          }),
        );
      }
    });
  };

  const handleMute = (duration: number) => {
    const newMuted = duration !== 0;
    dispatch(
      updateConversationSetting({
        conversationId: conversation.conversationId,
        muted: newMuted,
        mutedUntil: newMuted
          ? new Date(Date.now() + duration * 60 * 1000).toISOString()
          : null,
      }),
    );
    closeSheet(async () => {
      try {
        duration === 0
          ? await unmuteConversation(user?.userId, conversation.conversationId)
          : await muteConversation(
              user?.userId,
              conversation.conversationId,
              duration,
            );
      } catch (err) {
        dispatch(
          updateConversationSetting({
            conversationId: conversation.conversationId,
            muted: !newMuted,
            mutedUntil: null,
          }),
        );
      }
    });
  };

  const handleHide = () => {
    const newHidden = !conversation.hidden;
    dispatch(
      updateConversationSetting({
        conversationId: conversation.conversationId,
        hidden: newHidden,
      }),
    );
    closeSheet(async () => {
      try {
        newHidden
          ? await hideConversation(user?.userId, conversation.conversationId)
          : await unhideConversation(user?.userId, conversation.conversationId);
      } catch (err) {
        dispatch(
          updateConversationSetting({
            conversationId: conversation.conversationId,
            hidden: !newHidden,
          }),
        );
      }
    });
  };

  const handleDelete = () => {
    Alert.alert("Xác nhận", "Bạn có muốn xóa cuộc trò chuyện này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () => {
          closeSheet(async () => {
            try {
              await deleteConversation(
                user?.userId,
                conversation.conversationId,
              );
              dispatch(removeConversation(conversation.conversationId));
            } catch (err) {
              console.error(err);
            }
          });
        },
      },
    ]);
  };
  const handleSelectMulti = () => {
    closeSheet(() => onSelectToggle?.(conversation.conversationId));
  };

  return (
    <>
      <TouchableOpacity
        onPress={() =>
          isSelectMode
            ? onSelectToggle?.(conversation.conversationId)
            : router.push(`/private/chat/${conversation.conversationId}`)
        }
        onLongPress={isSelectMode ? undefined : openSheet}
        activeOpacity={0.6}
        style={[
          styles.container,
          { backgroundColor: isSelected ? "#eff6ff" : "#fff" },
        ]}
      >
        {isSelectMode && (
          <View style={styles.checkboxContainer}>
            <View
              style={[styles.checkbox, isSelected && styles.checkboxActive]}
            >
              {isSelected && (
                <Ionicons name="checkmark" size={13} color="#fff" />
              )}
            </View>
          </View>
        )}

        <Image source={{ uri: conversation.avatar }} style={styles.avatar} />

        <View style={styles.content}>
          <View style={styles.row}>
            <View style={styles.nameWrapper}>
              {conversation.type === "GROUP" && (
                <MaterialIcons
                  name="group"
                  size={14}
                  color="#9ca3af"
                  style={{ marginRight: 3 }}
                />
              )}
              <Text numberOfLines={1} style={styles.nameText}>
                {conversation.name}
              </Text>
              {conversation.pinned && (
                <MaterialIcons
                  name="push-pin"
                  size={12}
                  color="#3b82f6"
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
            <View style={styles.timeWrapper}>
              {conversation.muted && (
                <Ionicons
                  name="notifications-off-outline"
                  size={13}
                  color="#9ca3af"
                />
              )}
              <Text style={styles.timeText}>
                {formatMessageTime(conversation.lastMessageAt)}
              </Text>
            </View>
          </View>

          <View style={styles.previewRow}>
            <Text numberOfLines={1} style={styles.previewText}>
              {conversation.type === "PRIVATE" && !isOwn
                ? ""
                : `${isOwn ? "Bạn" : lastMessage?.senderName || "..."}: `}
              {preview.icon && (
                <View style={{ paddingTop: 2 }}>{preview.icon}</View>
              )}{" "}
              {preview.text}
            </Text>
            {conversation.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {conversation.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>

      <Modal
        visible={menuVisible}
        transparent
        statusBarTranslucent
        animationType="none"
      >
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={{ flex: 1 }} onPress={() => closeSheet()} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: Animated.add(translateY, dragY) }] },
          ]}
        >
          <View {...panResponder.panHandlers} style={styles.sheetHandle}>
            <View style={styles.handleBar} />
          </View>

          <View style={styles.sheetHeader}>
            <Image
              source={{ uri: conversation.avatar }}
              style={styles.smallAvatar}
            />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={styles.sheetName}>
                {conversation.name}
              </Text>
              <Text numberOfLines={1} style={styles.sheetSub}>
                {preview.text}
              </Text>
            </View>
          </View>

          {subMenu === "mute" ? (
            <View>
              <TouchableOpacity
                onPress={() => setSubMenu(null)}
                style={styles.backBtn}
              >
                <Ionicons name="chevron-back" size={18} color="#6b7280" />
                <Text style={styles.backBtnText}>Tắt thông báo</Text>
              </TouchableOpacity>
              {[
                { label: "Trong 1 giờ", d: 60 },
                { label: "Trong 4 giờ", d: 240 },
                { label: "Đến 8:00 AM", d: -2 },
                { label: "Đến khi mở lại", d: -1 },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.label}
                  onPress={() => handleMute(opt.d)}
                  style={styles.menuItem}
                >
                  <Text style={styles.menuItemText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View>
              <SheetItem
                icon={
                  <MaterialIcons name="push-pin" size={21} color="#374151" />
                }
                label={
                  conversation.pinned ? "Bỏ ghim hội thoại" : "Ghim hội thoại"
                }
                onPress={handlePin}
              />
              <SheetItem
                icon={
                  <Ionicons
                    name={
                      conversation.muted
                        ? "notifications-outline"
                        : "notifications-off-outline"
                    }
                    size={21}
                    color="#374151"
                  />
                }
                label={
                  conversation.muted ? "Bật lại thông báo" : "Tắt thông báo"
                }
                onPress={() =>
                  conversation.muted ? handleMute(0) : setSubMenu("mute")
                }
                hasArrow={!conversation.muted}
              />
              <SheetItem
                icon={
                  <Ionicons name="eye-off-outline" size={21} color="#374151" />
                }
                label={
                  conversation.hidden ? "Bỏ ẩn trò chuyện" : "Ẩn trò chuyện"
                }
                onPress={handleHide}
              />
              <SheetItem
                icon={
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={21}
                    color="#374151"
                  />
                }
                label="Chọn nhiều"
                onPress={handleSelectMulti}
              />
              <View style={styles.divider} />
              <SheetItem
                icon={
                  <Ionicons name="trash-outline" size={21} color="#ef4444" />
                }
                label="Xóa hội thoại"
                labelStyle={{ color: "#ef4444" }}
                onPress={handleDelete}
              />
            </View>
          )}
          <View style={{ height: 30 }} />
        </Animated.View>
      </Modal>
    </>
  );
};

const SheetItem = ({ icon, label, onPress, hasArrow, labelStyle }: any) => (
  <TouchableOpacity onPress={onPress} style={styles.sheetItemBtn}>
    {icon}
    <Text style={[styles.sheetItemLabel, labelStyle]}>{label}</Text>
    {hasArrow && <Ionicons name="chevron-forward" size={16} color="#c4c4c4" />}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f0f0",
  },
  checkboxContainer: { marginRight: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#d1d5db",
  },
  checkboxActive: {
    borderColor: "#3b82f6",
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  content: { flex: 1, marginLeft: 12 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  nameWrapper: { flex: 1, flexDirection: "row", alignItems: "center" },
  nameText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    maxWidth: "80%",
  },
  timeWrapper: { flexDirection: "row", alignItems: "center", gap: 4 },
  timeText: { fontSize: 11, color: "#9ca3af" },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  previewText: { fontSize: 13, color: "#6b7280", flex: 1, marginRight: 8 },
  unreadBadge: {
    backgroundColor: "#ef4444",
    borderRadius: 10,
    paddingHorizontal: 6,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: "hidden",
  },
  sheetHandle: { alignItems: "center", paddingTop: 10, paddingBottom: 6 },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e0e0e0",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f0f0",
  },
  smallAvatar: { width: 38, height: 38, borderRadius: 19, marginRight: 12 },
  sheetName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  sheetSub: { fontSize: 12, color: "#9ca3af" },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f5f5f5",
  },
  backBtnText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  menuItem: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f5f5f5",
  },
  menuItemText: { fontSize: 15, color: "#111827" },
  sheetItemBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 16,
  },
  sheetItemLabel: { flex: 1, fontSize: 15, color: "#111827" },
  divider: { height: 0.5, backgroundColor: "#f0f0f0", marginVertical: 4 },
});

export default React.memo(ConversationItem);
