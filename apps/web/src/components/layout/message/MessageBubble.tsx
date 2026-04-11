import { formatTime } from "@/utils/format-message-time..util";
import type { MessagesType } from "@/types/messages.type";
import { Download } from "lucide-react";
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

  const handleDownload = async () => {
    try {
      const response = await fetch(file.fileKey);

      if (!response.ok) {
        throw new Error("Download failed");
      }

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

  if (message.recalled) {
    return (
      <div
        className={`rounded-lg px-3 py-2 max-w-md border shadow-sm text-gray-500 ${isMe ? "bg-[#E5F1FF]" : "bg-white"
          }`}
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
      onClick={() => {
        if (isSelected) toggleSelectMessage(message._id);
      }}
      className={`rounded-lg px-3 py-2 max-w-md border shadow-sm ${isSelected ? "cursor-pointer" : ""}  ${isMe
        ? selectedMessages.includes(message._id)
          ? "bg-[#B4CBE7]"
          : "bg-[#E5F1FF]"
        : selectedMessages.includes(message._id)
          ? "bg-[#B4CBE7]"
          : "bg-white"
        }`}
    >
      <div className="space-y-2 wrap-break-word">
        {content?.text && <p>{renderTextWithLinks(content.text)}</p>}

        {content?.icon && <p className="text-2xl">{content.icon}</p>}

        {file?.type === "IMAGE" && (
          <img
            src={file.fileKey}
            alt="image"
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
          <div className="flex items-center gap-3 p-2">
            <div>{getFileIcon(file.fileName)}</div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.fileName}</p>
              <p className="text-xs text-gray-500">
                {(file.fileSize / 1024).toFixed(1)} KB
              </p>
            </div>

            <button
              onClick={handleDownload}
              className={`p-1 border border-gray-300 rounded-md cursor-pointer  ${isMe ? "bg-white" : ""}`}
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* TIME */}
      {showTime && (
        <div className="text-[12px] text-gray-500 mt-1 text-right">
          {formatTime(message.createdAt)}
        </div>
      )}
    </div>
  );
};
