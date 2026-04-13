import { FlatList, View, Text, RefreshControl, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector } from "@/store/store";
import Container from "@/components/common/Container";
import Header from "@/components/common/Header";
import SearchIcon from "@/components/common/SearchIcon";
import SearchLabel from "@/components/common/SearchLabel";
import ConversationItem from "@/components/chat/ConversationItem";
import { useEffect, useState } from "react";
import { conversationService } from "@/services/conversation.service";
import { useSocket } from "@/contexts/SocketContext";
import { router } from "expo-router";
import {
  setConversations,
  updateConversation,
} from "@/store/slices/conversationSlice";
import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/store/store";

const selectVisibleConversations = createSelector(
  (state: RootState) => state.conversation.conversations,
  (conversations) =>
    [...conversations]
      .filter((c) => !c.hidden)
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return (
          new Date(b.lastMessageAt).getTime() -
          new Date(a.lastMessageAt).getTime()
        );
      }),
);

export default function Home() {
  const dispatch = useAppDispatch();
  const { socket } = useSocket();

  const conversations = useAppSelector(selectVisibleConversations);
  const user = useAppSelector((state) => state.auth.user);

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"PRIORITY" | "OTHER">("PRIORITY");

  // 🔥 Load conversations
  const loadConversations = async () => {
    if (!user?.userId) return;

    const res = await conversationService.getConversationsFromUserId(
      user.userId,
    );

    if ((res as any).success) {
      dispatch(setConversations(res.data));
    }
  };
  // 🔄 Pull refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  useEffect(() => {
    loadConversations();
  }, [user?.userId]);

  // ⚡ Realtime
  useEffect(() => {
    if (!socket || !user?.userId) return;

    const handleNewMessage = (newMessage: any) => {
      // Chỉ update conversation tương ứng, KHÔNG ghi đè toàn bộ store
      // để tránh mất trạng thái pin/mute đã thay đổi local
      if (newMessage?.conversation) {
        dispatch(updateConversation(newMessage.conversation));
      }
    };

    socket.on("new_message", handleNewMessage);

    return () => {
      socket.off("new_message", handleNewMessage);
    };
  }, [socket, user?.userId]);

  return (
    <Container>
      <Header
        gradient
        centerChild={<SearchLabel />}
        leftChild={<SearchIcon />}
      />

      <View className="flex-1 bg-white">
        {/* Tabs */}
        <View className="flex-row items-center justify-between px-4 py-2 border-b border-gray-100">
          <View className="flex-row gap-6">
            <Pressable
              onPress={() => setActiveTab("PRIORITY")}
              className={`pb-1 ${activeTab === "PRIORITY" ? "border-b-2 border-blue-500" : ""}`}
            >
              <Text
                className={`text-[13px] ${activeTab === "PRIORITY" ? "font-bold text-blue-500" : "font-medium text-gray-500"}`}
              >
                Ưu tiên
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab("OTHER")}
              className={`pb-1 ${activeTab === "OTHER" ? "border-b-2 border-blue-500" : ""}`}
            >
              <Text
                className={`text-[13px] ${activeTab === "OTHER" ? "font-bold text-blue-500" : "font-medium text-gray-500"}`}
              >
                Khác
              </Text>
            </Pressable>
          </View>

          <View className="flex-row items-center gap-3">
            <Pressable className="flex-row items-center bg-gray-50 px-2 py-1 rounded">
              <Text className="text-[12px] text-gray-500 mr-1">Phân loại</Text>
              <Ionicons name="chevron-down" size={12} color="#6b7280" />
            </Pressable>
            <Pressable>
              <Ionicons name="ellipsis-horizontal" size={18} color="#6b7280" />
            </Pressable>
          </View>
        </View>

        {conversations.length === 0 ? (
          <View className="flex-1 items-center justify-center px-10">
            <Text className="text-gray-400 text-center text-sm">
              Chưa có cuộc trò chuyện nào. Hãy bắt đầu nhắn tin!
            </Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.conversationId}
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/private/chat/[id]",
                    params: {
                      id: item.conversationId,
                      conversation: JSON.stringify(item),
                    },
                  })
                }
              >
                <ConversationItem
                  conversation={item}
                  currentUserId={user?.userId || ""}
                />
              </Pressable>
            )}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 20 }}
            initialNumToRender={12}
            maxToRenderPerBatch={12}
            windowSize={10}
            removeClippedSubviews
          />
        )}
      </View>
    </Container>
  );
}
