import { formatDuration, formatTime } from "@/utils/format-message-time..util";
import type { MessagesType } from "@/types/messages.type";
import { Download, Phone, PhoneMissed, Video } from "lucide-react";
import { getFileIcon } from "@/utils/file-icon.util";
import { saveAs } from "file-saver";

interface Props {
  message: MessagesType;
  isMe: boolean;
  showTime: boolean;
  isSelected: boolean;
  selectedMessages: string[];
  toggleSelectMessage: (messageId: string) => void;
}

const renderTextWithLinks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, index) => {
    if (urlRegex.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline hover:text-blue-600"
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

export const MessageBubble = ({
  message,
  isMe,
  showTime,
  isSelected,
  selectedMessages,
  toggleSelectMessage,
}: Props) => {
  const content = message.content;
  const file = content?.file;
  const call = message.call;

  const handleDownload = async () => {
    if (!file?.fileKey) return;
    try {
      const response = await fetch(file.fileKey);
      const blob = await response.blob();
      saveAs(blob, file.fileName);
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  const dispatchMediaLoaded = () => {
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("message-media-loaded"));
    });
  };

  const renderCallContent = () => {
    if (!call) return null;
    const isVideo = call.type === "VIDEO";
    let statusText = "";
    let Icon = isVideo ? Video : Phone;
    let iconColor = isMe ? "text-blue-600" : "text-gray-600";

    switch (call.status) {
      case "ENDED":
      case "ACCEPTED":
        statusText = `Cuộc gọi ${isVideo ? "video" : "thoại"} (${formatDuration(call.duration)})`;
        break;
      case "MISSED":
        statusText = isMe ? "Đối phương đã lỡ" : "Cuộc gọi nhỡ";
        Icon = PhoneMissed;
        iconColor = "text-red-500";
        break;
      case "REJECTED":
        statusText = isMe ? "Cuộc gọi bị từ chối" : "Cuộc gọi nhỡ";
        Icon = PhoneMissed;
        iconColor = "text-red-500";
        break;
      case "BUSY":
        statusText = "Máy bận";
        iconColor = "text-orange-500";
        break;
      default:
        statusText = `Đang thiết lập...`;
    }
    return (
      <div className="flex items-center gap-3 py-1">
        <div className={`p-2 rounded-full bg-white/50 ${iconColor}`}>
          <Icon size={20} />
        </div>
        <div className="flex flex-col">
          <span className="text-[14px] font-medium leading-tight">
            {statusText}
          </span>
          <span className="text-[11px] opacity-70">
            {isMe ? "Cuộc gọi đi" : "Cuộc gọi đến"}
          </span>
        </div>
      </div>
    );
  };

  if (message.recalled) {
    return (
      <div
        className={`rounded-lg px-3 py-2 max-w-md border shadow-sm text-gray-500 ${isMe ? "bg-[#E5F1FF]" : "bg-white"}`}
      >
        <p>Tin nhắn đã được thu hồi</p>
        {showTime && (
          <div className="text-[12px] text-gray-400 mt-1 text-right not-italic">
            {formatTime(message.createdAt)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={() => isSelected && toggleSelectMessage(message._id)}
      className={`rounded-lg px-3 py-2 max-w-md border shadow-sm transition-colors ${
        isSelected ? "cursor-pointer" : ""
      } ${
        isMe
          ? selectedMessages.includes(message._id)
            ? "bg-[#B4CBE7]"
            : "bg-[#E5F1FF]"
          : selectedMessages.includes(message._id)
            ? "bg-[#B4CBE7]"
            : "bg-white"
      }`}
    >
      <div className="space-y-2 wrap-break-word">
        {call ? (
          renderCallContent()
        ) : (
          <>
            {content?.text && (
              <p className="text-[15px]">{renderTextWithLinks(content.text)}</p>
            )}
            {content?.icon && <p className="text-3xl">{content.icon}</p>}
            {file?.type === "IMAGE" && (
              <img
                src={file.fileKey}
                alt="img"
                className="max-w-xs rounded-lg object-cover"
                onLoad={dispatchMediaLoaded}
              />
            )}
            {file?.type === "VIDEO" && (
              <video
                src={file.fileKey}
                controls
                className="max-w-xs rounded-lg"
                onLoadedMetadata={dispatchMediaLoaded}
              />
            )}
            {file?.type === "FILE" && (
              <div className="flex items-center gap-3 p-2 bg-black/5 rounded-md">
                <div>{getFileIcon(file.fileName)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {file.fileName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(file.fileSize / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload();
                  }}
                  className="p-1 border border-gray-300 rounded-md bg-white"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {showTime && (
        <div
          className={`text-[10px] mt-1 text-right ${isMe ? "text-blue-400" : "text-gray-400"}`}
        >
          {formatTime(message.createdAt)}
        </div>
      )}
    </div>
  );
};
