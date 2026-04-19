import { useCallback, useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import Container from "@/components/common/Container";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { useSocket } from "@/contexts/SocketContext";
import {
  fetchConversations,
  updateConversationFromSocket,
  type ConversationItem,
} from "@/store/slices/conversationSlice";

import CreateGroupModal from "@/components/chat/CreateGroupModal";

// --- HELPERS ---
function formatConversationTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function getLastMessageText(item: ConversationItem) {
  const lastMsg = item.lastMessage;
  if (!lastMsg) return "Chưa có tin nhắn";
  if (lastMsg.recalled) return "Tin nhắn đã thu hồi";

  const prefix =
    item.type === "GROUP" && lastMsg.senderName && lastMsg.senderName !== "Bạn"
      ? `${lastMsg.senderName}: `
      : "";

  // Logic hiển thị icon/text cho các loại tin nhắn đặc biệt
  if (lastMsg.type === "CALL")
    return `[Cuộc gọi ${lastMsg.content?.text?.toLowerCase().includes("video") ? "video" : "thoại"}]`;
  if (lastMsg.content?.file?.type === "IMAGE") return `${prefix}[Hình ảnh]`;
  if (lastMsg.content?.file?.type === "VIDEO") return `${prefix}[Video]`;
  if (lastMsg.content?.file) return `${prefix}[Tệp đính kèm]`;
  if (lastMsg.content?.icon) return `${prefix}[Sticker]`;

  return `${prefix}${lastMsg.content?.text || ""}`;
}

function getAvatarFallback(name?: string) {
  if (!name?.trim()) return "?";
  return name.trim().charAt(0).toUpperCase();
}

export default function ChatTabScreen() {
  const dispatch = useAppDispatch();
  const { socket } = useSocket();
  const { items, loading, error } = useAppSelector(
    (state) => state.conversation,
  );
  const user = useAppSelector((state) => state.auth.user);

  const [activeTab, setActiveTab] = useState<"PRIORITY" | "OTHER">("PRIORITY");

  const [isCreateGroupVisible, setIsCreateGroupVisible] = useState(false);

  // Logic Sắp xếp & Lọc: Ưu tiên ghim -> Tin nhắn mới nhất
  const visibleConversations = useMemo(() => {
    return [...items]
      .filter((c) => !c.hidden)
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return (
          new Date(b.lastMessageAt || 0).getTime() -
          new Date(a.lastMessageAt || 0).getTime()
        );
      });
  }, [items]);

  // Khởi tạo dữ liệu
  useEffect(() => {
    dispatch(fetchConversations());
  }, [dispatch]);

  // Real-time cập nhật danh sách qua Socket
  useEffect(() => {
    if (!socket) return;

    socket.on("new_message_sidebar", (data) => {
      dispatch(updateConversationFromSocket(data));
    });

    socket.on("call_updated", (data) => {
      dispatch(
        updateConversationFromSocket({
          conversationId: data.conversationId,
          lastMessage: {
            type: "CALL",
            content: {
              text:
                data.status === "ENDED"
                  ? "Cuộc gọi đã kết thúc"
                  : "Cuộc gọi nhỡ",
            },
          },
          lastMessageAt: new Date().toISOString(),
        }),
      );
    });

    return () => {
      socket.off("new_message_sidebar");
      socket.off("call_updated");
    };
  }, [socket, dispatch]);

  const onRefresh = useCallback(() => {
    dispatch(fetchConversations());
  }, [dispatch]);

  const renderItem = ({ item }: { item: ConversationItem }) => {
    const unreadCount = item.unreadCount ?? 0;
    const lastMessageText = getLastMessageText(item);
    const isGroup = item.type === "GROUP";

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/private/chat/${item.conversationId}`)}
        className={`flex-row items-center px-4 py-3 ${item.pinned ? "bg-[#f0f7ff]" : "bg-white"}`}
      >
        {/* Avatar Area */}
        <View className="w-14 h-14 rounded-full overflow-hidden mr-3 bg-[#dbeafe] items-center justify-center relative">
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} className="w-full h-full" />
          ) : isGroup ? (
            <Ionicons name="people" size={24} color="#0068ff" />
          ) : (
            <Text className="text-[#0068ff] font-bold text-lg">
              {getAvatarFallback(item.name)}
            </Text>
          )}
        </View>

        {/* Info Area */}
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center flex-1 mr-2">
              <Text
                className="text-[16px] font-semibold text-black truncate"
                numberOfLines={1}
              >
                {item.name}
              </Text>
              {item.pinned && (
                <Ionicons
                  name="pin"
                  size={12}
                  color="#0068ff"
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
            <Text className="text-[11px] text-gray-400">
              {formatConversationTime(item.lastMessageAt)}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text
              className={`text-[14px] flex-1 mr-2 ${unreadCount > 0 ? "font-semibold text-black" : "text-gray-500"}`}
              numberOfLines={1}
            >
              {lastMessageText}
            </Text>
            {unreadCount > 0 && (
              <View className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#ef4444] items-center justify-center">
                <Text className="text-white text-[10px] font-bold">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Container className="bg-[#f5f6f8]">
      {/* 1. BLUE HEADER (ZALO STYLE) */}
      <View className="h-14 bg-[#0068ff] flex-row items-center px-3">
        <TouchableOpacity className="w-9 h-9 items-center justify-center">
          <MaterialCommunityIcons name="qrcode-scan" size={22} color="white" />
        </TouchableOpacity>
        <View className="flex-1 h-9 bg-white/20 rounded-lg mx-2 flex-row items-center px-3">
          <Ionicons name="search-outline" size={18} color="white" />
          <Text className="text-white/70 ml-2 text-[13px]">Tìm kiếm</Text>
        </View>
        <TouchableOpacity
          className="w-9 h-9 items-center justify-center"
          onPress={() => setIsCreateGroupVisible(true)}
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* 2. TAB SWITCHER */}
      <View className="flex-row items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
        <View className="flex-row gap-6">
          <Pressable
            onPress={() => setActiveTab("PRIORITY")}
            className={`pb-1 ${activeTab === "PRIORITY" ? "border-b-2 border-blue-500" : ""}`}
          >
            <Text
              className={`text-[14px] ${activeTab === "PRIORITY" ? "font-bold text-blue-500" : "text-gray-500"}`}
            >
              Ưu tiên
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("OTHER")}
            className={`pb-1 ${activeTab === "OTHER" ? "border-b-2 border-blue-500" : ""}`}
          >
            <Text
              className={`text-[14px] ${activeTab === "OTHER" ? "font-bold text-blue-500" : "text-gray-500"}`}
            >
              Khác
            </Text>
          </Pressable>
        </View>
        <View className="flex-row items-center gap-3">
          <Ionicons name="filter-outline" size={18} color="#6b7280" />
        </View>
      </View>

      {/* 3. CONVERSATION LIST */}
      {loading && items.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0068ff" />
        </View>
      ) : (
        <FlatList
          data={visibleConversations}
          keyExtractor={(item) => item.conversationId}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={onRefresh} />
          }
          ItemSeparatorComponent={() => (
            <View className="h-[0.5px] bg-gray-100 ml-20" />
          )}
          ListEmptyComponent={
            <View className="py-20 items-center px-10">
              <Text className="text-gray-400 text-center">
                Chưa có cuộc trò chuyện nào. Hãy kết nối với bạn bè!
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
      <CreateGroupModal
        visible={isCreateGroupVisible}
        onClose={() => setIsCreateGroupVisible(false)}
        navigation={router}
      />
    </Container>
  );
}
