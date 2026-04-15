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
import { EMOJI_MAP, REACTION_EMOJIS, type EmojiType } from "@/constants/emoji.constant";
import Container from "@/components/common/Container";
import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";
import PinnedMessagesBar from "@/components/chat/PinnedMessagesBar";
import ReactionPicker from "@/components/chat/ReactionPicker";
import ReactionModal from "@/components/chat/ReactionModal";
import ForwardModal from "@/components/chat/ForwardModal";
import MessageDetailModal from "@/components/chat/MessageDetailModal";
import ConversationInfoSheet from "@/components/chat/ConversationInfoSheet";
import { getDateLabel, isSameHourAndMinute } from "@/utils/format-message-time..util";
import { Image } from "expo-image";
import MenuItem from "@/components/chat/MenuItem";
import { conversationService } from "@/services/conversation.service";
import { setConversations, setReplyingMessage, clearReplyingMessage } from "@/store/slices/conversationSlice";

export default function ChatWindow() {
  const conversations = useAppSelector((state) => state.conversation.conversations);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { socket } = useSocket();
  const user = useAppSelector((state) => state.auth.user);
  const router = useRouter();
  const dispatch = useAppDispatch()

  const conversation = conversations.find((c) => c.conversationId === id);
  const isGroup = conversation?.type === "GROUP";
  const [contextMenuMsg, setContextMenuMsg] = useState<MessagesType | null>(null);

  // ===== STATE =====
  const [messages, setMessages] = useState<MessagesType[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<MessagesType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [prevCursor, setPrevCursor] = useState<string | null>(null);

  // Reaction picker
  const [reactionPickerMsg, setReactionPickerMsg] = useState<MessagesType | null>(null);

  // Reaction modal
  const [reactionModalData, setReactionModalData] = useState<ReactionType[] | null>(null);

  // Select mode (forward)
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [loadingForward, setLoadingForward] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // Detail modal
  const [detailMessage, setDetailMessage] = useState<MessagesType | null>(null);

  // Info panel
  const [showInfoSheet, setShowInfoSheet] = useState(false);

  // Reply mode
  const replyingMessage = useAppSelector((state) => state.conversation.replyingMessage);

  const flatListRef = useRef<FlatList>(null);
  const isFirstLoad = useRef(true);
  const isFetchingRef = useRef(false);
  const isFetchingNewerRef = useRef(false);
  const isJumpingRef = useRef(false);
  const prevCursorRef = useRef<string | null>(null);

  const isPinned = contextMenuMsg && pinnedMessages.some((m) => m._id === contextMenuMsg._id);

  const scrollToBottom = (animated = true) => {
    flatListRef.current?.scrollToEnd({ animated });
    setShowScrollToBottom(false);
  };

  const handleGoToNewest = () => {
    isFirstLoad.current = true;
    setPrevCursor(null);
    fetchInitialMessages();
  };



  // ================= FETCH =================
  const fetchInitialMessages = async () => {
    if (!id || !user?.userId) return;
    try {
      setIsLoading(true);
      const res: any = await messageService.getMessagesFromConversation(id, user.userId, null, 20);

      if (res.success) {
        const msgs = res.data.messages || [];
        // API usually returns newest-first. For normal list we want oldest-first.
        const isOldestFirst = msgs.length >= 2 && new Date(msgs[0].createdAt) < new Date(msgs[msgs.length - 1].createdAt);
        const sorted = isOldestFirst ? msgs : [...msgs].reverse();

        setMessages(sorted);
        setNextCursor(res.data.nextCursor);
        // If we just loaded history, we are at the end of known history
        setPrevCursor(null);
      }
      const pinRes: any = await messageService.getPinnedMessages(id, user.userId);
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
      const res: any = await messageService.getMessagesFromConversation(id, user.userId, nextCursor, 20);
      if (res.success && res.data.messages.length > 0) {
        const newMsgs = res.data.messages;
        const isOldestFirst = newMsgs.length >= 2 && new Date(newMsgs[0].createdAt) < new Date(newMsgs[newMsgs.length - 1].createdAt);
        const sortedNew = isOldestFirst ? newMsgs : [...newMsgs].reverse();

        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m._id));
          const uniqueNew = sortedNew.filter((m: MessagesType) => !existingIds.has(m._id));
          return [...uniqueNew, ...prev];
        });
        setNextCursor(res.data.nextCursor);
      } else {
        setNextCursor(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      isFetchingRef.current = false;
    }
  };

  const loadNewerMessages = async () => {
    if (!id || !user?.userId || !prevCursor || isFetchingNewerRef.current || isJumpingRef.current) return;
    isFetchingNewerRef.current = true;
    try {
      const res: any = await messageService.getNewerMessages(id, user.userId, prevCursor, 20);
      if (res.success && res.data.messages.length > 0) {
        const newMsgs = res.data.messages;
        // API returns newest first (typically). We want oldest-first for our state.
        const isOldestFirst = newMsgs.length >= 2 && new Date(newMsgs[0].createdAt) < new Date(newMsgs[newMsgs.length - 1].createdAt);
        const sortedNew = isOldestFirst ? newMsgs : [...newMsgs].reverse();

        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m._id));
          const uniqueNew = sortedNew.filter((m: MessagesType) => !existingIds.has(m._id));
          return [...prev, ...uniqueNew];
        });

        // The last message in the new batch is the one used for the NEXT newer fetch
        const lastMsg = sortedNew[sortedNew.length - 1]; // Use sortedNew last element
        setPrevCursor(lastMsg._id);
      } else {
        // If no more newer messages, we are back to live history
        setPrevCursor(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      isFetchingNewerRef.current = false;
    }
  };

  // ================= SEND =================
  const handleSendMessage = async (text: string) => {
    if (!id || !user?.userId) return;
    try {
      await messageService.sendMessage(id, user.userId, { text }, null, replyingMessage?._id);
      if (replyingMessage) dispatch(clearReplyingMessage());
      scrollToBottom();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendFile = async (file: any) => {
    if (!id || !user?.userId) return;
    try {
      await messageService.sendMessage(id, user.userId, undefined, file, replyingMessage?._id);
      if (replyingMessage) dispatch(clearReplyingMessage());
      scrollToBottom();
    } catch (err) {
      console.error(err);
    }
  };

  // ================= PIN =================
  const handleTogglePin = async (messageId: string) => {
    if (!id || !user?.userId) return;
    try {
      await messageService.pinnedMessage(user.userId, messageId, id);
    } catch {
      Alert.alert("Bạn chỉ có thể ghim tối đa 3 tin nhắn trong 1 cuộc trò chuyện");
    }
  };

  // ================= REACT =================
  const handleReaction = async (emojiType: EmojiType, messageId: string) => {
    if (!id || !user?.userId) return;
    try {
      await messageService.reactionMessage(id, user.userId, emojiType, messageId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveReaction = async (messageId: string) => {
    if (!id || !user?.userId) return;
    try {
      await messageService.removeReaction(user.userId, messageId, id);
    } catch (err) {
      console.error(err);
    }
  };

  // ================= RECALL / DELETE =================
  const handleRecall = async (messageId: string) => {
    if (!id || !user?.userId) return;
    try {
      await messageService.recalledMessage(user.userId, messageId, id);
    } catch {
      Alert.alert("Bạn không thể thu hồi tin nhắn trong vòng 24 giờ");
    }
  };

  const handleDeleteForMe = async (messageId: string) => {
    if (!id || !user?.userId) return;
    try {
      await messageService.deleteMessageForMe(user.userId, messageId, id);
      setMessages((prev) => prev.filter((m) => m._id !== messageId));

      const res: any = await conversationService.getConversationsFromUserId(
        user?.userId || "",
      );

      if (res.success) {
        dispatch(setConversations(res.data));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ================= FORWARD =================
  const toggleSelectMessage = (messageId: string) => {
    setSelectedMessages((prev) =>
      prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId]
    );
  };

  const handleForward = async (conversationIds: string[]) => {
    if (!user?.userId || selectedMessages.length === 0) return;
    setLoadingForward(true);
    try {
      await messageService.forwardMessagesToConversations(
        user.userId,
        selectedMessages,
        conversationIds
      );
      setShowForwardModal(false);
      setIsSelectMode(false);
      setSelectedMessages([]);
      Alert.alert("Thành công", "Đã chuyển tiếp tin nhắn");
    } catch (err) {
      console.error(err);
      Alert.alert("Lỗi", "Không thể chuyển tiếp tin nhắn");
    } finally {
      setLoadingForward(false);
    }
  };

  // ================= JUMP =================
  const handleJumpToMessage = async (messageId: string) => {
    if (!id || !user?.userId) return;
    const res: any = await messageService.getMessagesAroundPinnedMessage(id, user.userId, messageId, 15);
    if (res.success) {
      isJumpingRef.current = true;
      const msgs = res.data.messages;
      setMessages(msgs);
      setNextCursor(res.data.nextCursor);
      setPrevCursor(res.data.prevCursor);

      const index = msgs.findIndex((m: any) => m._id === messageId);
      if (index !== -1) {
        // Clear previous highlight
        setHighlightedMessageId(null);

        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index,
            animated: true,
            viewPosition: 0.5, // Center it
          });

          setHighlightedMessageId(messageId);
          setTimeout(() => {
            setHighlightedMessageId(null);
            isJumpingRef.current = false;
          }, 2500);
        }, 300);
      } else {
        isJumpingRef.current = false;
      }
    }
  };

  // ================= EFFECTS =================
  useEffect(() => {
    if (id && user?.userId) {
      fetchInitialMessages();
      messageService.readReceipt(user.userId, id);
      dispatch(clearReplyingMessage());
    }
  }, [id, user?.userId]);

  useEffect(() => {
    prevCursorRef.current = prevCursor;
  }, [prevCursor]);


  // ===== SOCKET =====
  useEffect(() => {
    if (!socket || !id || !user?.userId) return;
    socket.emit("join_room", id);

    const handleNewMessage = (newMessage: MessagesType) => {
      // ONLY append if we are at the end (no newer history)
      if (prevCursorRef.current) {
        setShowScrollToBottom(true); // Hint there is new content
        return;
      }
      setMessages((prev) => {
        if (prev.some((m) => m._id === newMessage._id)) return prev;
        // New messages from socket go to the END
        return [...prev, newMessage];
      });
      messageService.readReceipt(user.userId, id);

      // Auto scroll if user is already at the bottom
      if (!showScrollToBottom) {
        setTimeout(() => scrollToBottom(true), 100);
      }
    };

    const handleMessageReacted = (data: any) => {
      setMessages((prev) =>
        prev.map((m) => m._id === data.messageId ? { ...m, reactions: data.reactions } : m)
      );
    };

    const handleMessageRecalled = (data: any) => {
      setMessages((prev) =>
        prev.map((m) => m._id === data.messageId ? { ...m, recalled: true } : m)
      );
    };

    const handleMessagePinned = (data: any) => {
      setPinnedMessages(data.pinnedMessages);
      setMessages((prev) =>
        prev.map((m) => (m._id === data.messageId ? { ...m, pinned: data.pinned } : m))
      );
    };

    const handleReadReceipt = (data: { conversationId: string; messages: MessagesType[] }) => {
      if (data.conversationId === id) {
        setMessages((prev) => {
          const updatedMap = new Map(data.messages.map((m) => [m._id, m.readReceipts]));
          return prev.map((m) => {
            const newReadReceipts = updatedMap.get(m._id);
            if (!newReadReceipts) return m;
            return { ...m, readReceipts: newReadReceipts };
          });
        });
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("message_reacted", handleMessageReacted);
    socket.on("message_recalled", handleMessageRecalled);
    socket.on("message_pinned", handleMessagePinned);
    socket.on("read_receipt", handleReadReceipt);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("message_reacted", handleMessageReacted);
      socket.off("message_recalled", handleMessageRecalled);
      socket.off("message_pinned", handleMessagePinned);
      socket.off("read_receipt", handleReadReceipt);
      socket.emit("leave_room", id);
    };
  }, [socket, id, user?.userId]);

  // ================= RENDER =================
  const renderItem = ({ item, index }: any) => {
    // Normal list: older is at lower index, newer is at higher index
    const older = messages[index - 1];
    const newer = messages[index + 1];

    const isMe = item.senderId?._id === user?.userId;
    const sameSenderOlder = older && older.senderId?._id === item.senderId?._id;
    const sameMinuteOlder = older && isSameHourAndMinute(older.createdAt, item.createdAt);
    const isFirstInCluster = !(sameSenderOlder && sameMinuteOlder);

    const sameSenderNewer = newer && newer.senderId?._id === item.senderId?._id;
    const sameMinuteNewer = newer && isSameHourAndMinute(newer.createdAt, item.createdAt);
    const isLastInCluster = !(sameSenderNewer && sameMinuteNewer);

    const showAvatar = !isMe && isFirstInCluster;
    const showName = !isMe && isFirstInCluster;
    const showTime = isLastInCluster;
    const showDivider =
      !older ||
      new Date(older.createdAt).toDateString() !== new Date(item.createdAt).toDateString();

    const isSelected = selectedMessages.includes(item._id);

    const isLastReadMessage = index === messages.length - 1;

    const addSpacing = !sameSenderOlder;

    return (
      <View style={{ marginBottom: item.reactions?.length > 0 ? 12 : 0, marginTop: addSpacing ? 16 : 0 }}>
        {showDivider && (
          <View style={{ flexDirection: "row", justifyContent: "center", marginVertical: 12 }}>
            <View style={{ backgroundColor: "#babbbe", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ color: "white", fontSize: 11 }}>{getDateLabel(item.createdAt)}</Text>
            </View>
          </View>
        )}
        <MessageBubble
          message={item}
          isMe={(typeof item.senderId === 'string' ? item.senderId : item.senderId?._id) === user?.userId}
          showAvatar={showAvatar}
          showName={showName}
          showTime={showTime}
          isSelected={isSelected}
          isSelectMode={isSelectMode}
          isHighlighted={highlightedMessageId === item._id}
          onLongPress={() => setContextMenuMsg(item)}
          onPress={() => {
            if (isSelectMode) toggleSelectMessage(item._id);
          }}
          onOpenReactionModal={(reactions) => setReactionModalData(reactions)}
          renderReadReceipts={isLastReadMessage}
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

        {/* Avatar */}
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            overflow: "hidden",
            backgroundColor: "rgba(255,255,255,0.3)",
          }}
        >
          <Image
            source={{ uri: conversation?.avatar }}
            style={{ width: 38, height: 38 }}
          />
        </View>

        {/* Name */}
        <View style={{ flex: 1 }}>
          <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }} numberOfLines={1}>
            {conversation?.name}
          </Text>
        </View>

        {/* Actions */}
        <TouchableOpacity>
          <Ionicons name="person-add-outline" size={22} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={{ padding: 4 }}>
          <Ionicons name="videocam-outline" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={{ padding: 4 }}>
          <Ionicons name="search-outline" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={{ padding: 4 }} onPress={() => setShowInfoSheet(true)}>
          <Ionicons name="information-circle-outline" size={24} color="white" />
        </TouchableOpacity>
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
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <ActivityIndicator size="large" color="#0068FF" />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item, index) => item?._id || index.toString()}
              renderItem={renderItem}
              scrollEventThrottle={16}
              initialNumToRender={20}
              onScroll={(e) => {
                const { y } = e.nativeEvent.contentOffset;
                const { height: contentHeight } = e.nativeEvent.contentSize;
                const { height: layoutHeight } = e.nativeEvent.layoutMeasurement;

                // Show button if scrolled up or if in historical mode
                const isBottom = y >= contentHeight - layoutHeight - 100;
                setShowScrollToBottom(!isBottom || !!prevCursor);

                if (isJumpingRef.current) return;

                if (y < 100) loadMoreMessages();
                if (isBottom && prevCursor) loadNewerMessages();
              }}
              onContentSizeChange={(w, h) => {
                if (isFirstLoad.current && h > 0 && messages.length > 0 && !prevCursor) {
                  // Use a small delay to ensure final measurements are ready
                  setTimeout(() => {
                    scrollToBottom(false);
                    isFirstLoad.current = false;
                  }, 100);
                }
              }}
              onScrollToIndexFailed={(info) => {
                const wait = new Promise((resolve) => setTimeout(resolve, 500));
                wait.then(() => {
                  flatListRef.current?.scrollToIndex({
                    index: info.index,
                    animated: true,
                    viewPosition: 0.5,
                  });
                });
              }}
              onEndReached={() => {
                if (prevCursor) loadNewerMessages();
              }}
              onEndReachedThreshold={0.5}
              contentContainerStyle={{
                paddingTop: 8,
                paddingBottom: 90, // space for input
              }}
              ListEmptyComponent={() => (
                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                  <Text style={{ color: "#9ca3af", fontSize: 13 }}>Chưa có tin nhắn nào</Text>
                </View>
              )}
            />
          )}

          {/* Reply Bar */}
          {replyingMessage && (
            <View
              style={{
                backgroundColor: "white",
                padding: 10,
                borderTopWidth: 1,
                borderTopColor: "#e5e7eb",
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <View style={{ width: 4, height: 30, backgroundColor: "#0068ff", borderRadius: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#0068ff" }}>
                  Đang trả lời {replyingMessage.senderId?._id === user?.userId ? "chính mình" : (replyingMessage.senderId?.profile?.name || "Bạn")}
                </Text>
                <Text numberOfLines={1} style={{ fontSize: 12, color: "#6b7280" }}>
                  {replyingMessage.content?.text || (replyingMessage.content?.file ? replyingMessage.content.file.fileName : "[Biểu cảm]")}
                </Text>
              </View>
              <TouchableOpacity onPress={() => dispatch(clearReplyingMessage())}>
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          )}

          <ChatInput
            chatName={conversation?.name}
            onSendMessage={handleSendMessage}
            onSendFile={handleSendFile}
            isSelectMode={isSelectMode}
            selectedMessages={selectedMessages}
            onOpenForwardModal={() => setShowForwardModal(true)}
            onCancelSelect={() => {
              setIsSelectMode(false);
              setSelectedMessages([]);
            }}
          />

          {/* Floating Jump to Newest Button */}
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
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 3,
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
              }}
            >
              <Ionicons name="chevron-down" size={24} color="#0068ff" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* ===== MODALS ===== */}

      {/* Reaction Picker */}
      {reactionPickerMsg && (
        <ReactionPicker
          visible={true}
          onClose={() => setReactionPickerMsg(null)}
          messageId={reactionPickerMsg._id}
          isMe={reactionPickerMsg.senderId._id === user?.userId}
          messageReactions={reactionPickerMsg.reactions}
          currentUserId={user?.userId || ""}
          onReact={handleReaction}
          onRemoveReaction={handleRemoveReaction}
        />
      )}

      {/* Reaction Detail Modal */}
      {reactionModalData && (
        <ReactionModal
          visible={true}
          onClose={() => setReactionModalData(null)}
          reactions={reactionModalData}
        />
      )}

      {/* Forward Modal */}
      <ForwardModal
        visible={showForwardModal}
        onClose={() => setShowForwardModal(false)}
        conversations={conversations}
        selectedMessageIds={selectedMessages}
        onSubmit={handleForward}
        loadingForward={loadingForward}
      />

      {/* Message Detail Modal */}
      <MessageDetailModal
        visible={!!detailMessage}
        onClose={() => setDetailMessage(null)}
        message={detailMessage}
      />

      {/* Conversation Info Sheet */}
      {conversation && (
        <ConversationInfoSheet
          visible={showInfoSheet}
          onClose={() => setShowInfoSheet(false)}
          conversation={conversation}
        />
      )}

      {contextMenuMsg && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.2)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {/* Tap outside để close */}
          <TouchableOpacity
            style={{ position: "absolute", width: "100%", height: "100%" }}
            onPress={() => setContextMenuMsg(null)}
          />

          {/* ===== REACTION BAR ===== */}
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
            {REACTION_EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => {
                  handleReaction(emoji as any, contextMenuMsg._id);
                  setContextMenuMsg(null);
                }}
              >
                <Text style={{ fontSize: 22 }}>{EMOJI_MAP[emoji]}</Text>
              </TouchableOpacity>
            ))}

            {contextMenuMsg.reactions?.some(
              (r) => r.userId?._id === user?.userId
            ) && (
                <TouchableOpacity
                  onPress={() => {
                    handleRemoveReaction(contextMenuMsg._id);
                    setContextMenuMsg(null);
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: 18,
                    backgroundColor: "#f3f4f6",
                  }}
                >
                  <Ionicons name="close" size={18} color="#6b7280" />
                </TouchableOpacity>
              )}

          </View>

          {/* ===== MENU ===== */}
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 12,
              paddingVertical: 6,
              width: 220,
              elevation: 5,
            }}
          >
            <MenuItem label="Trả lời" onPress={() => {
              dispatch(setReplyingMessage(contextMenuMsg));
              setContextMenuMsg(null);
            }} />

            <MenuItem label="Chuyển tiếp" onPress={() => {
              setIsSelectMode(true);
              toggleSelectMessage(contextMenuMsg._id);
              setShowForwardModal(true);
              setContextMenuMsg(null);
            }} />

            <MenuItem label={isPinned ? "Bỏ ghim" : "Ghim"} onPress={() => {
              handleTogglePin(contextMenuMsg._id);
              setContextMenuMsg(null);
            }} />

            <MenuItem label="Xem chi tiết" onPress={() => {
              setDetailMessage(contextMenuMsg);
              setContextMenuMsg(null);
            }} />

            <MenuItem label="Xóa phía tôi" danger onPress={() => {
              handleDeleteForMe(contextMenuMsg._id);
              setContextMenuMsg(null);
            }} />

            {(typeof contextMenuMsg.senderId === 'string'
              ? contextMenuMsg.senderId
              : contextMenuMsg.senderId?._id) === user?.userId &&
              !contextMenuMsg.recalled && (
                <MenuItem label="Thu hồi" danger onPress={() => {
                  handleRecall(contextMenuMsg._id);
                  setContextMenuMsg(null);
                }} />
              )}
          </View>
        </View>
      )}
    </Container>
  );
}