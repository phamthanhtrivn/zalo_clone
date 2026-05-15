import { FlatList, View, Text, RefreshControl, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import ConversationItem from "@/components/chat/ConversationItem";
import { useEffect, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { conversationService } from "@/services/conversation.service";
import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/store/store";
import { useSocket } from "@/contexts/SocketContext";
import {
  removeExpiredMessages,
  setConversations,
  updateConversation,
} from "@/store/slices/conversationSlice";
import CreateGroupModal from "@/components/chat/CreateGroupModal";

export default function GroupsTab() {
  const dispatch = useAppDispatch();
  const { socket } = useSocket();

  const selectGroupConversations = createSelector(
    (state: RootState) => state.conversation.conversations,
    (conversations) =>
      [...conversations]
        .filter((c) => c.type === "GROUP" && !c.hidden)
        .sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return (
            new Date(b.lastMessageAt).getTime() -
            new Date(a.lastMessageAt).getTime()
          );
        }),
  );

  const conversations = useAppSelector(selectGroupConversations);
  const user = useAppSelector((state) => state.auth.user);

  const [refreshing, setRefreshing] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!user?.userId) return;

    const res = await conversationService.getConversationsFromUserId(
      user.userId,
    );

    if ((res as any).success) {
      dispatch(setConversations(res.data));
    }
  }, [dispatch, user?.userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!socket || !user?.userId) return;

    const handleNewMessage = (newMessage: any) => {
      if (newMessage?.conversation) {
        dispatch(updateConversation(newMessage.conversation));
      }
    };

    socket.on("new_message", handleNewMessage);

    return () => {
      socket.off("new_message", handleNewMessage);
    };
  }, [socket, user?.userId, dispatch]);

  useEffect(() => {
    const expiringConversations = conversations.filter(
      (conversation) =>
        conversation.lastMessage &&
        !conversation.lastMessage.expired &&
        conversation.lastMessage.expiresAt,
    );

    if (!expiringConversations.length) return;

    const nextExpiryAt = Math.min(
      ...expiringConversations
        .map((conversation) =>
          new Date(conversation.lastMessage.expiresAt!).getTime(),
        )
        .filter((time) => !Number.isNaN(time)),
    );

    if (!Number.isFinite(nextExpiryAt)) return;

    const syncExpiredConversations = () => {
      const expiredMessageIds = conversations
        .filter((conversation) => {
          const expiresAt = conversation.lastMessage?.expiresAt;
          if (conversation.lastMessage?.expired || !expiresAt) return false;

          const expiresAtMs = new Date(expiresAt).getTime();
          return !Number.isNaN(expiresAtMs) && expiresAtMs <= Date.now();
        })
        .map((conversation) => conversation.lastMessage!._id);

      if (expiredMessageIds.length) {
        dispatch(removeExpiredMessages(expiredMessageIds));
      }
    };

    const delay = nextExpiryAt - Date.now();
    if (delay <= 0) {
      syncExpiredConversations();
      return;
    }

    const timeoutId = setTimeout(syncExpiredConversations, delay + 50);
    return () => clearTimeout(timeoutId);
  }, [conversations, dispatch]);

  return (
    <View className="flex-1 bg-white">
      <TouchableOpacity
        onPress={() => setIsCreateGroupOpen(true)}
        className="px-4 py-4 flex-row items-center border-b border-gray-100"
      >
        <View className="w-12 h-12 bg-blue-50 rounded-full items-center justify-center">
          <MaterialIcons name="group-add" size={26} color="#3b82f6" />
        </View>
        <Text className="ml-4 text-base text-blue-600 font-medium">Tạo nhóm mới</Text>
      </TouchableOpacity>

      <View className="bg-gray-100 px-4 py-2 flex-row justify-between items-center">
        <Text className="text-xs font-bold text-gray-600 uppercase">Nhóm đang tham gia ({conversations.length})</Text>
        <MaterialIcons name="sort" size={18} color="#666" />
      </View>

      {conversations.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <Text className="text-gray-400 text-center text-sm">
            Chưa có nhóm nào.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.conversationId}
          renderItem={({ item }) => (
            <ConversationItem conversation={item} currentUserId={user?.userId || ""} />
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

      <CreateGroupModal
        visible={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onSuccess={loadConversations}
      />
    </View>
  );
}
