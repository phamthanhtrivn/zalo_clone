import { formatTime } from "@/utils/format-message-time..util";
import type { MessagesType } from "@/types/messages.type";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { getFileIcon } from "@/utils/file-icon.util";
import { saveAs } from "file-saver";
import { useState } from "react";
import { truncateFileName } from "@/utils/render-file";

interface Props {
  message: MessagesType;
  isMe: boolean;
  showTime: boolean;
  isSelected: boolean;
  selectedMessages: string[];
  toggleSelectMessage: (messageId: string) => void;
  onJumpToMessage?: (messageId: string) => void;
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
  onJumpToMessage,
}: Props) => {
  const content = message.content;
  const files = content?.files || [];

  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const dispatchMediaLoaded = () => {
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("message-media-loaded"));
    });
  };

  const handleDownload = async (file: any) => {
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



  if (message.expired) {
    return (
      <div className="flex items-center gap-1.5 bg-[#f0f0f0] rounded-xl px-3 py-2 max-w-xs">
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="shrink-0"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span className="text-[13px] text-gray-400 italic">
          Tin nhắn đã hết hạn
        </span>
      </div>
    );
  }
  if (message.recalled) {
    return (
      <div
        className={`rounded-lg px-3 py-2 max-w-md border shadow-sm text-gray-500 ${isMe ? "bg-[#E5F1FF]" : "bg-white"
          }`}
      >
        <p>Tin nhắn đã được thu hồi</p>

        {showTime && (
          <div className="text-[12px] text-gray-400 mt-1 text-right">
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
      className={`rounded-lg px-3 py-2 max-w-md border shadow-sm ${isSelected ? "cursor-pointer" : ""
        } ${isMe
          ? selectedMessages.includes(message._id)
            ? "bg-[#B4CBE7]"
            : "bg-[#E5F1FF]"
          : selectedMessages.includes(message._id)
            ? "bg-[#B4CBE7]"
            : "bg-white"
        }`}
    >
      <div className="space-y-2 wrap-break-word">
        {/* REPLY */}
        {message.repliedId && (
          <div
            className="mb-2 p-2 rounded border-l-4 border-blue-400 bg-black/5 cursor-pointer hover:bg-black/10"
            onClick={(e) => {
              e.stopPropagation();
              if (onJumpToMessage && message.repliedId?._id) {
                onJumpToMessage(message.repliedId._id);
              }
            }}
          >
            <div className="text-[11px] font-bold text-blue-600 truncate">
              {message.repliedId.senderId?.profile?.name || "Người dùng"}
            </div>

            <div className="text-[12px] text-gray-600 truncate">
              {message.repliedId.content?.text ||
                (message.repliedId.content?.files?.length > 0
                  ? message.repliedId.content.files[0].fileName
                  : "")}
            </div>
          </div>
        )}

        {/* TEXT */}
        {content?.text && <p>{renderTextWithLinks(content.text)}</p>}

        {/* ICON */}
        {content?.icon && <p className="text-2xl">{content.icon}</p>}

        {files.length > 0 && (
          <div
            className={`
                grid gap-1
                ${files.length === 1 ? "grid-cols-1" : ""}
                ${files.length === 2 ? "grid-cols-2" : ""}
                ${files.length >= 3 ? "grid-cols-3" : ""}
              `}
          >
            {files.map((file, index) => {

              return (
                <div
                  key={index}
                  className="relative overflow-hidden rounded-xl border bg-black group cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewIndex(index);
                  }}
                >
                  {file.type === "IMAGE" && (
                    <img
                      src={file.fileKey}
                      className="w-full h-32 object-cover group-hover:scale-105 transition"
                      onLoad={dispatchMediaLoaded}
                    />
                  )}

                  {file.type === "VIDEO" && (
                    <video
                      src={file.fileKey}
                      className="w-full h-32 object-cover"
                      onLoadedMetadata={dispatchMediaLoaded}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {files?.length === 1 && (
          <div className="flex items-center gap-3 p-2">
            <div>{getFileIcon(files[0].fileName)}</div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{truncateFileName(files[0].fileName, 40)}</p>
              <p className="text-xs text-gray-500">
                {(files[0].fileSize / 1024).toFixed(1)} KB
              </p>
            </div>

            <button
              onClick={() => handleDownload(files[0])}
              className={`p-1 border border-gray-300 rounded-md cursor-pointer  ${isMe ? "bg-white" : ""}`}
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TIME */}
        {showTime && (
          <div className="text-[12px] text-gray-500 mt-1 text-right">
            {formatTime(message.createdAt)}
          </div>
        )}

        {previewIndex !== null && (
          <div className="fixed inset-0 z-100 bg-black/90 flex items-center justify-center">
            {/* CLOSE */}
            <button
              className="absolute top-4 right-4 text-white cursor-pointer"
              onClick={() => setPreviewIndex(null)}
            >
              <X size={28} />
            </button>

            {/* PREV */}
            {previewIndex > 0 && (
              <button
                className="absolute left-4 text-white cursor-pointer"
                onClick={() => setPreviewIndex(previewIndex - 1)}
              >
                <ChevronLeft size={32} />
              </button>
            )}

            {/* NEXT */}
            {previewIndex < files.length - 1 && (
              <button
                className="absolute right-4 text-white cursor-pointer"
                onClick={() => setPreviewIndex(previewIndex + 1)}
              >
                <ChevronRight size={32} />
              </button>
            )}

            {/* CONTENT */}
            <div className="max-w-4xl w-full flex justify-center">
              {files[previewIndex].type === "IMAGE" ? (
                <img
                  src={files[previewIndex].fileKey}
                  className="max-h-[80vh] object-contain"
                />
              ) : (
                <video
                  src={files[previewIndex].fileKey}
                  controls
                  className="max-h-[80vh]"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
