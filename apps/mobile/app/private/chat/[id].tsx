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
  StyleSheet,
  Pressable,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";

import { useSocket } from "@/contexts/SocketContext";
import { useVideoCall } from "@/contexts/VideoCallContext";
import { messageService } from "@/services/message.service";
import { conversationService } from "@/services/conversation.service";

import { useAppDispatch, useAppSelector } from "@/store/store";
import {
  setConversations,
  setReplyingMessage,
  clearReplyingMessage,
} from "@/store/slices/conversationSlice";

import type { MessagesType, ReactionType } from "@/types/messages.type";
import {
  EMOJI_MAP,
  REACTION_EMOJIS,
  type EmojiType,
} from "@/constants/emoji.constant";
import {
  getDateLabel,
  isSameHourAndMinute,
} from "@/utils/format-message-time..util";

import Container from "@/components/common/Container";
import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";
import PinnedMessagesBar from "@/components/chat/PinnedMessagesBar";
import ReactionPicker from "@/components/chat/ReactionPicker";
import ReactionModal from "@/components/chat/ReactionModal";
import ForwardModal from "@/components/chat/ForwardModal";
import MessageDetailModal from "@/components/chat/MessageDetailModal";
import ConversationInfoSheet from "@/components/chat/ConversationInfoSheet";
import MenuItem from "@/components/chat/MenuItem";

const { height } = Dimensions.get("window");

export default function ChatWindow() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { socket } = useSocket();
  const { startCall } = useVideoCall();
  const user = useAppSelector((state) => state.auth.user);
  const conversations = useAppSelector(
    (state) => state.conversation.conversations,
  );
  const replyingMessage = useAppSelector(
    (state) => state.conversation.replyingMessage,
  );

  const conversation = conversations.find((c) => c.conversationId === id);
  const isGroup = conversation?.type === "GROUP";

  // ===== STATE (Pagination & Loading) =====
  const [messages, setMessages] = useState<MessagesType[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<MessagesType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [prevCursor, setPrevCursor] = useState<string | null>(null);

  // ===== STATE (Modals & UI) =====
  const [contextMenuMsg, setContextMenuMsg] = useState<MessagesType | null>(
    null,
  );
  const [reactionPickerMsg, setReactionPickerMsg] =
    useState<MessagesType | null>(null);
  const [reactionModalData, setReactionModalData] = useState<
    ReactionType[] | null
  >(null);
  const [detailMessage, setDetailMessage] = useState<MessagesType | null>(null);
  const [showInfoSheet, setShowInfoSheet] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [loadingForward, setLoadingForward] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);

  // ===== REFS =====
  const flatListRef = useRef<FlatList>(null);
  const isFirstLoad = useRef(true);
  const isFetchingRef = useRef(false);
  const isFetchingNewerRef = useRef(false);
  const isJumpingRef = useRef(false);
  const prevCursorRef = useRef<string | null>(null);

  // ================= FETCHING DATA =================

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
        const sorted = [...msgs].reverse();
        setMessages(sorted);
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
          return [...sortedNew.filter((m) => !existingIds.has(m._id)), ...prev];
        });
        setNextCursor(res.data.nextCursor);
      } else {
        setNextCursor(null);
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
          return [...prev, ...sortedNew.filter((m) => !existingIds.has(m._id))];
        });
        setPrevCursor(sortedNew[sortedNew.length - 1]._id);
      } else {
        setPrevCursor(null);
      }
    } finally {
      isFetchingNewerRef.current = false;
    }
  };

  // ================= ACTION HANDLERS =================

  const handleSendMessage = async (text: string) => {
    if (!id || !user?.userId) return;
    try {
      await messageService.sendMessage(id, user.userId, replyingMessage?._id, {
        text,
      });
      if (replyingMessage) dispatch(clearReplyingMessage());
      scrollToBottom();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendFile = async (files: any[]) => {
    if (!id || !user?.userId || files.length === 0) return;
    try {
      await messageService.sendMessage(
        id,
        user.userId,
        replyingMessage?._id,
        undefined,
        files,
      );
      if (replyingMessage) dispatch(clearReplyingMessage());
      scrollToBottom();
    } catch (err) {
      Alert.alert("Lỗi", "Không thể gửi file.");
    }
  };

  const handleTogglePin = async (messageId: string) => {
    try {
      await messageService.pinnedMessage(user!.userId, messageId, id!);
    } catch {
      Alert.alert("Lỗi", "Chỉ ghim được tối đa 3 tin nhắn.");
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
      const msgs = res.data.messages;
      setMessages(msgs);
      setNextCursor(res.data.nextCursor);
      setPrevCursor(res.data.prevCursor);

      const index = msgs.findIndex((m: any) => m._id === messageId);
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

  const scrollToBottom = (animated = true) => {
    flatListRef.current?.scrollToEnd({ animated });
    setShowScrollToBottom(false);
  };
  const handleVideoCall = () => {
    // 1. Kiểm tra sự tồn tại của đối tượng conversation
    if (!conversation) {
      Alert.alert("Lỗi", "Không tìm thấy thông tin hội thoại.");
      return;
    }

    // 2. Lấy partnerId trực tiếp từ trường otherMemberId (dựa trên log thực tế của bạn)
    const partnerId = (conversation as any).otherMemberId;

    console.log("DEBUG - Partner ID thực tế từ log:", partnerId);

    // 3. Kiểm tra các điều kiện bắt buộc trước khi gọi
    if (!id || !user?.userId || !partnerId) {
      Alert.alert(
        "Lỗi",
        "Không thể xác định người nhận hoặc thông tin người gọi.",
      );
      return;
    }

    // 4. Kích hoạt cuộc gọi
    startCall(
      partnerId,
      conversation.name || "Người dùng",
      id, // conversationId
      "VIDEO",
    );
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
        prev.map((m) =>
          m._id === data.messageId
            ? {
                ...m,
                call: {
                  ...m.call,
                  status: data.status,
                  duration: data.duration ?? 0,
                },
              }
            : m,
        ),
      );
    };

    const handleMessageReacted = (data: any) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === data.messageId ? { ...m, reactions: data.reactions } : m,
        ),
      );
    };

    const handleMessageRecalled = (data: any) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === data.messageId ? { ...m, recalled: true } : m,
        ),
      );
    };

    const handleReadReceipt = (data: any) => {
      if (data.conversationId !== id) return;
      setMessages((prev) => {
        const map = new Map(
          data.messages.map((m: any) => [m._id, m.readReceipts]),
        );
        return prev.map((m) =>
          map.has(m._id) ? { ...m, readReceipts: map.get(m._id) } : m,
        );
      });
    };

    socket.on("new_message", handleNewMessage);
    socket.on("call_updated", handleCallUpdated);
    socket.on("message_reacted", handleMessageReacted);
    socket.on("message_recalled", handleMessageRecalled);
    socket.on("read_receipt", handleReadReceipt);
    socket.on("message_pinned", (data) => {
      setPinnedMessages(data.pinnedMessages);
      setMessages((prev) =>
        prev.map((m) =>
          m._id === data.messageId ? { ...m, pinned: data.pinned } : m,
        ),
      );
    });

    return () => {
      socket.off("new_message");
      socket.off("call_updated");
      socket.off("message_reacted");
      socket.off("message_recalled");
      socket.off("read_receipt");
      socket.emit("leave_room", id);
    };
  }, [id, socket]);

  // ================= UI RENDER LOGIC =================

  const renderItem = ({
    item,
    index,
  }: {
    item: MessagesType;
    index: number;
  }) => {
    const older = messages[index - 1];
    const newer = messages[index + 1];
    const isMe = item.senderId?._id === user?.userId;

    const sameSenderOlder = older && older.senderId?._id === item.senderId?._id;
    const sameMinuteOlder =
      older && isSameHourAndMinute(older.createdAt, item.createdAt);
    const isFirstInCluster = !(sameSenderOlder && sameMinuteOlder);

    const sameSenderNewer = newer && newer.senderId?._id === item.senderId?._id;
    const sameMinuteNewer =
      newer && isSameHourAndMinute(newer.createdAt, item.createdAt);
    const isLastInCluster = !(sameSenderNewer && sameMinuteNewer);

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
          <View style={styles.dateDivider}>
            <View style={styles.dateBadge}>
              <Text style={styles.dateText}>
                {getDateLabel(item.createdAt)}
              </Text>
            </View>
          </View>
        )}
        <MessageBubble
          message={item}
          isMe={isMe}
          showAvatar={!isMe && isFirstInCluster}
          showName={!isMe && isFirstInCluster}
          showTime={isLastInCluster}
          isSelected={selectedMessages.includes(item._id)}
          isSelectMode={isSelectMode}
          isHighlighted={highlightedMessageId === item._id}
          onLongPress={() => setContextMenuMsg(item)}
          onPress={() =>
            isSelectMode &&
            setSelectedMessages((prev) =>
              prev.includes(item._id)
                ? prev.filter((i) => i !== item._id)
                : [...prev, item._id],
            )
          }
          onOpenReactionModal={setReactionModalData}
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Image
          source={{ uri: conversation?.avatar }}
          style={styles.headerAvatar}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName} numberOfLines={1}>
            {conversation?.name}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleVideoCall}>
            <Ionicons name="videocam-outline" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowInfoSheet(true)}>
            <Ionicons
              name="information-circle-outline"
              size={24}
              color="white"
            />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={50}
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
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
              onScroll={(e) => {
                const { y } = e.nativeEvent.contentOffset;
                const isBottom =
                  y >=
                  e.nativeEvent.contentSize.height -
                    e.nativeEvent.layoutMeasurement.height -
                    100;
                setShowScrollToBottom(!isBottom || !!prevCursor);
                if (!isJumpingRef.current) {
                  if (y < 100) loadMoreMessages();
                  if (isBottom && prevCursor) loadNewerMessages();
                }
              }}
              contentContainerStyle={{ paddingTop: 8, paddingBottom: 90 }}
            />
          )}

          {/* Reply Bar */}
          {replyingMessage && (
            <View style={styles.replyBar}>
              <View style={styles.replyLine} />
              <View style={{ flex: 1 }}>
                <Text style={styles.replyTitle}>
                  Đang trả lời{" "}
                  {replyingMessage.senderId?.profile?.name || "Bạn"}
                </Text>
                <Text numberOfLines={1} style={styles.replySub}>
                  {replyingMessage.content?.text || "[Tệp đính kèm]"}
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
              onPress={() =>
                prevCursor ? fetchInitialMessages() : scrollToBottom()
              }
              style={styles.scrollBtn}
            >
              <Ionicons name="chevron-down" size={24} color="#0068ff" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* MODALS */}
      <ConversationInfoSheet
        visible={showInfoSheet}
        onClose={() => setShowInfoSheet(false)}
        conversation={conversation}
      />
      <ForwardModal
        visible={showForwardModal}
        onClose={() => setShowForwardModal(false)}
        conversations={conversations}
        selectedMessageIds={selectedMessages}
        onSubmit={async (cids) => {
          setLoadingForward(true);
          await messageService.forwardMessagesToConversations(
            user!.userId,
            selectedMessages,
            cids,
          );
          setLoadingForward(false);
          setShowForwardModal(false);
          setIsSelectMode(false);
          setSelectedMessages([]);
        }}
        loadingForward={loadingForward}
      />
      {reactionPickerMsg && (
        <ReactionPicker
          visible
          onClose={() => setReactionPickerMsg(null)}
          messageId={reactionPickerMsg._id}
          isMe={reactionPickerMsg.senderId?._id === user?.userId}
          currentUserId={user?.userId || ""}
          onReact={handleReaction}
          onRemoveReaction={handleRemoveReaction}
        />
      )}
      {reactionModalData && (
        <ReactionModal
          visible
          onClose={() => setReactionModalData(null)}
          reactions={reactionModalData}
        />
      )}

      {/* Context Menu Overlay */}
      {contextMenuMsg && (
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setContextMenuMsg(null)}
        >
          <View style={styles.menuContent}>
            <View style={styles.emojiRow}>
              {REACTION_EMOJIS.map((e) => (
                <TouchableOpacity
                  key={e}
                  onPress={() => {
                    handleReaction(e as any, contextMenuMsg._id);
                    setContextMenuMsg(null);
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{EMOJI_MAP[e]}</Text>
                </TouchableOpacity>
              ))}
            </View>
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
                setSelectedMessages([contextMenuMsg._id]);
                setContextMenuMsg(null);
              }}
            />
            <MenuItem
              label={
                pinnedMessages.some((p) => p._id === contextMenuMsg._id)
                  ? "Bỏ ghim"
                  : "Ghim"
              }
              onPress={() => {
                handleTogglePin(contextMenuMsg._id);
                setContextMenuMsg(null);
              }}
            />
            <MenuItem
              label="Thu hồi"
              danger
              onPress={() => {
                messageService.recalledMessage(
                  user!.userId,
                  contextMenuMsg._id,
                  id!,
                );
                setContextMenuMsg(null);
              }}
            />
          </View>
        </Pressable>
      )}
    </Container>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#0068ff",
    gap: 10,
    paddingTop: Platform.OS === "ios" ? 40 : 10,
  },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerName: { color: "white", fontSize: 16, fontWeight: "bold" },
  headerActions: { flexDirection: "row", gap: 12 },
  dateDivider: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 12,
  },
  dateBadge: {
    backgroundColor: "#babbbe",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dateText: { color: "white", fontSize: 11 },
  replyBar: {
    backgroundColor: "white",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  replyLine: {
    width: 4,
    height: 32,
    backgroundColor: "#0068ff",
    borderRadius: 2,
  },
  replyTitle: { fontSize: 12, fontWeight: "bold", color: "#0068ff" },
  replySub: { fontSize: 12, color: "#666" },
  scrollBtn: {
    position: "absolute",
    bottom: 100,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
    elevation: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuContent: {
    backgroundColor: "white",
    borderRadius: 15,
    width: "70%",
    paddingVertical: 10,
  },
  emojiRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
});
