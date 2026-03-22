import { memo } from "react";
import {
  formatTime,
  getDateLabel,
  isSameHourAndMinute,
} from "@/utils/format-message-time..util";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import type { MessagesType } from "@/types/messages..type";
import type { RefObject } from "react";

type Props = {
  messages: MessagesType[];
  currentUserId: string;
  containerRef: RefObject<HTMLDivElement | null>;
  handleScrollToTop: () => void;
};

const MessageList = ({
  messages,
  currentUserId,
  containerRef,
  handleScrollToTop,
}: Props) => {
  return (
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
          <div key={message._id}>
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
  );
};

export default memo(MessageList);
