import { formatTime } from "@/utils/format-message-time..util";
import type { MessagesType } from "@/types/messages.type";
import {
  Download,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getFileIcon } from "@/utils/file-icon.util";
import { saveAs } from "file-saver";
import { useEffect, useState } from "react";
import { truncateFileName } from "@/utils/render-file";
import { VoicePlayer } from "./VoicePlayer";
import PollMessage from "./PollMessage";
import CallContent from "./sub-components/CallContent";
import MediaGrid from "./sub-components/MediaGrid";
import DocumentList from "./sub-components/DocumentList";
import { Lock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

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
  const [isExpired, setIsExpired] = useState(() => {
    if (message.expired) return true;
    // Ưu tiên dùng expiredAt (hoặc expiresAt nếu có)
    const exp = message.expiredAt || (message as any).expiresAt;
    if (exp) return new Date(exp).getTime() <= Date.now();
    return false;
  });
  useEffect(() => {
    // Nếu đã hết hạn qua Redux, đồng bộ luôn
    if (message.expired) {
      setIsExpired(true);
      return;
    }

    // Lấy thời gian hết hạn từ cả hai tên trường (phòng trường hợp chưa đồng nhất)
    const exp = message.expiredAt || (message as any).expiresAt;
    if (!exp) return;

    const expireTime = new Date(exp).getTime();
    const remaining = expireTime - Date.now();

    if (remaining <= 0) {
      setIsExpired(true);
    } else {
      const timer = setTimeout(() => setIsExpired(true), remaining + 50);
      return () => clearTimeout(timer);
    }
  }, [message.expired, message.expiredAt, (message as any).expiresAt]);

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

  if (isExpired) {
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
        className={`rounded-lg px-3 py-2 max-w-md border shadow-sm text-gray-500 ${isMe ? "bg-zalo-light" : "bg-white"
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
      className={`rounded-lg px-3 py-2 max-w-md border shadow-sm transition-colors ${isSelected ? "cursor-pointer" : ""
        } ${isMe
          ? selectedMessages.includes(message._id)
            ? "bg-zalo-selected"
            : "bg-zalo-light"
          : selectedMessages.includes(message._id)
            ? "bg-zalo-selected"
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
        {message.call ? (
          <CallContent
            type={message.call.type}
            status={message.call.status}
            duration={message.call.duration}
            isMe={isMe}
          />
        ) : (
          <>
            {/* POLL */}
            {message.type === "POLL" && message.pollId && (
              <PollMessage
                pollId={message.pollId}
                conversationId={message.conversationId}
              />
            )}

            {/* TEXT */}
            {content?.text && (
              <div className="text-[15px] markdown-content">
                {message.senderId?.profile?.name === "Zola AI" || message.type === "AI_SUMMARY" ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                    {content.text}
                  </ReactMarkdown>
                ) : (
                  <p>{renderTextWithLinks(content.text)}</p>
                )}
              </div>
            )}

            {/* PRIVATE / NINJA INDICATOR */}
            {(message.type === "PRIVATE" || message.type === "AI_SUMMARY") && (
              <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400 border-t border-gray-100 pt-1">
                <Lock size={10} />
                <span>Chỉ mình bạn thấy</span>
              </div>
            )}

            {/* ICON */}
            {content?.icon && <p className="text-3xl">{content.icon}</p>}

            {/* MEDIA GRID (Ảnh/Video) */}
            <MediaGrid
              mediaFiles={mediaFiles}
              onPreview={setPreviewIndex}
              onLoad={dispatchMediaLoaded}
            />

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
            <DocumentList
              documentFiles={documentFiles}
              onDownload={handleDownload}
            />
          </>
        )}
      </div>

      {/* TIME */}
      {showTime && (
        <div
          className={`text-[10px] mt-1 text-right ${isMe ? "text-blue-500/80" : "text-gray-400"
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
