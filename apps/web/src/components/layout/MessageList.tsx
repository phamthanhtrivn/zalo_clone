import { memo, useEffect, useState, useMemo } from "react";
import { useSearchParams, useParams, useLocation } from "react-router-dom";
import {
  formatTime,
  getDateLabel,
  isSameHourAndMinute,
} from "@/utils/format-message-time..util";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import type { MessagesType } from "@/types/messages..type";
import type { RefObject } from "react";
import { useSocket } from "@/contexts/SocketContext";
import { setMessages } from "@/store/slices/messageSlice";
import { userService } from "@/services/user.service"; // Assuming userService exists
import { useAppSelector } from "@/store"; // To get current user ID

type Props = {
  messages: MessagesType[];
  currentUserId: string;
  containerRef: RefObject<HTMLDivElement | null>;
  handleScrollToTop: () => void;
  // New props for friend status (can be passed from parent or derived from location.state)
  otherUserId?: string; // The ID of the other user in a direct conversation
  isDirectConversation?: boolean; // Flag to indicate if it's a 1-1 chat
};

const MessageList = ({
  messages,
  currentUserId,
  containerRef,
  handleScrollToTop,
  otherUserId,
  isDirectConversation,
}: Props) => {
  const { socket } = useSocket();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetMessageId = searchParams.get("messageId");
  const location = useLocation();
  const { otherUserId: otherUserIdFromState, isNewContact: isNewContactFromState } = location.state || {};
  const user = useAppSelector((state) => state.auth.user);
  const conversations = useAppSelector((state) => state.conversation.conversations);

  // Tìm thông tin cuộc hội thoại hiện tại từ store để lấy otherMemberId nếu cần
  const currentConversation = useMemo(() =>
    conversations.find(c => c.conversationId === id),
    [conversations, id]);

  // Xác định ID của người đối diện và loại hội thoại
  const finalOtherUserId = useMemo(() =>
    otherUserId || otherUserIdFromState || currentConversation?.otherMemberId,
    [otherUserId, otherUserIdFromState, currentConversation]);

  const finalIsDirect = useMemo(() =>
    isDirectConversation || currentConversation?.type === "DIRECT" || !!isNewContactFromState,
    [isDirectConversation, currentConversation, isNewContactFromState]);

  const [isFriend, setIsFriend] = useState(false);
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [hasReceivedRequest, setHasReceivedRequest] = useState(false); // New state for received request

  // Kiểm tra trạng thái bạn bè thực tế từ Server
  useEffect(() => {
    const verifyFriendship = async () => {
      if (finalOtherUserId && finalIsDirect) {
        try {
          // Gọi service để kiểm tra xem đã là bạn bè chưa
          const res = await userService.checkFriendStatus(finalOtherUserId);
          if (res.success && res.data) {
            setIsFriend(res.data.isFriend);
            // Nếu chưa là bạn
            if (!res.data.isFriend) {
              // Kiểm tra nếu mình đã gửi lời mời
              if (res.data.status === "PENDING") {
                setFriendRequestSent(true);
              }
              // Kiểm tra nếu đối phương đã gửi lời mời cho mình
              else if (res.data.status === "REQUESTED") {
                setHasReceivedRequest(true);
              }
            }
          }
        } catch (error) {
          // Fallback: Nếu lỗi API, sử dụng logic tạm thời từ state tìm kiếm
          setIsFriend(!isNewContactFromState);
        }
      }
    };

    verifyFriendship();
  }, [finalOtherUserId, finalIsDirect, isNewContactFromState]);

  const handleAddFriend = async () => {
    if (!finalOtherUserId || !user?.userId) return;
    try {
      await userService.addFriend(finalOtherUserId, user.userId);
      setFriendRequestSent(true);
    } catch (error) {
      console.error("Failed to send friend request:", error);
    }
  };

  const handleAcceptFriend = async () => {
    if (!finalOtherUserId || !user?.userId) return;
    try {
      await userService.acceptFriend(finalOtherUserId, user.userId);
      setIsFriend(true); // Cập nhật trạng thái là bạn bè
      setHasReceivedRequest(false); // Ẩn thông báo lời mời
    } catch (error) {
      console.error("Failed to accept friend request:", error);
    }
  };

  // Logic cuộn đến tin nhắn cụ thể khi được chọn từ kết quả tìm kiếm
  useEffect(() => {
    if (targetMessageId && messages.length > 0) {
      // Đợi một khoảng ngắn để đảm bảo DOM đã render xong
      const timer = setTimeout(() => {
        const element = document.getElementById(`message-${targetMessageId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });

          // Hiệu ứng highlight để người dùng nhận diện tin nhắn vừa tìm
          element.classList.add("ring-2", "ring-blue-400", "ring-offset-2", "bg-blue-50/50");

          // Xóa highlight và query param sau khi xem xong để tránh scroll lại ngoài ý muốn
          setTimeout(() => {
            element.classList.remove("ring-2", "ring-blue-400", "ring-offset-2", "bg-blue-50/50");
            setSearchParams({}, { replace: true });
          }, 2000);
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [targetMessageId, messages, setSearchParams]);

  useEffect(() => {
    if (!socket || !id) return;

    // ... existing socket listeners ...

    // Cập nhật read_receipt cho messages
    const handleReadReceipt = (data: {
      conversationId: string;
      messages: MessagesType[];
    }) => {
      if (data.conversationId === id) {
        setMessages((prev) => {
          const updatedMap = new Map(
            data.messages.map((m) => [m._id, m.readReceipts])
          );

          return prev.map((m) => {
            const newReadReceipts = updatedMap.get(m._id);
            if (!newReadReceipts) return m;
            return {
              ...m,
              readReceipts: newReadReceipts,
            };
          });
        });
      }
    };

    // Xử lý messages_unread_updated
    const handleUnreadUpdated = (data: {
      conversationId: string;
      userId: string;
      lastReadMessageId: string | null;
      unreadCount?: number;
    }) => {
      if (data.conversationId === id) {
        // Cập nhật lại messages để xóa/hiện readReceipts
        setMessages((prev) => {
          if (!data.lastReadMessageId) {
            // Nếu không có lastReadMessageId, xóa tất cả readReceipts của user này
            return prev.map((msg) => ({
              ...msg,
              readReceipts: msg.readReceipts?.filter(
                (r) => r.userId._id !== data.userId
              ),
            }));
          }

          return prev.map((msg) => {
            if (msg._id > data.lastReadMessageId!) {
              return {
                ...msg,
                readReceipts: msg.readReceipts?.filter(
                  (r) => r.userId._id !== data.userId
                ),
              };
            }
            return msg;
          });
        });
      }
    };

    socket.on("read_receipt", handleReadReceipt);
    socket.on("messages_unread_updated", handleUnreadUpdated);

    return () => {
      // ... existing cleanup ...
      socket.off("read_receipt", handleReadReceipt);
      socket.off("messages_unread_updated", handleUnreadUpdated);
    };
  }, [socket, id]);
  return (
    <>
      {/* Thanh gửi yêu cầu kết bạn - hiện khi đang chat với người chưa kết bạn */}
      {finalIsDirect && finalOtherUserId && !isFriend && (
        <div className="px-4 py-2.5 bg-white border-b border-gray-100 flex items-center gap-3 text-sm shadow-sm">
          {/* Icon */}
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#0091ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </div>

          {/* Text */}
          <span className="flex-1 text-gray-600 text-[13px]">
            {hasReceivedRequest
              ? "Người này đã gửi lời mời kết bạn cho bạn"
              : friendRequestSent
                ? "Đã gửi lời mời kết bạn"
                : "Gửi yêu cầu kết bạn tới người này"}
          </span>

          {/* Action button */}
          {hasReceivedRequest ? (
            <button
              onClick={handleAcceptFriend}
              className="shrink-0 px-4 py-1.5 bg-[#0091ff] text-white text-[13px] font-medium rounded-md hover:bg-[#0075dd] transition-colors"
            >
              Chấp nhận
            </button>
          ) : friendRequestSent ? (
            <span className="shrink-0 px-4 py-1.5 text-gray-400 text-[13px] border border-gray-200 rounded-md cursor-not-allowed">
              Đã gửi
            </span>
          ) : (
            <button
              onClick={handleAddFriend}
              className="shrink-0 px-4 py-1.5 bg-[#0091ff] text-white text-[13px] font-medium rounded-md hover:bg-[#0075dd] transition-colors"
            >
              Gửi kết bạn
            </button>
          )}
        </div>
      )}

      <div
        ref={containerRef}
        onScroll={handleScrollToTop}
        className="flex-1 overflow-y-auto p-4 space-y-1"
      >
        {messages.map((message, index) => {
          const prev = messages[index - 1];
          const next = messages[index + 1];

          const isMe = message.senderId._id === currentUserId;
          const isExpired =
            message.expiresAt &&
            new Date(message.expiresAt) < new Date();
          const showDivider =
            !prev ||
            new Date(prev.createdAt).toDateString() !==
            new Date(message.createdAt).toDateString();

          const sameSenderPrev =
            prev && prev.senderId._id === message.senderId._id;

          const sameSenderNext =
            next && next.senderId._id === message.senderId._id;

          const sameMinutePrev =
            prev && isSameHourAndMinute(prev.createdAt, message.createdAt);

          const sameMinuteNext =
            next && isSameHourAndMinute(next.createdAt, message.createdAt);

          const isFirstInCluster = !(sameSenderPrev && sameMinutePrev);
          const isLastInCluster = !(sameSenderNext && sameMinuteNext);

          const showAvatar = !isMe && isFirstInCluster;
          const showTime = isLastInCluster;
          return (
            <div key={message._id} id={`message-${message._id}`} className="transition-all duration-500 rounded-lg">
              {showDivider && (
                <div className="flex justify-center my-4">
                  <span className="bg-[#BABBBE] text-white text-xs px-3 py-1 rounded-md">
                    {getDateLabel(message.createdAt)}
                  </span>
                </div>
              )}

              <div
                className={`flex items-end gap-2 ${isMe ? "justify-end" : ""}`}
              >
                {!isMe &&
                  (showAvatar ? (
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={message.senderId.profile?.avatarUrl} />
                      <AvatarFallback>
                        {message.senderId.profile?.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-8" />
                  ))}

                <div
                  className={`rounded-md px-3 py-2 max-w-md border shadow-sm ${isExpired
                    ? "bg-gray-100 text-gray-400"
                    : isMe
                      ? "bg-[#E5F1FF]"
                      : "bg-white"
                    }`}
                >
                  {/* 🔥 Nội dung */}
                  <div className="space-y-1 wrap-break-word">

                    {isExpired ? (
                      <div className="text-gray-400 italic">
                        Tin nhắn đã hết hạn
                      </div>
                    ) : (
                      <>
                        {message.content?.text && <p>{message.content.text}</p>}
                        {message.content?.icon && (
                          <p className="text-2xl">{message.content.icon}</p>
                        )}
                        {message.content?.file && <div>File</div>}
                      </>
                    )}

                  </div>

                  {/* Time */}
                  {showTime && (
                    <div className="text-[13px] text-gray-700 mt-1">
                      {formatTime(message.createdAt)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default memo(MessageList);
