import { formatTime } from "@/utils/format-message-time..util";
import type { MessagesType } from "@/types/messages.type";
import { Download } from "lucide-react";

interface Props {
  message: MessagesType;
  isMe: boolean;
  showTime: boolean;
}

const getFileIcon = (fileName: string) => {
  if (fileName.endsWith(".pdf"))
    return (
      <img
        src="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/pdf/default.svg"
        alt="PDF"
        width="24"
        height="24"
      />
    );
  if (fileName.endsWith(".doc") || fileName.endsWith(".docx"))
    return (
      <img
        src="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/microsoft-word/default.svg"
        alt="word"
        className="w-6 h-6"
      />
    );

  if (fileName.endsWith(".xls") || fileName.endsWith(".xlsx"))
    return (
      <img
        src="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/microsoft-excel/default.svg"
        alt="excel"
        className="w-6 h-6"
      />
    );
  return (
    <img
      src="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/files/default.svg"
      alt="Files"
      width="24"
      height="24"
    />
  );
};

export const MessageBubble = ({ message, isMe, showTime }: Props) => {
  const content = message.content;
  const file = content?.file;

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = file.fileKey;
    a.target = "_blank";
    a.download = file.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (message.recalled) {
    return (
      <div
        className={`rounded-lg px-3 py-2 max-w-md border shadow-sm text-gray-500 ${
          isMe ? "bg-[#E5F1FF]" : "bg-white"
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
      className={`rounded-lg px-3 py-2 max-w-md border shadow-sm ${
        isMe ? "bg-[#E5F1FF]" : "bg-white"
      }`}
    >
      <div className="space-y-2 wrap-break-word">
        {content?.text && <p>{content.text}</p>}

        {content?.icon && <p className="text-2xl">{content.icon}</p>}

        {file?.type === "IMAGE" && (
          <img
            src={file.fileKey}
            alt="image"
            className="max-w-xs rounded-lg object-cover"
            onLoad={() =>
              window.dispatchEvent(new Event("message-media-loaded"))
            }
          />
        )}

        {file?.type === "VIDEO" && (
          <video
            src={file.fileKey}
            controls
            className="max-w-xs rounded-lg"
            onLoadedMetadata={() =>
              window.dispatchEvent(new Event("message-media-loaded"))
            }
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
