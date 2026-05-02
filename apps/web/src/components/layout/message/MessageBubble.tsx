import { formatDuration, formatTime } from "@/utils/format-message-time..util";
import type { MessagesType } from "@/types/messages.type";
import {
  Download,
  Phone,
  PhoneMissed,
  Video,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { getFileIcon } from "@/utils/file-icon.util";
import { saveAs } from "file-saver";
import { useState } from "react";
import { truncateFileName } from "@/utils/render-file";
import { VoicePlayer } from "./VoicePlayer";

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
  const call = message.call;

  // Hỗ trợ cả 2 chuẩn: array files (mới) và single file (cũ)
  const files = content?.files || [];
  const repliedMessage =
    message.repliedId && typeof message.repliedId === "object"
      ? (message.repliedId as any)
      : null;

  // Tách riêng Media (Ảnh/Video) để hiển thị Grid và Document để hiển thị List
  const mediaFiles = files.filter(
    (f: any) => f.type === "IMAGE" || f.type === "VIDEO",
  );
  const voiceFiles = files.filter((f: any) => f.type === "VOICE");
  const documentFiles = files.filter(
    (f: any) =>
      f.type === "FILE" ||
      !["IMAGE", "VIDEO", "VOICE"].includes(f.type),
  );

  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const dispatchMediaLoaded = () => {
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("message-media-loaded"));
    });
  };

  const handleDownload = async (file: any) => {
    try {
      const response = await fetch(file.fileKey);
      const blob = await response.blob();
      saveAs(blob, file.fileName);
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  // --- Logic Call từ nhánh HEAD ---
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

  // --- Logic Hết hạn từ nhánh KhongVanTam ---
  if (message.expired) {
    return (
      <div className="flex items-center gap-1.5 bg-[#f0f0f0] rounded-xl px-3 py-2 max-w-xs">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#999"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
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
        className={`rounded-lg px-3 py-2 max-w-md border shadow-sm text-gray-500 ${
          isMe ? "bg-[#E5F1FF]" : "bg-white"
        }`}
      >
        <p>Tin nhắn đã được thu hồi</p>
        {showTime && (
          <div className="text-[10px] mt-1 text-right text-gray-400">
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
        {/* REPLY BLOCK */}
        {message.repliedId && (
          <div
            className="mb-2 p-2 rounded border-l-4 border-blue-400 bg-black/5 cursor-pointer hover:bg-black/10 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              if (onJumpToMessage) {
                const repliedId =
                  typeof message.repliedId === "string"
                    ? message.repliedId
                    : repliedMessage?._id;
                if (repliedId) {
                  onJumpToMessage(repliedId);
                }
              }
            }}
          >
            <div className="text-[11px] font-bold text-blue-600 truncate">
              {repliedMessage?.senderId?.profile?.name || "Người dùng"}
            </div>
            <div className="text-[12px] text-gray-600 truncate">
              {repliedMessage?.content?.text ||
                (repliedMessage?.content?.files?.length > 0
                  ? repliedMessage.content.files[0].fileName
                  : "Đính kèm")}
            </div>
          </div>
        )}

        {/* MAIN CONTENT */}
        {call ? (
          renderCallContent()
        ) : (
          <>
            {/* TEXT */}
            {content?.text && (
              <p className="text-[15px]">{renderTextWithLinks(content.text)}</p>
            )}

            {/* ICON */}
            {content?.icon && <p className="text-3xl">{content.icon}</p>}

            {/* MEDIA GRID (Ảnh/Video) */}
            {mediaFiles.length > 0 && (
              <div
                className={`grid gap-1 ${
                  mediaFiles.length === 1
                    ? "grid-cols-1"
                    : mediaFiles.length === 2
                      ? "grid-cols-2"
                      : "grid-cols-3"
                }`}
              >
                {mediaFiles.map((file: any, index: number) => (
                  <div
                    key={index}
                    className="relative overflow-hidden rounded-xl border bg-black group cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewIndex(index); // Mở Modal tại vị trí ảnh tương ứng
                    }}
                  >
                    {file.type === "IMAGE" && (
                      <img
                        src={file.fileKey}
                        className="w-full h-32 object-cover group-hover:scale-105 transition"
                        onLoad={dispatchMediaLoaded}
                        alt="attachment"
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
                ))}
              </div>
            )}

            {/* VOICE (Audio) */}
            {voiceFiles.length > 0 && (
              <div className="space-y-2 mt-2">
                {voiceFiles.map((file: any, index: number) => (
                  <VoicePlayer
                    key={index}
                    fileUrl={file.fileKey}
                    durationMs={content?.voiceDuration || 0}
                    onDownload={() => handleDownload(file)}
                  />
                ))}
              </div>
            )}

            {/* DOCUMENT LIST (File Text/PDF/Zip...) */}
            {documentFiles.length > 0 && (
              <div className="space-y-1 mt-1">
                {documentFiles.map((file: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 bg-black/5 rounded-md"
                  >
                    <div>{getFileIcon(file.fileName)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {truncateFileName(file.fileName, 40)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(file.fileSize / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(file);
                      }}
                      className="p-1 border border-gray-300 rounded-md bg-white hover:bg-gray-50"
                    >
                      <Download className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* TIME */}
      {showTime && (
        <div
          className={`text-[10px] mt-1 text-right ${
            isMe ? "text-blue-500/80" : "text-gray-400"
          }`}
        >
          {formatTime(message.createdAt)}
        </div>
      )}

      {/* IMAGE / VIDEO PREVIEW MODAL */}
      {previewIndex !== null && mediaFiles[previewIndex] && (
        <div
          className="fixed inset-0 z-100 bg-black/90 flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* CLOSE */}
          <button
            className="absolute top-4 right-4 text-white cursor-pointer hover:text-gray-300"
            onClick={() => setPreviewIndex(null)}
          >
            <X size={28} />
          </button>

          <button
            className="absolute top-4 left-4 text-white cursor-pointer hover:text-gray-300"
            onClick={() => handleDownload(mediaFiles[previewIndex])}
          >
            <Download size={28} />
          </button>

          {/* PREV */}
          {previewIndex > 0 && (
            <button
              className="absolute left-4 text-white cursor-pointer p-2 bg-black/50 rounded-full hover:bg-black/70"
              onClick={() => setPreviewIndex(previewIndex - 1)}
            >
              <ChevronLeft size={32} />
            </button>
          )}

          {/* NEXT */}
          {previewIndex < mediaFiles.length - 1 && (
            <button
              className="absolute right-4 text-white cursor-pointer p-2 bg-black/50 rounded-full hover:bg-black/70"
              onClick={() => setPreviewIndex(previewIndex + 1)}
            >
              <ChevronRight size={32} />
            </button>
          )}

          {/* CONTENT */}
          <div className="max-w-4xl w-full flex justify-center">
            {mediaFiles[previewIndex].type === "IMAGE" ? (
              <img
                src={mediaFiles[previewIndex].fileKey}
                className="max-h-[85vh] object-contain rounded"
                alt="preview"
              />
            ) : (
              <video
                src={mediaFiles[previewIndex].fileKey}
                controls
                autoPlay
                className="max-h-[85vh] rounded"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
