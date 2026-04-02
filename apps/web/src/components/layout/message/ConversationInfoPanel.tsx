import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Bell,
  BellOff,
  UserPlus,
  Pin,
  PinOff,
  Image as ImageIcon,
  FileText,
  Link as LinkIcon,
  Users,
  Link2,
  LogOut,
  Trash2,
  ChevronDown,
  ChevronRight,
  X,
  Download,
} from "lucide-react";
import { messageService } from "@/services/message.service";
import type { ConversationItemType } from "@/types/conversation-item.type";
import { getFileIcon } from "@/utils/file-icon.util";
import { getDateLabel } from "@/utils/format-message-time..util";

interface ConversationInfoPanelProps {
  isOpen: boolean;
  conversation: ConversationItemType;
  currentUser: { _id: string };
}

const ConversationInfoPanel = ({
  isOpen,
  conversation,
  currentUser,
}: ConversationInfoPanelProps) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [medias, setMedias] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState({
    media: true,
    file: false,
    link: false,
  });

  const isGroup = conversation?.type === "GROUP";

  useEffect(() => {
    if (isOpen && conversation?.conversationId) {
      fetchMediaPreview();
    }
  }, [isOpen, conversation?.conversationId]);

  useEffect(() => {
    if (!isOpen || !conversation?.conversationId) return;
  }, [expandedSections, isOpen, conversation?.conversationId]);

  const fetchMediaPreview = async () => {
    try {
      const res = await messageService.getMediasPreview(
        conversation.conversationId,
        currentUser._id,
      );
      if (res.success) {
        setMedias(res.data.images_videos || []);
        setFiles(res.data.files || []);
        setLinks(res.data.links || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const toggleSection = (section: "media" | "file" | "link") => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (!isOpen) return <div className="w-0 overflow-hidden" />;

  return (
    <div className="w-[320px] h-full bg-[#f7f8fa] border-l flex flex-col">
      {/* HEADER */}
      <div className="h-14 bg-white flex items-center justify-between px-4 border-b">
        <h2 className="text-[15px] font-medium text-gray-800">
          Thông tin hội thoại
        </h2>
        <X size={18} className="text-gray-500 cursor-pointer" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* PROFILE */}
        <div className="bg-white flex flex-col items-center py-5">
          <Avatar className="w-16 h-16 mb-2">
            <AvatarImage src={conversation?.avatar} />
            <AvatarFallback>{conversation?.name?.charAt(0)}</AvatarFallback>
          </Avatar>

          <h3 className="text-[15px] font-medium text-gray-900 text-center px-3">
            {conversation?.name}
          </h3>
        </div>

        {/* ACTION */}
        <div className="bg-white py-3 flex items-start px-10">
          {/* BUTTON */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="flex-1 flex flex-col items-center gap-1 cursor-pointer"
          >
            <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
              {isMuted ? (
                <BellOff size={18} className="text-[#0068ff]" />
              ) : (
                <Bell size={18} className="text-gray-600" />
              )}
            </div>

            <span className="text-[11px] text-gray-600 text-center wrap-break-word leading-tight max-w-17.5">
              Tắt thông báo
            </span>
          </button>

          <button
            onClick={() => setIsPinned(!isPinned)}
            className="flex-1 flex flex-col items-center gap-1 cursor-pointer"
          >
            <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
              {isPinned ? (
                <PinOff size={18} className="text-[#0068ff]" />
              ) : (
                <Pin size={18} className="text-gray-600" />
              )}
            </div>

            <span className="text-[11px] text-gray-600 text-center wrap-break-word leading-tight max-w-17.5">
              Ghim hội thoại
            </span>
          </button>

          <button className="flex-1 flex flex-col items-center gap-1 cursor-pointer">
            <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
              {isGroup ? <UserPlus size={18} /> : <Users size={18} />}
            </div>

            <span className="text-[11px] text-gray-600 text-center wrap-break-word leading-tight max-w-17.5">
              {isGroup ? "Thêm thành viên" : "Tạo nhóm"}
            </span>
          </button>
        </div>

        {/* MEDIA */}
        <div className="bg-white mt-2">
          <button
            onClick={() => toggleSection("media")}
            className="h-12 w-full flex items-center justify-between px-4 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <ImageIcon size={18} />
              <span className="text-[14px] font-medium">Ảnh/Video</span>
            </div>
            {expandedSections.media ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>

          {expandedSections.media && (
            <div className="px-4 pb-4">
              {medias.length > 0 ? (
                <div className="grid grid-cols-3 gap-0.5">
                  {medias.slice(0, 6).map((media, idx) => {
                    const file = media?.content?.file;
                    const isVideo = file?.type === "VIDEO";

                    return (
                      <div
                        key={idx}
                        className="aspect-square bg-gray-100 overflow-hidden relative"
                      >
                        {isVideo ? (
                          <>
                            <video
                              src={file?.fileKey}
                              className="w-full h-full object-cover"
                              muted
                            />

                            {/* overlay play icon giống Zalo */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <div className="w-7 h-7 rounded-full bg-black/50 flex items-center justify-center">
                                <div className="ml-1 border-l-8 border-l-white border-y-6 border-y-transparent" />
                              </div>
                            </div>
                          </>
                        ) : (
                          <img
                            src={file?.fileKey}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-2">
                  Chưa có ảnh/video trong cuộc trò chuyện
                </p>
              )}

              <Button className="w-full bg-gray-200 mt-3 text-black cursor-pointer hover:bg-gray-300">
                Xem tất cả
              </Button>
            </div>
          )}
        </div>

        {/* FILE */}
        <div className="bg-white mt-0.5">
          <button
            onClick={() => toggleSection("file")}
            className="h-12 w-full flex items-center justify-between px-4 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <FileText size={18} />
              <span className="text-[14px] font-medium">File</span>
            </div>
            {expandedSections.file ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>

          {expandedSections.file && (
            <div className="px-4 pb-4">
              {files.length > 0 ? (
                <div className="space-y-2">
                  {files.slice(0, 6).map((item, idx) => {
                    const file = item.content?.file;

                    const handleDownload = () => {
                      const a = document.createElement("a");
                      a.href = file.fileKey;
                      a.download = file.fileName;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                    };

                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-2 bg-white hover:bg-gray-50 rounded-lg border transition"
                      >
                        {/* ICON */}
                        <div className="shrink-0">
                          {getFileIcon(file.fileName)}
                        </div>

                        {/* INFO */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate">
                            {file.fileName}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            {getDateLabel(item.createdAt)} •{" "}
                            {(file.fileSize / 1024).toFixed(1)} KB
                          </p>
                        </div>

                        {/* DOWNLOAD */}
                        <button
                          onClick={handleDownload}
                          className="p-1 border rounded-md hover:bg-gray-100 cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-2">
                  Chưa có file trong cuộc trò chuyện
                </p>
              )}

              <Button className="w-full bg-gray-200 mt-3 text-black hover:bg-gray-300">
                Xem tất cả
              </Button>
            </div>
          )}
        </div>

        {/* LINK */}
        <div className="bg-white mt-0.5">
          <button
            onClick={() => toggleSection("link")}
            className="h-12 w-full flex items-center justify-between px-4 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <LinkIcon size={18} />
              <span className="text-[14px] font-medium">Link</span>
            </div>
            {expandedSections.link ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>

          {expandedSections.link && (
            <div className="px-4 pb-4 space-y-2">
              {links.length > 0 ? (
                links.slice(0, 6).map((item, idx) => {
                  const url = item.content?.text;

                  const getDomain = (url: string) => {
                    try {
                      return new URL(url).hostname.replace("www.", "");
                    } catch {
                      return url;
                    }
                  };

                  return (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      className="flex items-center gap-3 p-2 bg-white border rounded-lg hover:bg-gray-50 transition"
                    >
                      {/* ICON */}
                      <div className="w-9 h-9 flex items-center justify-center bg-gray-100 rounded-md shrink-0">
                        <LinkIcon size={18} />
                      </div>

                      {/* CONTENT */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-[#0068ff] truncate">
                          {url}
                        </p>

                        <p className="text-[11px] text-gray-500 truncate">
                          {getDomain(url)}
                        </p>
                      </div>

                      {/* TIME */}
                      <div className="text-[10px] text-gray-400 shrink-0">
                        {getDateLabel(item.createdAt)}
                      </div>
                    </a>
                  );
                })
              ) : (
                <p className="text-xs text-gray-400 text-center py-2">
                  Chưa có link trong cuộc trò chuyện
                </p>
              )}

              <Button className="w-full bg-gray-200 mt-3 text-black hover:bg-gray-300">
                Xem tất cả
              </Button>
            </div>
          )}
        </div>

        {/* GROUP */}
        {isGroup && (
          <div className="bg-white mt-2">
            <button className="h-12 w-full flex items-center px-4 gap-3">
              <Users size={18} />
              <span className="text-[14px]">Thành viên</span>
            </button>

            <button className="h-12 w-full flex items-center px-4 gap-3 border-t">
              <Link2 size={18} />
              <span className="text-[14px]">Link nhóm</span>
            </button>
          </div>
        )}

        {/* DANGER */}
        <div className="bg-white mt-2">
          <button className="h-12 w-full flex items-center px-4 gap-3 text-red-500 cursor-pointer border-t">
            {isGroup ? <LogOut size={18} /> : <Trash2 size={18} />}
            <span className="text-[14px]">
              {isGroup ? "Rời nhóm" : "Xóa lịch sử"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConversationInfoPanel;
