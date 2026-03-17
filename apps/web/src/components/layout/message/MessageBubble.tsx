import { formatTime } from "@/utils/format-message-time..util";
import type { MessagesType } from "@/types/messages.type";

interface Props {
  message: MessagesType;
  isMe: boolean;
  showTime: boolean;
}

export const MessageBubble = ({ message, isMe, showTime }: Props) => {
  return (
    <div
      className={`rounded-lg px-3 py-2 max-w-md border shadow-sm ${
        isMe ? "bg-[#E5F1FF]" : "bg-white"
      }`}
    >
      <div className="space-y-1 wrap-break-word">
        {message.content?.text && <p>{message.content.text}</p>}

        {message.content?.icon && (
          <p className="text-2xl">{message.content.icon}</p>
        )}

        {message.content?.file && <div>File</div>}
      </div>

      {showTime && (
        <div className="text-[13px] text-gray-700 mt-1">
          {formatTime(message.createdAt)}
        </div>
      )}
    </div>
  );
};
