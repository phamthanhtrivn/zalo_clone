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
  const { startCall } = useVideoCall(); // Giữ Logic Call từ HEAD

  const user = useAppSelector((state) => state.auth.user);
  const { items: conversations } = useAppSelector(
    (state) => state.conversation,
  );
  const replyingMessage = useAppSelector(
    (state) => state.conversation.replyingMessage,
  ); // Giữ Logic Reply từ KVT

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

  // ================= SCROLL HELPER =================
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
    } catch (err) {
      console.error(err);
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
        mediaFiles.forEach((f) => formData.append("files", f as any));
        promises.push(messageService.sendFormData(formData));
      }

      docFiles.forEach((f) => {
        const fd = new FormData();
        fd.append("conversationId", id);
        fd.append("senderId", user.userId);
        if (replyingMessage?._id) fd.append("repliedId", replyingMessage._id);
        fd.append("files", f as any);
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
      // Gửi tin nhắn thông báo cuộc gọi trước
      const res: any = await messageService.sendMessage(
        id,
        user.userId,
        undefined,
        { text: "Cuộc gọi video" },
        null,
        "VIDEO",
      );
      const messageId = res.data?._id || res?._id;
      if (messageId) {
        startCall(conversation.otherMemberId, id, "VIDEO", messageId);
      }
    } catch (error) {
      Alert.alert("Lỗi", "Khởi tạo cuộc gọi thất bại.");
    }
  };

  const handleTogglePin = async (messageId: string) => {
    try {
      await messageService.pinnedMessage(user?.userId || "", messageId, id!);
    } catch {
      Alert.alert("Thông báo", "Bạn chỉ có thể ghim tối đa 3 tin nhắn.");
    }
  };

  const handleReaction = async (emojiType: EmojiType, messageId: string) => {
    await messageService.reactionMessage(
      id!,
      user?.userId || "",
      emojiType,
      messageId,
    );
  };

  const handleRemoveReaction = async (messageId: string) => {
    await messageService.removeReaction(user?.userId || "", messageId, id!);
  };

  const handleRecall = async (messageId: string) => {
    try {
      await messageService.recalledMessage(user?.userId || "", messageId, id!);
    } catch {
      Alert.alert("Lỗi", "Chỉ có thể thu hồi tin nhắn trong 24 giờ.");
    }
  };

  const handleDeleteForMe = async (messageId: string) => {
    const res: any = await messageService.deleteMessageForMe(
      user?.userId || "",
      messageId,
      id!,
    );
    if (res.success) {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
      const convs: any = await conversationService.getConversationsFromUserId(
        user?.userId || "",
      );
      if (convs.success) dispatch(setConversations(convs.data));
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

  const handleForward = async (conversationIds: string[]) => {
    if (!user?.userId || selectedMessages.length === 0) return;
    setLoadingForward(true);
    try {
      await messageService.forwardMessagesToConversations(
        user.userId,
        selectedMessages,
        conversationIds,
      );
      setShowForwardModal(false);
      setIsSelectMode(false);
      setSelectedMessages([]);
      Alert.alert("Thành công", "Đã chuyển tiếp tin nhắn");
    } finally {
      setLoadingForward(false);
    }
  };

  // ================= SOCKET LISTENERS =================
  useEffect(() => {
    if (!socket || !id || !user?.userId) return;
    socket.emit("join_room", id);

    const handleNewMessage = (newMessage: MessagesType) => {
      if (prevCursorRef.current) {
        setShowScrollToBottom(true);
        return;
      }
      setMessages((prev) =>
        prev.some((m) => m._id === newMessage._id)
          ? prev
          : [...prev, newMessage],
      );
      messageService.readReceipt(user.userId, id);
      if (!showScrollToBottom) setTimeout(() => scrollToBottom(true), 100);
    };

    const handleCallUpdated = (data: any) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === data.messageId
            ? {
                ...msg,
                call: {
                  ...(msg.call || {}),
                  status: data.status,
                  duration: data.duration ?? 0,
                },
              }
            : msg,
        ),
      );
    };

    const handleMessagesExpired = (data: { messageIds: string[] }) => {
      setMessages((prev) =>
        prev.map((m) =>
          data.messageIds.includes(m._id) ? { ...m, expired: true } : m,
        ),
      );
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
    socket.on("message_pinned", (data) => {
      setPinnedMessages(data.pinnedMessages);
      setMessages((p) =>
        p.map((m) =>
          m._id === data.messageId ? { ...m, pinned: data.pinned } : m,
        ),
      );
    });
    socket.on("read_receipt", (data) => {
      if (data.conversationId === id) {
        const updatedMap = new Map(
          data.messages.map((m: any) => [m._id, m.readReceipts]),
        );
        setMessages((p) =>
          p.map((m) =>
            updatedMap.has(m._id)
              ? { ...m, readReceipts: updatedMap.get(m._id) }
              : m,
          ),
        );
      }
    });
    socket.on("call_updated", handleCallUpdated);
    socket.on("messages_expired", handleMessagesExpired);

    return () => {
      [
        "new_message",
        "message_reacted",
        "message_recalled",
        "message_pinned",
        "read_receipt",
        "call_updated",
        "messages_expired",
      ].forEach((ev) => socket.off(ev));
      socket.emit("leave_room", id);
    };
  }, [socket, id, user?.userId, showScrollToBottom]);

  useEffect(() => {
    if (id && user?.userId) {
      fetchInitialMessages();
      messageService.readReceipt(user.userId, id);
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
    const addSpacing = isFirstInCluster && !showDivider;

    return (
      <View
        style={{
          marginTop: addSpacing ? 12 : 2,
          marginBottom: item.reactions?.length > 0 ? 14 : 0,
        }}
      >
        {showDivider && (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              marginVertical: 12,
            }}
          >
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
          onLongPress={() => setContextMenuMsg(item)}
          onPress={() =>
            isSelectMode &&
            setSelectedMessages((p) =>
              p.includes(item._id)
                ? p.filter((x) => x !== item._id)
                : [...p, item._id],
            )
          }
          onOpenReactionModal={(r) => setReactionModalData(r)}
          renderReadReceipts={index === messages.length - 1}
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
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: "#0068ff",
          gap: 10,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            overflow: "hidden",
            backgroundColor: "white",
          }}
        >
          <Image
            source={{ uri: conversation?.avatar }}
            style={{ width: 38, height: 38 }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: "white", fontSize: 16, fontWeight: "700" }}
            numberOfLines={1}
          >
            {conversation?.name}
          </Text>
        </View>
        <TouchableOpacity onPress={handleVideoCall} style={{ padding: 4 }}>
          <Ionicons name="videocam-outline" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowInfoSheet(true)}
          style={{ padding: 4 }}
        >
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
          onUnpin={handleTogglePin}
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
              onContentSizeChange={() =>
                isFirstLoad.current &&
                messages.length > 0 &&
                !prevCursor &&
                setTimeout(() => {
                  scrollToBottom(false);
                  isFirstLoad.current = false;
                }, 100)
              }
            />
          )}

          {/* Reply Bar UI */}
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
                  {(replyingMessage.senderId?._id ||
                    replyingMessage.senderId) === user?.userId
                    ? "chính mình"
                    : replyingMessage.senderId?.profile?.name}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 12, color: "#6b7280" }}
                >
                  {replyingMessage.content?.text || "[Đính kèm]"}
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
            conversationId={conversation?.conversationId || ""}
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
        onSubmit={handleForward}
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

      {/* Context Menu Overlay */}
      {contextMenuMsg && (
        <View
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.3)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            style={{ position: "absolute", inset: 0 }}
            onPress={() => setContextMenuMsg(null)}
          />
          <View
            style={{
              flexDirection: "row",
              backgroundColor: "white",
              padding: 8,
              borderRadius: 30,
              marginBottom: 10,
              gap: 10,
              elevation: 5,
            }}
          >
            {REACTION_EMOJIS.map((e) => (
              <TouchableOpacity
                key={e}
                onPress={() => {
                  handleReaction(e as any, contextMenuMsg._id);
                  setContextMenuMsg(null);
                }}
              >
                <Text style={{ fontSize: 22 }}>{EMOJI_MAP[e]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 12,
              paddingVertical: 6,
              width: 220,
              elevation: 5,
            }}
          >
            <MenuItem
              label="Trả lời"
              onPress={() => {
                dispatch(setReplyingMessage(contextMenuMsg));
                setContextMenuMsg(null);
              }}
            />
            <MenuItem
              label="Chuyển tiếp"
              onPress={() => {
                setIsSelectMode(true);
                toggleSelectMessage(contextMenuMsg._id);
                setShowForwardModal(true);
                setContextMenuMsg(null);
              }}
            />
            <MenuItem
              label={isPinned ? "Bỏ ghim" : "Ghim"}
              onPress={() => {
                handleTogglePin(contextMenuMsg._id);
                setContextMenuMsg(null);
              }}
            />
            <MenuItem
              label="Xóa phía tôi"
              danger
              onPress={() => {
                handleDeleteForMe(contextMenuMsg._id);
                setContextMenuMsg(null);
              }}
            />
            {(contextMenuMsg.senderId?._id || contextMenuMsg.senderId) ===
              user?.userId &&
              !contextMenuMsg.recalled && (
                <MenuItem
                  label="Thu hồi"
                  danger
                  onPress={() => {
                    handleRecall(contextMenuMsg._id);
                    setContextMenuMsg(null);
                  }}
                />
              )}
          </View>
        </View>
      )}
    </Container>
  );
}
