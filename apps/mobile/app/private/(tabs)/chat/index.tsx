import { useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import Container from "@/components/common/Container";
import { useAppDispatch, useAppSelector } from "@/store/store";
import {
  fetchConversations,
  type ConversationItem,
} from "@/store/slices/conversationSlice";

function formatConversationTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();

  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
}

function getLastMessageText(conversation: ConversationItem) {
  if (!conversation.lastMessage) return "";
  if (conversation.lastMessage.recalled) return "Tin nhắn đã thu hồi";
  if (conversation.lastMessage.content?.text) return conversation.lastMessage.content.text;
  if (conversation.lastMessage.content?.icon) return "Sticker";
  if (conversation.lastMessage.content?.file) return "Tệp đính kèm";
  return "";
}

function getAvatarFallback(name?: string) {
  if (!name?.trim()) return "?";
  return name.trim().charAt(0).toUpperCase();
}

export default function ChatTabScreen() {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((state) => state.conversation);

  useEffect(() => {
    dispatch(fetchConversations());
  }, [dispatch]);

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
        onPress={() => {
          try {
            console.log("Navigate to chat with id:", item.conversationId);
            if (!item.conversationId) return;
            router.push(`/private/chat?id=${encodeURIComponent(item.conversationId)}`);
          } catch (err) {
            console.log("router.push error:", err);
          }
        }}
        className="flex-row items-center px-4 py-3 bg-white"
      >
        <View className="w-13 h-13 rounded-full overflow-hidden mr-3 bg-[#dbeafe] items-center justify-center">
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} className="w-full h-full" />
          ) : isGroup ? (
            <Ionicons name="people" size={22} color="#0f172a" />
          ) : (
            <Text className="text-[#0f172a] font-semibold text-base">
              {getAvatarFallback(item.name)}
            </Text>
          )}
        </View>

        <View className="flex-1 min-w-0">
          <Text className="text-[15px] font-bold text-black" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-[13px] text-gray-500 mt-0.5" numberOfLines={1}>
            {lastMessageText || "Chưa có tin nhắn"}
          </Text>
        </View>

        <View className="items-end ml-3">
          <Text className="text-[11px] text-gray-400">
            {formatConversationTime(item.lastMessageAt)}
          </Text>
          {unreadCount > 0 && (
            <View className="mt-1 min-w-5 h-5 px-1 rounded-full bg-[#ef4444] items-center justify-center">
              <Text className="text-white text-[11px] font-semibold">
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Container className="bg-[#f5f6f8]">
      <View className="h-14 bg-[#0068ff] flex-row items-center px-3">
        <TouchableOpacity className="w-9 h-9 items-center justify-center">
          <MaterialCommunityIcons name="qrcode-scan" size={22} color="white" />
        </TouchableOpacity>

        <View className="flex-1 h-9 bg-white rounded-lg mx-2 flex-row items-center px-3">
          <Ionicons name="search-outline" size={18} color="#9ca3af" />
          <Text className="text-gray-400 ml-2 text-[13px]">Tìm kiếm</Text>
        </View>

        <TouchableOpacity className="w-9 h-9 items-center justify-center">
          <Ionicons name="add" size={26} color="white" />
        </TouchableOpacity>
      </View>

      {error ? (
        <View className="px-4 py-2 bg-[#fff1f2]">
          <Text className="text-[#be123c] text-[12px]">{error}</Text>
        </View>
      ) : null}

      {loading && items.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#0068ff" />
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.conversationId}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
        ItemSeparatorComponent={() => <View className="h-[1px] bg-gray-100 ml-20" />}
        ListEmptyComponent={
          !loading ? (
            <View className="py-10 items-center">
              <Text className="text-gray-400">Chưa có cuộc trò chuyện nào</Text>
            </View>
          ) : null
        }
      />
    </Container>
  );
}
