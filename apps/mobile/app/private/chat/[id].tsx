import React, { useEffect, useState, useRef } from "react";
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  ActionSheetIOS,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSocket } from "@/contexts/SocketContext";
import { messageService } from "@/services/message.service";
import { useAppDispatch, useAppSelector } from "@/store/store";
import type { MessagesType, ReactionType } from "@/types/messages.type";
import {
  EMOJI_MAP,
  REACTION_EMOJIS,
  type EmojiType,
} from "@/constants/emoji.constant";
import Container from "@/components/common/Container";
import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";
import PinnedMessagesBar from "@/components/chat/PinnedMessagesBar";
import ReactionPicker from "@/components/chat/ReactionPicker";
import ReactionModal from "@/components/chat/ReactionModal";
import ForwardModal from "@/components/chat/ForwardModal";
import MessageDetailModal from "@/components/chat/MessageDetailModal";
import ConversationInfoSheet from "@/components/chat/ConversationInfoSheet";
import {
  getDateLabel,
  isSameHourAndMinute,
} from "@/utils/format-message-time..util";
import { Image } from "expo-image";
import MenuItem from "@/components/chat/MenuItem";
import { conversationService } from "@/services/conversation.service";
import {
  setConversations,
  setReplyingMessage,
  clearReplyingMessage,
} from "@/store/slices/conversationSlice";
import { useVideoCall } from "@/contexts/VideoCallContext";

export default function ChatWindow() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { socket } = useSocket();
  const { startCall } = useVideoCall(); // Khôi phục logic Call

  const user = useAppSelector((state) => state.auth.user);
  const { items: conversations } = useAppSelector(
    (state) => state.conversation,
  );
  const replyingMessage = useAppSelector(
    (state) => state.conversation.replyingMessage,
  );

  const conversation = conversations?.find((c) => c.conversationId === id);
  const isGroup = conversation?.type === "GROUP";

  // ===== STATE =====
  const [messages, setMessages] = useState<MessagesType[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<MessagesType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [prevCursor, setPrevCursor] = useState<string | null>(null);
  const [contextMenuMsg, setContextMenuMsg] = useState<MessagesType | null>(
    null,
  );
  const [reactionPickerMsg, setReactionPickerMsg] =
    useState<MessagesType | null>(null);
  const [reactionModalData, setReactionModalData] = useState<
    ReactionType[] | null
  >(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [loadingForward, setLoadingForward] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);
  const [detailMessage, setDetailMessage] = useState<MessagesType | null>(null);
  const [showInfoSheet, setShowInfoSheet] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const isFirstLoad = useRef(true);
  const isFetchingRef = useRef(false);
  const isFetchingNewerRef = useRef(false);
  const isJumpingRef = useRef(false);
  const prevCursorRef = useRef<string | null>(null);

  const isPinned =
    contextMenuMsg && pinnedMessages.some((m) => m._id === contextMenuMsg._id);

  // ================= SCROLL & JUMP LOGIC =================
  const scrollToBottom = (animated = true) => {
    flatListRef.current?.scrollToEnd({ animated });
    setShowScrollToBottom(false);
  };

  const handleGoToNewest = () => {
    isFirstLoad.current = true;
    setPrevCursor(null);
    fetchInitialMessages();
  };

  // ================= FETCH LOGIC =================
  const fetchInitialMessages = async () => {
    if (!id || !user?.userId) return;
    try {
      setIsLoading(true);
      const res: any = await messageService.getMessagesFromConversation(
        id,
        user.userId,
        null,
        20,
      );
      if (res.success) {
        const msgs = res.data.messages || [];
        setMessages([...msgs].reverse());
        setNextCursor(res.data.nextCursor);
        setPrevCursor(null);
      }
      const pinRes: any = await messageService.getPinnedMessages(
        id,
        user.userId,
      );
      if (pinRes.success) setPinnedMessages(pinRes.data.messages);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (!id || !user?.userId || !nextCursor || isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const res: any = await messageService.getMessagesFromConversation(
        id,
        user.userId,
        nextCursor,
        20,
      );
      if (res.success && res.data.messages.length > 0) {
        const sortedNew = [...res.data.messages].reverse();
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m._id));
          const uniqueNew = sortedNew.filter(
            (m: MessagesType) => !existingIds.has(m._id),
          );
          return [...uniqueNew, ...prev];
        });
        setNextCursor(res.data.nextCursor);
      }
    } finally {
      isFetchingRef.current = false;
    }
  };

  const loadNewerMessages = async () => {
    if (
      !id ||
      !user?.userId ||
      !prevCursor ||
      isFetchingNewerRef.current ||
      isJumpingRef.current
    )
      return;
    isFetchingNewerRef.current = true;
    try {
      const res: any = await messageService.getNewerMessages(
        id,
        user.userId,
        prevCursor,
        20,
      );
      if (res.success && res.data.messages.length > 0) {
        const sortedNew = [...res.data.messages].reverse();
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m._id));
          const uniqueNew = sortedNew.filter(
            (m: MessagesType) => !existingIds.has(m._id),
          );
          return [...prev, ...uniqueNew];
        });
        setPrevCursor(sortedNew[sortedNew.length - 1]._id);
      } else {
        setPrevCursor(null);
      }
    } finally {
      isFetchingNewerRef.current = false;
    }
  };

  // ================= ACTIONS =================
  const handleSendMessage = async (text: string) => {
    if (!id || !user?.userId) return;
    try {
      await messageService.sendMessage(
        id,
        user.userId,
        replyingMessage?._id,
        { text },
        null,
      );
      if (replyingMessage) dispatch(clearReplyingMessage());
      scrollToBottom();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendFile = async (files: any[]) => {
    if (!id || !user?.userId || files.length === 0) return;
    try {
      const mediaFiles = files.filter(
        (f) => f.type.startsWith("image/") || f.type.startsWith("video/"),
      );
      const docFiles = files.filter(
        (f) => !f.type.startsWith("image/") && !f.type.startsWith("video/"),
      );
      const promises = [];

      if (mediaFiles.length > 0) {
        const formData = new FormData();
        formData.append("conversationId", id);
        formData.append("senderId", user.userId);
        if (replyingMessage?._id)
          formData.append("repliedId", replyingMessage._id);
        mediaFiles.forEach((f) =>
          formData.append("files", {
            uri: f.uri,
            name: f.name,
            type: f.type,
          } as any),
        );
        promises.push(messageService.sendFormData(formData));
      }

      docFiles.forEach((f) => {
        const fd = new FormData();
        fd.append("conversationId", id);
        fd.append("senderId", user.userId);
        if (replyingMessage?._id) fd.append("repliedId", replyingMessage._id);
        fd.append("files", { uri: f.uri, name: f.name, type: f.type } as any);
        promises.push(messageService.sendFormData(fd));
      });

      await Promise.all(promises);
      if (replyingMessage) dispatch(clearReplyingMessage());
      scrollToBottom();
    } catch (err) {
      Alert.alert("Lỗi", "Gửi tệp thất bại");
    }
  };

  const handleVideoCall = async () => {
    if (!id || !user?.userId || !conversation?.otherMemberId) {
      Alert.alert("Lỗi", "Không thể thực hiện cuộc gọi.");
      return;
    }
    try {
      const res: any = await messageService.sendMessage(
        id,
        user.userId,
        undefined,
        { text: "Cuộc gọi video" },
        null,
        "VIDEO",
      );
      const messageId = res.data?._id || res?._id;
      if (messageId)
        startCall(conversation.otherMemberId, id, "VIDEO", messageId);
    } catch {
      Alert.alert("Lỗi", "Khởi tạo cuộc gọi thất bại.");
    }
  };

  const handleJumpToMessage = async (messageId: string) => {
    if (!id || !user?.userId) return;
    const res: any = await messageService.getMessagesAroundPinnedMessage(
      id,
      user.userId,
      messageId,
      15,
    );
    if (res.success) {
      isJumpingRef.current = true;
      setMessages(res.data.messages);
      setNextCursor(res.data.nextCursor);
      setPrevCursor(res.data.prevCursor);
      const index = res.data.messages.findIndex(
        (m: any) => m._id === messageId,
      );
      if (index !== -1) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index,
            animated: true,
            viewPosition: 0.5,
          });
          setHighlightedMessageId(messageId);
          setTimeout(() => {
            setHighlightedMessageId(null);
            isJumpingRef.current = false;
          }, 2500);
        }, 300);
      }
    }
  };

  const handleMessageLongPress = (msg: MessagesType) => {
    const isMe = (msg.senderId?._id || msg.senderId) === user?.userId;
    const options = [
      "Thả cảm xúc",
      "Trả lời",
      "Chuyển tiếp",
      isPinned ? "Bỏ ghim" : "Ghim",
      "Xóa phía tôi",
      ...(isMe && !msg.recalled ? ["Thu hồi"] : []),
      "Hủy",
    ];

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: options.indexOf("Xóa phía tôi"),
        },
        (idx) => {
          const action = options[idx];
          if (action === "Thả cảm xúc") setReactionPickerMsg(msg);
          if (action === "Trả lời") dispatch(setReplyingMessage(msg));
          if (action === "Chuyển tiếp") {
            setIsSelectMode(true);
            setSelectedMessages([msg._id]);
            setShowForwardModal(true);
          }
          if (action === "Ghim" || action === "Bỏ ghim")
            messageService.pinnedMessage(user!.userId, msg._id, id!);
          if (action === "Thu hồi")
            messageService.recalledMessage(user!.userId, msg._id, id!);
          if (action === "Xóa phía tôi")
            messageService
              .deleteMessageForMe(user!.userId, msg._id, id!)
              .then(() =>
                setMessages((p) => p.filter((m) => m._id !== msg._id)),
              );
        },
      );
    } else {
      setContextMenuMsg(msg); // Hiện overlay menu cho Android
    }
  };

  // ================= SOCKET LISTENERS =================
  useEffect(() => {
    if (!socket || !id || !user?.userId) return;
    socket.emit("join_room", id);

    const handleNewMessage = (msg: MessagesType) => {
      if (prevCursorRef.current) {
        setShowScrollToBottom(true);
        return;
      }
      setMessages((prev) =>
        prev.some((m) => m._id === msg._id) ? prev : [...prev, msg],
      );
      if (!showScrollToBottom) setTimeout(() => scrollToBottom(true), 100);
    };

    socket.on("new_message", handleNewMessage);
    socket.on("message_reacted", (data) =>
      setMessages((p) =>
        p.map((m) =>
          m._id === data.messageId ? { ...m, reactions: data.reactions } : m,
        ),
      ),
    );
    socket.on("message_recalled", (data) =>
      setMessages((p) =>
        p.map((m) => (m._id === data.messageId ? { ...m, recalled: true } : m)),
      ),
    );
    socket.on("messages_expired", (data) =>
      setMessages((p) =>
        p.map((m) =>
          data.messageIds.includes(m._id) ? { ...m, expired: true } : m,
        ),
      ),
    );
    socket.on("call_updated", (data) =>
      setMessages((p) =>
        p.map((m) =>
          m._id === data.messageId
            ? {
                ...m,
                call: {
                  ...m.call,
                  status: data.status,
                  duration: data.duration,
                },
              }
            : m,
        ),
      ),
    );

    return () => {
      [
        "new_message",
        "message_reacted",
        "message_recalled",
        "messages_expired",
        "call_updated",
      ].forEach((ev) => socket.off(ev));
      socket.emit("leave_room", id);
    };
  }, [socket, id, user?.userId, showScrollToBottom]);

  useEffect(() => {
    if (id && user?.userId) {
      fetchInitialMessages();
      dispatch(clearReplyingMessage());
      isFirstLoad.current = true;
    }
  }, [id, user?.userId]);

  useEffect(() => {
    prevCursorRef.current = prevCursor;
  }, [prevCursor]);

  // ================= RENDER ITEM =================
  const renderItem = ({ item, index }: any) => {
    const older = messages[index - 1];
    const sameSenderOlder =
      older &&
      (older.senderId?._id || older.senderId) ===
        (item.senderId?._id || item.senderId);
    const sameMinuteOlder =
      older && isSameHourAndMinute(older.createdAt, item.createdAt);
    const isFirstInCluster = !(sameSenderOlder && sameMinuteOlder);
    const showAvatar =
      (item.senderId?._id || item.senderId) !== user?.userId &&
      isFirstInCluster;
    const showDivider =
      !older ||
      new Date(older.createdAt).toDateString() !==
        new Date(item.createdAt).toDateString();

    return (
      <View
        style={{
          marginTop: isFirstInCluster && !showDivider ? 12 : 2,
          marginBottom: item.reactions?.length > 0 ? 14 : 0,
        }}
      >
        {showDivider && (
          <View style={{ alignItems: "center", marginVertical: 12 }}>
            <View
              style={{
                backgroundColor: "#babbbe",
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: "white", fontSize: 11 }}>
                {getDateLabel(item.createdAt)}
              </Text>
            </View>
          </View>
        )}
        <MessageBubble
          message={item}
          isMe={(item.senderId?._id || item.senderId) === user?.userId}
          showAvatar={showAvatar}
          showName={isGroup && showAvatar}
          showTime={true}
          isSelected={selectedMessages.includes(item._id)}
          isSelectMode={isSelectMode}
          isHighlighted={highlightedMessageId === item._id}
          onLongPress={() => handleMessageLongPress(item)}
          onPress={() =>
            isSelectMode &&
            setSelectedMessages((p) =>
              p.includes(item._id)
                ? p.filter((x) => x !== item._id)
                : [...p, item._id],
            )
          }
          onOpenReactionModal={(r) => setReactionModalData(r)}
          onReplyPress={handleJumpToMessage}
          isGroup={isGroup}
        />
      </View>
    );
  };

  return (
    <Container>
      {/* HEADER */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 10,
          backgroundColor: "#0068ff",
          gap: 10,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Image
          source={{ uri: conversation?.avatar }}
          style={{ width: 38, height: 38, borderRadius: 19 }}
        />
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: "white", fontSize: 16, fontWeight: "700" }}
            numberOfLines={1}
          >
            {conversation?.name}
          </Text>
        </View>
        <TouchableOpacity onPress={handleVideoCall}>
          <Ionicons name="videocam-outline" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowInfoSheet(true)}>
          <Ionicons name="information-circle-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 25}
      >
        <PinnedMessagesBar
          pinnedMessages={pinnedMessages}
          onUnpin={() => {}}
          onJumpToMessage={handleJumpToMessage}
        />

        <View style={{ flex: 1, backgroundColor: "#F1F2F4" }}>
          {isLoading ? (
            <ActivityIndicator style={{ flex: 1 }} color="#0068FF" />
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(m) => m._id}
              renderItem={renderItem}
              onScroll={(e) => {
                const { y } = e.nativeEvent.contentOffset;
                if (y < 100) loadMoreMessages();
                const isBottom =
                  y + e.nativeEvent.layoutMeasurement.height >=
                  e.nativeEvent.contentSize.height - 100;
                setShowScrollToBottom(!isBottom || !!prevCursor);
              }}
              onEndReached={() => prevCursor && loadNewerMessages()}
              onEndReachedThreshold={0.5}
              ListEmptyComponent={
                <View style={{ alignItems: "center", padding: 40 }}>
                  <Text style={{ color: "#9ca3af" }}>Chưa có tin nhắn nào</Text>
                </View>
              }
            />
          )}

          {/* REPLY BAR UI (Khôi phục từ KVT) */}
          {replyingMessage && (
            <View
              style={{
                backgroundColor: "white",
                padding: 10,
                borderTopWidth: 1,
                borderTopColor: "#e5e7eb",
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 4,
                  height: 30,
                  backgroundColor: "#0068ff",
                  borderRadius: 2,
                  marginRight: 10,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 12, fontWeight: "700", color: "#0068ff" }}
                >
                  Đang trả lời{" "}
                  {replyingMessage.senderId?.profile?.name || "Bạn"}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 12, color: "#6b7280" }}
                >
                  {replyingMessage.content?.text ||
                    (replyingMessage.content?.file
                      ? replyingMessage.content.file.fileName
                      : "[Đính kèm]")}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => dispatch(clearReplyingMessage())}
              >
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          )}

          <ChatInput
            conversationId={id!}
            chatName={conversation?.name}
            onSendMessage={handleSendMessage}
            onSendFiles={handleSendFile}
            isSelectMode={isSelectMode}
            selectedMessages={selectedMessages}
            onOpenForwardModal={() => setShowForwardModal(true)}
            onCancelSelect={() => {
              setIsSelectMode(false);
              setSelectedMessages([]);
            }}
          />

          {showScrollToBottom && (
            <TouchableOpacity
              onPress={handleGoToNewest}
              style={{
                position: "absolute",
                bottom: 100,
                right: 16,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "white",
                elevation: 4,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="chevron-down" size={24} color="#0068ff" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* MODALS */}
      {reactionPickerMsg && (
        <ReactionPicker
          visible={true}
          onClose={() => setReactionPickerMsg(null)}
          messageId={reactionPickerMsg._id}
          isMe={reactionPickerMsg.senderId?._id === user?.userId}
          currentUserId={user?.userId || ""}
          onReact={() => {}}
          onRemoveReaction={() => {}}
        />
      )}
      {reactionModalData && (
        <ReactionModal
          visible={true}
          onClose={() => setReactionModalData(null)}
          reactions={reactionModalData}
        />
      )}
      <ForwardModal
        visible={showForwardModal}
        onClose={() => setShowForwardModal(false)}
        conversations={conversations}
        selectedMessageIds={selectedMessages}
        onSubmit={() => {}}
        loadingForward={loadingForward}
      />
      <MessageDetailModal
        visible={!!detailMessage}
        onClose={() => setDetailMessage(null)}
        message={detailMessage}
      />
      {conversation && (
        <ConversationInfoSheet
          visible={showInfoSheet}
          onClose={() => setShowInfoSheet(false)}
          conversation={conversation}
        />
      )}
    </Container>
  );
}
