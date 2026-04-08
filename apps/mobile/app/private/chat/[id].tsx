import React, { useEffect, useState, useRef } from "react";
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Text,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSocket } from "@/contexts/SocketContext";
import { messageService } from "@/services/message.service";
import { useAppSelector } from "@/store/store";
import type { MessagesType } from "@/types/messages.type";
import Header from "@/components/common/Header";
import Container from "@/components/common/Container";
import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";
import PinnedMessagesBar from "@/components/chat/PinnedMessagesBar";
import {
  getDateLabel,
  isSameHourAndMinute,
} from "@/utils/format-message-time..util";

export default function ChatWindow() {
  const conversations = useAppSelector((state) => state.conversation.conversations);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { socket } = useSocket();
  const user = useAppSelector((state) => state.auth.user);

  const coversation = conversations.find((c) => c.conversationId === id);

  const [messages, setMessages] = useState<MessagesType[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<MessagesType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const isFirstLoad = useRef(true);
  const isFetchingRef = useRef(false);

  // ================= FETCH =================
  const fetchInitialMessages = async () => {
    if (!id || !user?.userId) return;

    try {
      setIsLoading(true);

      const res = await messageService.getMessagesFromConversation(
        id,
        user.userId,
        null,
        20
      );

      if (res.success) {
        setMessages(res.data.messages);
        setNextCursor(res.data.nextCursor);
      }

      const pinRes = await messageService.getPinnedMessages(id, user.userId);
      if (pinRes.success) {
        setPinnedMessages(pinRes.data.messages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // ================= LOAD MORE =================
  const loadMoreMessages = async () => {
    if (!id || !user?.userId || !nextCursor || isFetchingRef.current) return;

    isFetchingRef.current = true;

    try {
      const res = await messageService.getMessagesFromConversation(
        id,
        user.userId,
        nextCursor,
        20
      );

      if (res.success && res.data.messages.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m._id));
          const uniqueNew = res.data.messages.filter(
            (m: MessagesType) => !existingIds.has(m._id)
          );

          return [...uniqueNew, ...prev];
        });

        setNextCursor(res.data.nextCursor);
      }
    } catch (err) {
      console.error(err);
    } finally {
      isFetchingRef.current = false;
    }
  };

  // ================= SEND =================
  const handleSendMessage = async (text: string) => {
    if (!id || !user?.userId) return;

    try {
      await messageService.sendMessage(id, user.userId, { text });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendFile = async (file: any) => {
    if (!id || !user?.userId) return;

    try {
      await messageService.sendMessage(id, user.userId, undefined, file);
    } catch (err) {
      console.error(err);
    }
  };

  // ================= PIN =================
  const handleTogglePin = async (messageId: string) => {
    if (!id || !user?.userId) return;

    try {
      await messageService.pinnedMessage(user.userId, messageId, id);
    } catch (err) {
      Alert.alert("Lỗi", "Bạn chỉ có thể ghim tối đa 3 tin nhắn");
    }
  };

  // ================= ACTION =================
  const handleMessageAction = (msg: MessagesType) => {
    const isMe = msg.senderId._id === user?.userId;
    const isPinned = pinnedMessages.some((p) => p._id === msg._id);

    const actions: any[] = [
      {
        text: isPinned ? "Bỏ ghim" : "Ghim tin nhắn",
        onPress: () => handleTogglePin(msg._id),
      },
      {
        text: "Xóa cho tôi",
        onPress: async () => {
          await messageService.deleteMessageForMe(
            user!.userId,
            msg._id,
            id!
          );
          setMessages((prev) => prev.filter((m) => m._id !== msg._id));
        },
      },
    ];

    if (isMe && !msg.recalled) {
      actions.push({
        text: "Thu hồi",
        onPress: async () => {
          try {
            await messageService.recalledMessage(
              user!.userId,
              msg._id,
              id!
            );
          } catch {
            Alert.alert("Lỗi", "Chỉ thu hồi trong 24h");
          }
        },
      });
    }

    actions.push({ text: "Hủy", style: "cancel" });

    Alert.alert("Tùy chọn", "", actions);
  };

  // ================= JUMP =================
  const handleJumpToMessage = async (messageId: string) => {
    if (!id || !user?.userId) return;

    const res = await messageService.getMessagesAroundPinnedMessage(
      id,
      user.userId,
      messageId,
      15
    );

    if (res.success) {
      setMessages(res.data.messages);
      setNextCursor(res.data.nextCursor);

      setTimeout(() => {
        const index = res.data.messages.findIndex(
          (m: any) => m._id === messageId
        );
        if (index !== -1) {
          flatListRef.current?.scrollToIndex({
            index,
            animated: true,
          });
        }
      }, 100);
    }
  };

  // ================= EFFECT =================
  useEffect(() => {
    fetchInitialMessages();
    if (id && user?.userId) {
      messageService.readReceipt(user.userId, id);
    }
  }, [id]);

  // auto scroll lần đầu
  useEffect(() => {
    if (messages.length && isFirstLoad.current) {
      flatListRef.current?.scrollToEnd({ animated: false });
      isFirstLoad.current = false;
    }
  }, [messages]);

  // ================= SOCKET =================
  useEffect(() => {
    if (!socket || !id) return;

    socket.emit("join_room", id);

    const handleNewMessage = (newMessage: MessagesType) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === newMessage._id)) return prev;
        return [...prev, newMessage];
      });

      flatListRef.current?.scrollToEnd({ animated: true });

      messageService.readReceipt(user!.userId, id);
    };

    const handleMessageReacted = (data: any) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === data.messageId
            ? { ...m, reactions: data.reactions }
            : m
        )
      );
    };

    const handleMessageRecalled = (data: any) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === data.messageId ? { ...m, recalled: true } : m
        )
      );
    };

    const handleMessagePinned = (data: any) => {
      setPinnedMessages(data.pinnedMessages);

      setMessages((prev) =>
        prev.map((m) =>
          m._id === data.messageId
            ? { ...m, pinned: data.pinned }
            : m
        )
      );
    };

    socket.on("new_message", handleNewMessage);
    socket.on("message_reacted", handleMessageReacted);
    socket.on("message_recalled", handleMessageRecalled);
    socket.on("message_pinned", handleMessagePinned);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("message_reacted", handleMessageReacted);
      socket.off("message_recalled", handleMessageRecalled);
      socket.off("message_pinned", handleMessagePinned);
      socket.emit("leave_room", id);
    };
  }, [socket, id]);

  // ================= RENDER =================
  const renderItem = ({ item, index }: any) => {
    const older = messages[index + 1];
    const newer = messages[index - 1];

    const isMe = item.senderId._id === user?.userId;

    const sameSenderOlder = older && older.senderId._id === item.senderId._id;
    const sameMinuteOlder =
      older && isSameHourAndMinute(older.createdAt, item.createdAt);

    const isFirstInCluster = !(sameSenderOlder && sameMinuteOlder);

    const sameSenderNewer = newer && newer.senderId._id === item.senderId._id;
    const sameMinuteNewer =
      newer && isSameHourAndMinute(newer.createdAt, item.createdAt);

    const isLastInCluster = !(sameSenderNewer && sameMinuteNewer);

    const showAvatar = !isMe && isFirstInCluster;
    const showName = !isMe && isFirstInCluster;
    const showTime = isLastInCluster;

    const showDivider =
      !older ||
      new Date(older.createdAt).toDateString() !==
      new Date(item.createdAt).toDateString();

    return (
      <View>
        {showDivider && (
          <View className="flex-row justify-center my-4">
            <View className="bg-gray-300 px-3 py-1 rounded-full">
              <Text className="text-white text-[10px] font-bold">
                {getDateLabel(item.createdAt)}
              </Text>
            </View>
          </View>
        )}

        <MessageBubble
          message={item}
          isMe={isMe}
          showAvatar={showAvatar}
          showName={showName}
          showTime={showTime}
          onLongPress={() => handleMessageAction(item)}
        />
      </View>
    );
  };

  return (
    <Container>
      <Header
        gradient
        back
        centerChild={
          <Text className="text-white text-lg font-bold">{coversation?.name}</Text>
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <PinnedMessagesBar
          pinnedMessages={pinnedMessages}
          onUnpin={handleTogglePin}
          onJumpToMessage={handleJumpToMessage}
        />

        <View className="flex-1 bg-[#F1F2F4]">
          {isLoading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#0068FF" />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              inverted
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
              contentContainerStyle={{ padding: 16 }}
              onEndReached={loadMoreMessages}
              onEndReachedThreshold={0.3}
            />
          )}

          <ChatInput
            onSendMessage={handleSendMessage}
            onSendFile={handleSendFile}
          />
        </View>
      </KeyboardAvoidingView>
    </Container>
  );
}