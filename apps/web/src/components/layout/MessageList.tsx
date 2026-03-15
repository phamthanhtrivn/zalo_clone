import { formatTime, getDateLabel } from "@/utils/format-message-time..util";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";

const MessageList = ({ messages, currentUserId }: any) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-1">
      {messages.map((message: any, index: number) => {
        const prev = messages[index - 1];

        const showDivider =
          !prev ||
          new Date(prev.createdAt).toDateString() !==
            new Date(message.createdAt).toDateString();

        const isMe = message.senderId._id === currentUserId;

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
              {!isMe && (
                <Avatar className="w-8 h-8">
                  <AvatarImage src={message.senderId.profile?.avatarUrl} />
                  <AvatarFallback>
                    {message.senderId.profile?.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              )}

              <div
                className={`rounded-md px-3 py-2 max-w-md border shadow-sm ${
                  isMe ? "bg-[#E5F1FF]" : "bg-white"
                }`}
              >
                {/* nội dung message */}
                <div className="space-y-1 wrap-break-word">
                  {message.content?.text && <p>{message.content.text}</p>}

                  {message.content?.icon && (
                    <p className="text-2xl">{message.content.icon}</p>
                  )}

                  {message.content?.file && (
                    <a
                      href={message.content.file.fileKey}
                      target="_blank"
                      className="text-blue-500 underline text-sm"
                    >
                      📎 Tải file
                    </a>
                  )}
                </div>

                {/* timestamp */}
                <div className="text-[13px] text-gray-700 mt-1">
                  {formatTime(message.createdAt)}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MessageList;
